import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { NotificationDrawer } from './NotificationDrawer';
import { getLocalDb, saveLocalDb } from '@/lib/supabase';
import { syncEngine } from '@/lib/syncEngine';
import { NotificationItem } from '@/types';
import { useAuth } from '@/lib/auth';
import { dataService } from '@/lib/dataService';
import { isWebAuthnSupported } from '@/lib/webauthn';
import { KeyRound, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showPasskeyBanner, setShowPasskeyBanner] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    return getLocalDb().notifications || [];
  });

  useEffect(() => {
    syncEngine.startRealtimeSync();
    return () => {
      syncEngine.stopRealtimeSync();
    };
  }, []);

  useEffect(() => {
    const checkPasskeys = async () => {
      if (!user?.id || !isWebAuthnSupported()) return;
      const isDismissed = sessionStorage.getItem('passkey_prompt_dismissed');
      if (isDismissed === 'true') return;

      try {
        const userPasskeys = await dataService.getUserPasskeys(user.id);
        if (userPasskeys.length === 0) {
          setShowPasskeyBanner(true);
        }
      } catch (err) {
        console.error('Failed to check passkey status:', err);
      }
    };
    checkPasskeys();
  }, [user?.id]);

  const handleDismissPasskeyBanner = () => {
    setShowPasskeyBanner(false);
    sessionStorage.setItem('passkey_prompt_dismissed', 'true');
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, is_read: true }));
    setNotifications(updated);
    const db = getLocalDb();
    db.notifications = updated;
    saveLocalDb(db);
  };

  const handleClearAll = () => {
    setNotifications([]);
    const db = getLocalDb();
    db.notifications = [];
    saveLocalDb(db);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50 dark:bg-charcoal-950">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <Header
          onToggleSidebar={() => setSidebarOpen(true)}
          onToggleNotifications={() => setNotificationsOpen(true)}
          unreadCount={unreadCount}
        />

        <main className="flex-1 overflow-y-auto min-h-0 p-4 pb-20 sm:p-6 lg:pb-6 w-full max-w-7xl mx-auto">
          {showPasskeyBanner && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-gold-400/40 bg-gold-500/10 p-3.5 text-xs text-charcoal-950 dark:text-slate-100 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500 text-charcoal-950 shrink-0 shadow-sm">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-charcoal-950 dark:text-slate-100">
                    Enable Passkey Sign-In (Touch ID / Face ID / Windows Hello)
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Your device supports passkeys! Register this device to sign in instantly without typing your password next time.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/admin/user-login-settings"
                  className="rounded-xl bg-gold-500 px-3.5 py-1.5 text-xs font-bold text-charcoal-950 hover:bg-gold-600 transition-colors shadow-sm"
                >
                  Enable Passkey
                </Link>
                <button
                  type="button"
                  onClick={handleDismissPasskeyBanner}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-charcoal-800 transition-colors"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {children}
        </main>

        <BottomNav onOpenSidebar={() => setSidebarOpen(true)} />

        <NotificationDrawer
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllRead}
          onClearAll={handleClearAll}
        />
      </div>
    </div>
  );
};

