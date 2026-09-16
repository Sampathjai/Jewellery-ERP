import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { NotificationDrawer } from './NotificationDrawer';
import { getLocalDb, saveLocalDb } from '@/lib/supabase';
import { syncEngine } from '@/lib/syncEngine';
import { NotificationItem } from '@/types';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    return getLocalDb().notifications || [];
  });

  useEffect(() => {
    syncEngine.startRealtimeSync();
    return () => {
      syncEngine.stopRealtimeSync();
    };
  }, []);

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

