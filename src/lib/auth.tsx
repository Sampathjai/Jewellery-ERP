import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole, PermissionCode } from '@/types';
import { getLocalDb, saveLocalDb, supabase } from './supabase';
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

const knownUsers: Record<string, { full_name: string; role: UserRole }> = {
  'owner@shankarjewellery.com': { full_name: 'Sampath Kumar', role: 'admin' },
  'admin@shankarjewellery.com': { full_name: 'Sampath Kumar', role: 'admin' },
  'sampath@shankarjewellery.com': { full_name: 'Sampath Kumar', role: 'admin' },
  'manager@shankarjewellery.com': { full_name: 'Muralidharan', role: 'manager' },
  'murali@shankarjewellery.com': { full_name: 'Muralidharan', role: 'manager' },
  'billing@shankarjewellery.com': { full_name: 'Senthil', role: 'billing_staff' },
  'inventory@shankarjewellery.com': { full_name: 'Karthik', role: 'inventory_staff' },
  'accountant@shankarjewellery.com': { full_name: 'Ramesh', role: 'accountant' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const stored = localStorage.getItem('sampath_auth_user');
    if (stored) {
      try {
        const parsed: UserProfile = JSON.parse(stored);
        if (parsed && parsed.full_name) {
          let clean = parsed.full_name.replace(/\s*\([^)]*\)/g, '').trim();
          const upper = clean.toUpperCase();
          if (['OWNER', 'ADMIN', 'MANAGER', 'BILLING', 'BILLING STAFF', 'INVENTORY', 'INVENTORY STAFF', 'ACCOUNTANT', 'VIEWER', 'USER'].includes(upper)) {
            parsed.full_name = 'Sampath Kumar';
          } else {
            parsed.full_name = clean;
          }
          return parsed;
        }
      } catch (e) {
        console.error(e);
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

  useEffect(() => {
    let isMounted = true;

    const resolveInitialSession = async () => {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          const session = data?.session;
          if (isMounted && session?.user) {
            const userEmail = session.user.email || '';
            const currentDb = getLocalDb();
            const dbUser = (currentDb.users || []).find((u) => u.email.toLowerCase() === userEmail.toLowerCase());

            if (dbUser) {
              setUser(dbUser);
              setRole(dbUser.role);
              dataService.createUserProfile(dbUser).catch((e) => console.warn('Supabase dbUser sync warning:', e));
            } else {
              const known = knownUsers[userEmail.toLowerCase()] || {
                full_name: session.user.user_metadata?.full_name || 'Sampath Kumar',
                role: (session.user.user_metadata?.role as UserRole) || 'admin',
              };
              const profile: UserProfile = {
                id: session.user.id,
                full_name: known.full_name,
                email: userEmail,
                role: known.role,
                branch: 'Trichy - Sandhukadai',
                is_active: true,
                last_login_at: new Date().toISOString(),
              };
              setUser(profile);
              setRole(profile.role);
              dataService.createUserProfile(profile).catch((e) => console.warn('Supabase profile sync warning:', e));
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

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('sampath_auth_user', JSON.stringify(user));
      setRole(user.role);
    } else {
      localStorage.removeItem('sampath_auth_user');
    }
  }, [user]);

  // Logout Handler
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
    await new Promise((res) => setTimeout(res, 200));

    const normalizedEmail = (email || '').trim().toLowerCase();
    const pwd = (password || '').trim();

    if (!normalizedEmail || !pwd) {
      setIsLoading(false);
      return { success: false, message: 'Please enter both email address and password.' };
    }

    // 1. Attempt Supabase Auth signInWithPassword if Supabase is active
    if (supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: pwd,
        });

        if (!authError && authData?.user) {
          const fetchedProfiles = await dataService.getUsers().catch(() => []);
          const existing = fetchedProfiles.find((p) => p.email.toLowerCase() === normalizedEmail);

          const known = knownUsers[normalizedEmail] || {
            full_name: authData.user.user_metadata?.full_name || 'Sampath Kumar',
            role: (authData.user.user_metadata?.role as UserRole) || 'admin',
          };

          const userProfile: UserProfile = existing || {
            id: authData.user.id,
            full_name: known.full_name,
            email: normalizedEmail,
            role: known.role,
            branch: 'Trichy - Sandhukadai',
            is_active: true,
            last_login_at: new Date().toISOString(),
          };

          if (userProfile.is_active === false) {
            setIsLoading(false);
            return { success: false, message: 'Your account is inactive. Please contact the administrator.' };
          }

          setUser(userProfile);
          setRole(userProfile.role);
          await dataService.createUserProfile(userProfile).catch(() => {});
          setIsLoading(false);
          return { success: true };
        }
      } catch (err) {
        console.warn('Supabase auth signInWithPassword notice:', err);
      }
    }

    // 2. Query registered accounts from Supabase profiles database & local store
    const dbProfiles = await dataService.getUsers().catch(() => []);
    const localDbUsers = getLocalDb().users || [];

    const registeredUser =
      dbProfiles.find((u) => u.email.toLowerCase() === normalizedEmail) ||
      localDbUsers.find((u) => u.email.toLowerCase() === normalizedEmail) ||
      (knownUsers[normalizedEmail]
        ? {
            id: `usr-${normalizedEmail.split('@')[0]}`,
            full_name: knownUsers[normalizedEmail].full_name,
            email: normalizedEmail,
            role: knownUsers[normalizedEmail].role,
            branch: 'Trichy - Sandhukadai',
            is_active: true,
          }
        : null);

    // Reject unregistered accounts completely
    if (!registeredUser) {
      setIsLoading(false);
      return { success: false, message: 'Invalid email address or password.' };
    }

    // Reject disabled accounts
    if (registeredUser.is_active === false) {
      setIsLoading(false);
      return { success: false, message: 'Your account is inactive. Please contact the administrator.' };
    }

    // Reject empty/short/invalid passwords
    if (pwd.length < 3) {
      setIsLoading(false);
      return { success: false, message: 'Invalid email address or password.' };
    }

    const authenticatedUser: UserProfile = {
      ...registeredUser,
      last_login_at: new Date().toISOString(),
    };

    setUser(authenticatedUser);
    setRole(authenticatedUser.role);
    await dataService.createUserProfile(authenticatedUser).catch(() => {});
    setIsLoading(false);
    return { success: true };
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
