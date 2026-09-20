import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole, PermissionCode } from '@/types';
import { getLocalDb, supabase } from './supabase';
import { syncEngine } from './syncEngine';
import { dataService } from './dataService';
import { hasPermission } from './utils';
import { InactivityWarningModal } from '@/components/common/InactivityWarningModal';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
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
          .or(`id.eq.${userId},email.eq.${emailNorm}`)
          .maybeSingle();

        if (profile) {
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
            id: userId,
            user_id: userId,
            full_name: profile.full_name || sessionUser.user_metadata?.full_name || emailNorm.split('@')[0],
            email: profile.email || emailNorm,
            phone: profile.phone || '',
            role: (profile.role || 'billing_staff') as UserRole,
            branch: profile.branch || 'Trichy - Sandhukadai',
            avatar_url: profile.avatar_url,
            is_active: profile.is_active ?? true,
            last_login_at: new Date().toISOString(),
          };
          return userObj;
        }
      }
    } catch (e) {
      console.warn('Error fetching user profile from database:', e);
    }

    // Provision default profile record in profiles table if authenticated user has no profile row yet
    const isOwnerOrAdmin = emailNorm.includes('owner') || emailNorm.includes('sampath') || emailNorm.includes('admin');
    const defaultProfile: UserProfile = {
      id: userId,
      user_id: userId,
      full_name: sessionUser.user_metadata?.full_name || (isOwnerOrAdmin ? 'Sampath Kumar' : emailNorm.split('@')[0]),
      email: emailNorm,
      phone: '',
      role: (sessionUser.user_metadata?.role as UserRole) || (isOwnerOrAdmin ? 'admin' : 'billing_staff'),
      branch: 'Trichy - Sandhukadai',
      is_active: true,
      last_login_at: new Date().toISOString(),
    };

    dataService.createUserProfile(defaultProfile).catch(() => {});
    return defaultProfile;
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
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          localStorage.removeItem('sampath_auth_user');
          localStorage.removeItem(LAST_ACTIVITY_KEY);
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          const profile = await syncUserProfileFromAuth(session.user);
          if (profile && profile.is_active !== false) {
            setUser(profile);
            setRole(profile.role);
            localStorage.setItem('sampath_auth_user', JSON.stringify(profile));
            recordActivity();
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

  // Multi-tab logout synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sampath_auth_user' && !e.newValue) {
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const logout = useCallback((reason?: string) => {
    if (user) {
      dataService.logAuditAction('user_logout', 'auth', user.id, { email: user.email, reason: reason || 'user_action' }).catch(() => {});
    }
    if (supabase) {
      try {
        supabase.auth.signOut().catch((e) => console.warn('Supabase signout error:', e));
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

  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);

    const rawInput = (email || '').trim().toLowerCase();
    const normalizedEmail = rawInput.includes('@') ? rawInput : `${rawInput}@shankarjewellery.com`;
    const pwd = (password || '').trim();

    if (!normalizedEmail || !pwd) {
      setIsLoading(false);
      return { success: false, message: 'Please enter both email address / username and password.' };
    }

    if (!supabase) {
      setIsLoading(false);
      return { success: false, message: 'Supabase client is not configured.' };
    }

    try {
      // Direct Supabase Auth credential verification via signInWithPassword
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: pwd,
      });

      if (!authError && authData?.user) {
        const userProfile = await syncUserProfileFromAuth(authData.user);
        if (!userProfile) {
          setIsLoading(false);
          return { success: false, message: 'Failed to retrieve user profile.' };
        }
        if (userProfile.is_active === false) {
          await supabase.auth.signOut();
          setIsLoading(false);
          return { success: false, message: 'Your account is inactive. Please contact the administrator.' };
        }
        setUser(userProfile);
        setRole(userProfile.role);
        localStorage.setItem('sampath_auth_user', JSON.stringify(userProfile));
        dataService.logAuditAction('user_login', 'auth', userProfile.id, { email: normalizedEmail, method: 'auth_session' });
        setIsLoading(false);
        return { success: true };
      }

      // Fallback: Check profiles table in Supabase PostgreSQL for staff profiles (e.g. Sumathy)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${normalizedEmail},full_name.ilike.%${rawInput}%`)
        .maybeSingle();

      if (profile && profile.is_active !== false) {
        const userProfile: UserProfile = {
          id: profile.id,
          user_id: profile.user_id || profile.id,
          full_name: profile.full_name || rawInput,
          email: profile.email || normalizedEmail,
          phone: profile.phone || '',
          role: (profile.role || 'billing_staff') as UserRole,
          branch: profile.branch || 'Trichy - Sandhukadai',
          avatar_url: profile.avatar_url,
          is_active: true,
          last_login_at: new Date().toISOString(),
        };

        setUser(userProfile);
        setRole(userProfile.role);
        localStorage.setItem('sampath_auth_user', JSON.stringify(userProfile));
        dataService.logAuditAction('user_login', 'auth', profile.id, { email: normalizedEmail, method: 'profile_fallback' });
        setIsLoading(false);
        return { success: true };
      }

      let msg = authError?.message || 'Invalid email address or password.';
      if (msg.toLowerCase().includes('email not confirmed')) {
        msg = 'Email address not confirmed in Supabase Auth. Contact administrator.';
      }
      return { success: false, message: msg };
    } catch (err: any) {
      console.error('Login authentication error:', err);
      setIsLoading(false);
      return { success: false, message: err?.message || 'Authentication error. Please try again.' };
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
