import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { syncEngine } from '@/lib/syncEngine';
import { useMotionSafe } from '@/animations/motionConfig';

export const SyncStatusBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const { prefersReduced } = useMotionSafe();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = syncEngine.subscribeDataChange(() => {
      setIsSyncing(true);
      const timer = setTimeout(() => setIsSyncing(false), 800);
      return () => clearTimeout(timer);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  if (!isOnline) {
    return (
      <div className={`flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 ${className}`}>
        <WifiOff className="h-3 w-3" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50/80 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300 ${className}`}
      title="All devices synchronized with cloud database"
    >
      {isSyncing ? (
        <motion.div
          animate={prefersReduced ? undefined : { rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="h-3 w-3 text-gold-600" />
        </motion.div>
      ) : (
        <div className="relative flex h-2 w-2 items-center justify-center">
          {!prefersReduced && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </div>
      )}
      <span>{isSyncing ? 'Syncing...' : 'Cloud Synced'}</span>
    </div>
  );
};
