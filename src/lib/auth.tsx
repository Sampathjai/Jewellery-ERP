import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole, PermissionCode } from '@/types';
import { getLocalDb, supabase } from './supabase';
import { syncEngine } from './syncEngine';
import { dataService } from './dataService';
import { hasPermission } from './utils';
import { rateLimiter } from './rateLimiter';
import { InactivityWarningModal } from '@/components/common/InactivityWarningModal';
import { hasRegisteredLocalDevice } from './biometricAuth';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string; userProfile?: UserProfile }>;
  loginWithProfile: (profile: UserProfile) => void;
  logout: (reason?: string) => void;
  switchRole: (newRole: UserRole) => void;
  can: (permission: PermissionCode) => boolean;
  isLoading: boolean;
  autoLogoutEnabled: boolean;
  inactivityTimeoutMinutes: number;
  maxConcurrentSessions: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LAST_ACTIVITY_KEY = 'sampath_last_activity_time';

const recordActivity = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }
};

const isSessionExpired = (timeoutMinutes: number): boolean => {
  if (typeof localStorage === 'undefined') return false;
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!stored) return false;
  const lastTime = Number(stored);
  if (isNaN(lastTime) || lastTime <= 0) return false;
  const elapsedMinutes = (Date.now() - lastTime) / (60 * 1000);
  return elapsedMinutes >= timeoutMinutes;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem('sampath_auth_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [role, setRole] = useState<UserRole>(user?.role || 'admin');
  const [isLoading, setIsLoading] = useState(true);

  // Reactive settings state dynamically synced with Supabase business_settings
  const [settings, setSettings] = useState(() => getLocalDb().settings);

  const autoLogoutEnabled = settings.inactivity_logout_enabled ?? true;
  const inactivityTimeoutMinutes = settings.inactivity_timeout_minutes ?? 15;
  const maxConcurrentSessions = settings.max_concurrent_sessions ?? 3;

  useEffect(() => {
    // Fetch live settings on mount
    dataService.getBusinessSettings().then((s) => {
      if (s) setSettings(s);
    }).catch((e) => console.warn('Could not load business settings in AuthProvider:', e));

    const unsubscribe = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'business_settings') {
        dataService.getBusinessSettings().then((s) => {
          if (s) setSettings(s);
        }).catch(() => {});
      }
    });
    return () => unsubscribe();
  }, []);

  const syncUserProfileFromAuth = async (sessionUser: any): Promise<UserProfile | null> => {
    if (!sessionUser || !sessionUser.email) return null;
    const emailNorm = sessionUser.email.trim().toLowerCase();
    const userId = sessionUser.id;

    try {
      if (supabase) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .or(`id.eq.${userId},user_id.eq.${userId},email.eq.${emailNorm}`)
          .maybeSingle();

        // 1. Authoritative check: If account does not exist or was deleted, reject
        if (!profile || profile.deleted_at || profile.status === 'deleted') {
          console.warn(`[AUTH SECURITY] User ${emailNorm} profile not found or marked deleted in database.`);
          return null;
        }

        // 2. Status check: If account is inactive / disabled, reject
        if (profile.is_active === false || profile.status === 'disabled') {
          console.warn(`[AUTH SECURITY] User ${emailNorm} profile is deactivated/disabled in database.`);
          return null;
        }

        // If profile user_id doesn't match authenticated session UUID, update profile to link to real Auth user ID
        if (profile.user_id !== userId || profile.id !== userId) {
          supabase
            .from('profiles')
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .or(`id.eq.${profile.id},email.eq.${emailNorm}`)
            .then(() => {})
            .then(null, (e: any) => console.warn('Could not auto-link profile user_id:', e));
        }

        const userObj: UserProfile = {
          id: profile.id,
          user_id: userId,
          full_name: profile.full_name || sessionUser.user_metadata?.full_name || emailNorm.split('@')[0],
          email: profile.email || emailNorm,
          phone: profile.phone || '',
          role: (profile.role || 'billing_staff') as UserRole,
          branch: profile.branch || 'Trichy - Sandhukadai',
          avatar_url: profile.avatar_url,
          is_active: true,
          last_login_at: new Date().toISOString(),
        };
        return userObj;
      }
    } catch (e) {
      console.warn('Error fetching user profile from database:', e);
      return null;
    }

    // Never auto-provision or resurrect an account if no profile exists in database
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    const resolveInitialSession = async () => {
      try {
        const localDbSettings = getLocalDb().settings;
        const isAutoLogout = localDbSettings?.inactivity_logout_enabled ?? true;
        const timeoutMins = localDbSettings?.inactivity_timeout_minutes ?? 15;

        // Check if session has expired due to inactivity across page reloads / tab closures
        if (user && isAutoLogout && isSessionExpired(timeoutMins)) {
          console.warn('Session expired due to inactivity timeout upon initial app load.');
          if (supabase) {
            supabase.auth.signOut().catch(() => {});
          }
          dataService.logAuditAction('session_expired', 'auth', user.id, {
            email: user.email,
            reason: 'inactivity_timeout',
          }).catch(() => {});
          localStorage.removeItem('sampath_auth_user');
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          if (isMounted) {
            setUser(null);
          }
          return;
        }

        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const session = data?.session;
          if (isMounted) {
            if (session?.user) {
              const profile = await syncUserProfileFromAuth(session.user);
              if (profile && profile.is_active !== false) {
                setUser(profile);
                setRole(profile.role);
                localStorage.setItem('sampath_auth_user', JSON.stringify(profile));
                recordActivity();
              } else {
                // Profile deleted or inactive: Terminate backend Supabase session immediately
                console.warn('[AUTH SECURITY] Active session revoked: Account is deleted or inactive in database.');
                supabase.auth.signOut().catch(() => {});
                setUser(null);
                localStorage.removeItem('sampath_auth_user');
                localStorage.removeItem(LAST_ACTIVITY_KEY);
              }
            } else {
              // If there is no active GoTrue session, check if there is an active local user session
              const storedUser = localStorage.getItem('sampath_auth_user');
              if (storedUser) {
                try {
                  const parsedUser = JSON.parse(storedUser);
                  // Verify that the user still exists and is active
                  const profile = await dataService.getUserProfileById(parsedUser.id);
                  if (profile && profile.is_active !== false && !profile.deleted_at && profile.status !== 'disabled') {
                    setUser(profile);
                    setRole(profile.role);
                    recordActivity();
                  } else {
                    setUser(null);
                    localStorage.removeItem('sampath_auth_user');
                    localStorage.removeItem(LAST_ACTIVITY_KEY);
                  }
                } catch {
                  setUser(null);
                  localStorage.removeItem('sampath_auth_user');
                  localStorage.removeItem(LAST_ACTIVITY_KEY);
                }
              } else {
                setUser(null);
                localStorage.removeItem('sampath_auth_user');
                localStorage.removeItem(LAST_ACTIVITY_KEY);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Initial session resolution error:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    resolveInitialSession();

    let authSubscription: any = null;
    if (supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          // If a trusted device unlock is active locally, don't prematurely wipe the user state
          const storedUser = localStorage.getItem('sampath_auth_user');
          if (!storedUser) {
            setUser(null);
            localStorage.removeItem('sampath_auth_user');
            localStorage.removeItem(LAST_ACTIVITY_KEY);
          }
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          const profile = await syncUserProfileFromAuth(session.user);
          if (profile && profile.is_active !== false) {
            setUser(profile);
            setRole(profile.role);
            localStorage.setItem('sampath_auth_user', JSON.stringify(profile));
            recordActivity();
          } else {
            // Profile deleted or inactive: Terminate session immediately
            console.warn('[AUTH SECURITY] Auth state change rejected: Account is deleted or inactive.');
            supabase?.auth.signOut().catch(() => {});
            setUser(null);
            localStorage.removeItem('sampath_auth_user');
            localStorage.removeItem(LAST_ACTIVITY_KEY);
          }
        }
      });
      authSubscription = sub?.subscription;
    }

    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  const logout = useCallback((reason?: string) => {
    if (user) {
      dataService.logAuditAction('user_logout', 'auth', user.id, { email: user.email, reason: reason || 'user_action' }).catch(() => {});
    }
    if (supabase) {
      try {
        const hasDevice = hasRegisteredLocalDevice();
        // If a device biometric credential is registered, use 'local' scope so that local tokens are purged
        // while preserving the server refresh token encrypted in the local PIN/biometric vault
        supabase.auth.signOut({ scope: hasDevice ? 'local' : 'global' }).catch((e) => console.warn('Supabase signout error:', e));
      } catch (e) {
        console.warn('Supabase signout exception:', e);
      }
    }
    setUser(null);
    setRole('admin');
    localStorage.removeItem('sampath_auth_user');
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    try {
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    if (reason === 'inactive') {
      window.location.href = '/login?reason=inactive';
    } else {
      window.location.href = '/login';
    }
  }, [user]);

  // Multi-tab logout synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sampath_auth_user' && !e.newValue) {
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Real-time synchronization: If current user's profile is deleted or disabled in database, log out immediately
    const unsubscribeProfileChanges = syncEngine.subscribeDataChange((tableName, eventType, payload) => {
      if (tableName === 'profiles' && user) {
        if (eventType === 'DELETE') {
          const deletedId = payload?.id || payload?.user_id;
          if (deletedId && (deletedId === user.id || deletedId === user.user_id)) {
            console.warn('[AUTH SECURITY] Current user account was deleted from database. Terminating session.');
            logout('account_deleted');
          }
        } else if (eventType === 'UPDATE' && payload) {
          const targetId = payload?.id || payload?.user_id;
          if (targetId && (targetId === user.id || targetId === user.user_id)) {
            if (payload.is_active === false || payload.status === 'disabled' || payload.deleted_at) {
              console.warn('[AUTH SECURITY] Current user account was deactivated. Terminating session.');
              logout('account_disabled');
            }
          }
        }
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubscribeProfileChanges();
    };
  }, [user, logout]);

  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(60);

  // Centralized Force Logout All Staff Sessions Listener
  useEffect(() => {
    if (!user || role === 'admin' || (role as string) === 'super_admin') return;

    if (settings.force_logout_all_at) {
      const forceTime = new Date(settings.force_logout_all_at).getTime();
      const userLoginTime = user.last_login_at ? new Date(user.last_login_at).getTime() : 0;
      if (forceTime > userLoginTime) {
        logout('forced');
      }
    }
  }, [user, role, settings.force_logout_all_at, logout]);

  // Centralized Inactivity Auto Logout Tracker with Warning Modal (Desktop & Mobile Unified)
  useEffect(() => {
    if (!user || !autoLogoutEnabled) return;

    const timeoutMs = (inactivityTimeoutMinutes || 15) * 60 * 1000;
    const warningMs = Math.max(0, timeoutMs - 60000); // Trigger warning 60s before timeout
    let lastThrottledWrite = 0;

    const checkAndRecordActivity = () => {
      const now = Date.now();
      const storedLast = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || now);
      const elapsed = now - storedLast;

      // If session is already expired, trigger logout immediately without updating timestamp
      if (storedLast > 0 && elapsed >= timeoutMs) {
        logout('inactive');
        return;
      }

      // Throttle rapid mousemove/scroll event writes to once per second
      if (now - lastThrottledWrite >= 1000) {
        lastThrottledWrite = now;
        recordActivity();
      }

      if (showInactivityWarning) {
        setShowInactivityWarning(false);
      }
    };

    const events = [
      'mousemove',
      'mousedown',
      'mouseup',
      'keydown',
      'scroll',
      'wheel',
      'pointerdown',
      'pointermove',
      'pointerup',
      'click',
      'touchstart',
      'touchmove',
      'touchend',
      'focus',
    ];

    events.forEach((evt) => window.addEventListener(evt, checkAndRecordActivity, { passive: true }));
    document.addEventListener('visibilitychange', checkAndRecordActivity);

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const storedLast = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || now);
      const elapsed = now - storedLast;

      if (elapsed >= timeoutMs) {
        clearInterval(checkInterval);
        logout('inactive');
      } else if (warningMs > 0 && elapsed >= warningMs) {
        setShowInactivityWarning(true);
        const remainingSec = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        setWarningCountdown(remainingSec);
      } else {
        if (showInactivityWarning) {
          setShowInactivityWarning(false);
        }
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, checkAndRecordActivity));
      document.removeEventListener('visibilitychange', checkAndRecordActivity);
      clearInterval(checkInterval);
    };
  }, [user, autoLogoutEnabled, inactivityTimeoutMinutes, logout, showInactivityWarning]);

  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string; userProfile?: UserProfile }> => {
    setIsLoading(true);

    const rawInput = (email || '').trim().toLowerCase();
    const normalizedEmail = rawInput.includes('@') ? rawInput : `${rawInput}@shankarjewellery.com`;
    const pwd = (password || '').trim();

    if (!normalizedEmail || !pwd) {
      setIsLoading(false);
      return { success: false, message: 'Please enter both email address / username and password.' };
    }

    // 1. Brute-Force Rate Limiting Check
    const rateCheck = rateLimiter.isRateLimited(normalizedEmail);
    if (rateCheck.limited) {
      setIsLoading(false);
      return {
        success: false,
        message: `Too many failed login attempts. Please wait ${rateCheck.remainingSeconds} seconds before trying again.`,
      };
    }

    if (!supabase) {
      setIsLoading(false);
      return { success: false, message: 'Authentication service is unavailable. Please try again later.' };
    }

    try {
      // 2. Authoritative Backend Authentication via Supabase Auth (bcrypt verification)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: pwd,
      });

      // Strict check: Must have valid auth session from backend
      if (!authError && authData?.user && authData?.session) {
        const userProfile = await syncUserProfileFromAuth(authData.user);
        if (!userProfile || userProfile.is_active === false) {
          // Immediately terminate the GoTrue session if profile is deleted or disabled
          await supabase.auth.signOut().catch(() => {});
          localStorage.removeItem('sampath_auth_user');
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          setUser(null);
          setIsLoading(false);
          rateLimiter.recordFailure(normalizedEmail);
          dataService.logAuditAction('user_login_rejected_inactive_or_deleted', 'auth', undefined, {
            email: normalizedEmail,
            reason: 'account_inactive_or_deleted',
          }).catch(() => {});
          return { success: false, message: 'Invalid email or password.' };
        }

        // Authentication verified by backend — reset rate limiting counter
        rateLimiter.reset(normalizedEmail);

        setUser(userProfile);
        setRole(userProfile.role);
        localStorage.setItem('sampath_auth_user', JSON.stringify(userProfile));
        recordActivity();

        dataService.logAuditAction('user_login_success', 'auth', userProfile.id, {
          email: normalizedEmail,
          method: 'supabase_auth_password',
        }).catch(() => {});

        setIsLoading(false);
        return { success: true, userProfile };
      }

      // 3. Authentication Failed: Record failure for rate limiting and log security event
      const failState = rateLimiter.recordFailure(normalizedEmail);

      // Clean up any stale client state
      setUser(null);
      localStorage.removeItem('sampath_auth_user');

      dataService.logAuditAction('user_login_failure', 'auth', undefined, {
        email: normalizedEmail,
        reason: 'invalid_credentials',
      }).catch(() => {});

      setIsLoading(false);

      if (failState.limited) {
        return {
          success: false,
          message: `Too many failed login attempts. Account access temporarily throttled for ${failState.remainingSeconds} seconds.`,
        };
      }

      // Return generic error message to prevent account enumeration
      return { success: false, message: 'Invalid email or password.' };
    } catch (err: any) {
      console.error('Login authentication error:', err);
      setIsLoading(false);
      return { success: false, message: 'Invalid email or password.' };
    }
  };

  const loginWithProfile = (profile: UserProfile) => {
    setUser(profile);
    setRole(profile.role);
    localStorage.setItem('sampath_auth_user', JSON.stringify(profile));
    recordActivity();
  };

  const switchRole = (newRole: UserRole) => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      setRole(newRole);
    }
  };

  const can = (permission: PermissionCode): boolean => {
    return hasPermission(role, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        login,
        loginWithProfile,
        logout,
        switchRole,
        can,
        isLoading,
        autoLogoutEnabled,
        inactivityTimeoutMinutes,
        maxConcurrentSessions,
      }}
    >
      {children}
      {showInactivityWarning && (
        <InactivityWarningModal
          isOpen={showInactivityWarning}
          remainingSeconds={warningCountdown}
          onStayLoggedIn={() => {
            setShowInactivityWarning(false);
          }}
          onLogoutNow={() => logout()}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
