import { supabase, isSupabaseConfigured, getLocalDb, saveLocalDb } from './supabase';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncStatusChangeEvent {
  status: SyncStatus;
  message?: string;
  lastSyncedAt?: string;
}

type SyncListener = (event: SyncStatusChangeEvent) => void;
type DataChangeListener = (tableName: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => void;

class SyncEngineManager {
  private status: SyncStatus = 'synced';
  private lastSyncedAt: string = new Date().toISOString();
  private statusListeners: Set<SyncListener> = new Set();
  private dataListeners: Set<DataChangeListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private realtimeSubscription: any = null;
  private isInitialized = false;

  constructor() {
    this.initBroadcastChannel();
  }

  private initBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('sj_erp_tab_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'ERP_DATA_CHANGE') {
            this.handleLocalTabEvent(event.data.tableName, event.data.eventType, event.data.payload);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel initialization warning:', e);
    }
  }

  public getStatus(): SyncStatusChangeEvent {
    return {
      status: this.status,
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  public subscribeStatus(listener: SyncListener): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public subscribeDataChange(listener: DataChangeListener): () => void {
    this.dataListeners.add(listener);
    return () => {
      this.dataListeners.delete(listener);
    };
  }

  private setStatus(status: SyncStatus, message?: string) {
    this.status = status;
    if (status === 'synced') {
      this.lastSyncedAt = new Date().toISOString();
    }
    const event: SyncStatusChangeEvent = {
      status: this.status,
      message,
      lastSyncedAt: this.lastSyncedAt,
    };
    this.statusListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in sync status listener:', e);
      }
    });
  }

  public notifyDataChange(tableName: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) {
    this.setStatus('syncing');

    // Broadcast across tabs on same device
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'ERP_DATA_CHANGE',
          tableName,
          eventType,
          payload,
        });
      } catch (e) {
        console.warn('Error broadcasting tab message:', e);
      }
    }

    // Notify local listeners
    this.dataListeners.forEach((listener) => {
      try {
        listener(tableName, eventType, payload);
      } catch (e) {
        console.error('Error in data change listener:', e);
      }
    });

    setTimeout(() => {
      this.setStatus('synced');
    }, 400);
  }

  private handleLocalTabEvent(tableName: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) {
    this.dataListeners.forEach((listener) => {
      try {
        listener(tableName, eventType, payload);
      } catch (e) {
        console.error('Error in tab event listener:', e);
      }
    });
  }

  public startRealtimeSync() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (!isSupabaseConfigured() || !supabase) {
      this.setStatus('offline', 'Running in local persistent storage mode');
      return;
    }

    try {
      this.setStatus('syncing');
      
      const channel = supabase
        .channel('sj-erp-realtime-global')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload: any) => {
            const table = payload.table || 'general';
            const eventType = payload.eventType || 'UPDATE';
            this.handleRemoteRealtimeChange(table, eventType, payload.new || payload.old);
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            this.setStatus('synced');
          } else if (status === 'CHANNEL_ERROR') {
            this.setStatus('error', 'Supabase realtime channel connection issue');
          } else if (status === 'CLOSED') {
            this.setStatus('offline', 'Realtime channel closed');
          }
        });

      this.realtimeSubscription = channel;
    } catch (e) {
      console.warn('Supabase Realtime subscription error:', e);
      this.setStatus('offline', 'Offline mode active');
    }
  }

  private handleRemoteRealtimeChange(tableName: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE', recordData: any) {
    if (!recordData) return;
    this.setStatus('syncing');

    // Notify components
    this.dataListeners.forEach((listener) => {
      try {
        listener(tableName, eventType, recordData);
      } catch (e) {
        console.error('Error handling realtime event:', e);
      }
    });

    setTimeout(() => {
      this.setStatus('synced');
    }, 300);
  }

  public stopRealtimeSync() {
    if (this.realtimeSubscription && supabase) {
      try {
        supabase.removeChannel(this.realtimeSubscription);
      } catch (e) {
        console.warn('Error removing channel:', e);
      }
      this.realtimeSubscription = null;
    }
    this.isInitialized = false;
  }
}

export const syncEngine = new SyncEngineManager();

