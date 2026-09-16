import React, { useState, useEffect } from 'react';
import { syncEngine, SyncStatusChangeEvent } from '@/lib/syncEngine';
import { useLanguage } from '@/lib/i18n';
import { CheckCircle2, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';

export const SyncStatusBadge: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncStatusChangeEvent>(syncEngine.getStatus());
  const { language } = useLanguage();

  useEffect(() => {
    const unsubscribe = syncEngine.subscribeStatus((newState) => {
      setSyncState(newState);
    });
    return () => unsubscribe();
  }, []);

  const renderBadge = () => {
    switch (syncState.status) {
      case 'synced':
        return (
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-sm" title={`Data synchronized with central Supabase database. Last synced: ${syncState.lastSyncedAt}`}>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{language === 'ta' ? 'ஒத்திசைக்கப்பட்டது' : 'Synced'}</span>
          </div>
        );
      case 'syncing':
        return (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/80 px-2.5 py-1 text-[11px] font-bold text-amber-900 dark:border-gold-800/40 dark:bg-gold-950/40 dark:text-gold-300 shadow-sm" title="Synchronizing live changes across devices...">
            <RefreshCw className="h-3.5 w-3.5 text-gold-600 animate-spin" />
            <span>{language === 'ta' ? 'ஒத்திசைகிறது...' : 'Syncing...'}</span>
          </div>
        );
      case 'error':
        return (
          <button
            onClick={() => syncEngine.startRealtimeSync()}
            className="flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50/90 px-2.5 py-1 text-[11px] font-bold text-red-800 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-300 shadow-sm hover:bg-red-100 dark:hover:bg-red-950 transition-all"
            title="Click to retry real-time synchronization"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <span>{language === 'ta' ? 'ஒத்திசைவு பிழை (மீண்டும் முயல்க)' : 'Sync Error (Retry)'}</span>
          </button>
        );
      case 'offline':
      default:
        return (
          <div className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-300 shadow-sm" title={syncState.message || 'Offline persistent mode active'}>
            <WifiOff className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>{language === 'ta' ? 'ஆஃப்லைன் முறை' : 'Offline Mode'}</span>
          </div>
        );
    }
  };

  return renderBadge();
};

