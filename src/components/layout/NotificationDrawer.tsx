import React from 'react';
import { NotificationItem } from '@/types';
import { X, Check, Bell, AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const typeIcons = {
    info: <Info className="h-4 w-4 text-blue-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    danger: <AlertTriangle className="h-4 w-4 text-red-500" />,
    success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-charcoal-950/50 backdrop-blur-sm" />

      {/* Drawer */}
      <div className="relative z-10 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-charcoal-900">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-charcoal-800">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gold-600" />
            <h2 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
              In-App Alerts ({notifications.length})
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs dark:border-charcoal-800 dark:bg-charcoal-950">
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1 text-slate-600 hover:text-gold-600 dark:text-slate-400"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </button>
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-red-600 hover:underline dark:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-slate-400">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No pending notifications</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 text-xs transition-all ${
                  item.is_read
                    ? 'border-slate-200 bg-white opacity-70 dark:border-charcoal-800 dark:bg-charcoal-900'
                    : 'border-gold-300 bg-gold-50/40 shadow-sm dark:border-gold-800/40 dark:bg-gold-950/20'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">{typeIcons[item.type]}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-charcoal-900 dark:text-slate-100">{item.title}</h4>
                    <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">{item.message}</p>
                    <span className="mt-2 block text-[10px] text-slate-400">
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

