import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole, PermissionCode } from '@/types';
import { getLocalDb, supabase } from './supabase';
import { dataService } from './dataService';
import { hasPermission } from './utils';
import { InactivityWarningModal } from '@/components/common/InactivityWarningModal';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: (reason?: string) => void;
  switchRole: (newRole: UserRole) => void;
  can: (permission: PermissionCode) => boolean;
  isLoading: boolean;
  inactivityTimeoutMinutes: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  // Read inactivity settings from database
  const db = getLocalDb();
  const autoLogoutEnabled = db.settings.inactivity_logout_enabled ?? true;
  const inactivityTimeoutMinutes = db.settings.inactivity_timeout_minutes ?? 15;

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
              } else {
                setUser(null);
                localStorage.removeItem('sampath_auth_user');
              }
            } else {
              setUser(null);
              localStorage.removeItem('sampath_auth_user');
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
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          const profile = await syncUserProfileFromAuth(session.user);
          if (profile && profile.is_active !== false) {
            setUser(profile);
            setRole(profile.role);
            localStorage.setItem('sampath_auth_user', JSON.stringify(profile));
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
  }, []);

  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(60);

  // Centralized 15-Minute Inactivity Auto Logout Tracker with 60s Warning Modal
  useEffect(() => {
    if (!user || !autoLogoutEnabled) return;

    const timeoutMs = (inactivityTimeoutMinutes || 15) * 60 * 1000;
    const warningMs = timeoutMs - 60000; // Trigger warning 60s before timeout
    let lastActivity = Date.now();

    const updateActivity = () => {
      lastActivity = Date.now();
      if (showInactivityWarning) {
        setShowInactivityWarning(false);
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, updateActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivity;

      if (elapsed >= timeoutMs) {
        clearInterval(checkInterval);
        logout('inactive');
      } else if (elapsed >= warningMs) {
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
      events.forEach((evt) => window.removeEventListener(evt, updateActivity));
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

      if (authError || !authData?.user) {
        setIsLoading(false);
        let msg = authError?.message || 'Invalid email address or password.';
        if (msg.toLowerCase().includes('email not confirmed')) {
          msg = 'Email address not confirmed in Supabase Auth. Contact administrator.';
        }
        return { success: false, message: msg };
      }

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
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error('Login authentication error:', err);
      setIsLoading(false);
      return { success: false, message: err?.message || 'Authentication error. Please try again.' };
    }
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
        logout,
        switchRole,
        can,
        isLoading,
        inactivityTimeoutMinutes,
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
