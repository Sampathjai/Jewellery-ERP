import { supabase, isSupabaseConfigured } from './supabase';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncStatusChangeEvent {
  status: SyncStatus;
  message?: string;
  lastSyncedAt?: string;
  pendingQueueCount?: number;
}

export interface OfflineMutation {
  id: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  createdAt: string;
  retryCount: number;
}

const OFFLINE_QUEUE_KEY = 'shankar_erp_offline_mutations_queue';

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
  private isReplayingQueue = false;

  constructor() {
    this.initBroadcastChannel();
    this.initNetworkListeners();
  }

  private initNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SyncEngine] Network connection restored. Replaying pending offline mutations...');
        this.replayOfflineQueue();
      });
      window.addEventListener('offline', () => {
        this.setStatus('offline', 'Network offline — changes will queue locally');
      });
    }
  }

  public getPendingQueue(): OfflineMutation[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getPendingQueueCount(): number {
    return this.getPendingQueue().length;
  }

  public enqueueOfflineMutation(mutation: Omit<OfflineMutation, 'id' | 'createdAt' | 'retryCount'>): string {
    const id = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEntry: OfflineMutation = {
      ...mutation,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    try {
      const queue = this.getPendingQueue();
      // Avoid duplicate mutations with identical payload and table
      const isDuplicate = queue.some(
        (m) => m.table === mutation.table && m.payload?.id && m.payload?.id === mutation.payload?.id
      );
      if (!isDuplicate) {
        queue.push(newEntry);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      }
      this.setStatus('offline', `${queue.length} change(s) queued for sync`);
    } catch (e) {
      console.warn('Failed to persist offline mutation:', e);
    }
    return id;
  }

  public async replayOfflineQueue(): Promise<{ success: boolean; processed: number }> {
    if (this.isReplayingQueue) return { success: false, processed: 0 };
    if (!isSupabaseConfigured() || !supabase) return { success: false, processed: 0 };

    const queue = this.getPendingQueue();
    if (queue.length === 0) return { success: true, processed: 0 };

    this.isReplayingQueue = true;
    this.setStatus('syncing', `Replaying ${queue.length} pending mutations...`);

    const remainingQueue: OfflineMutation[] = [];
    let processedCount = 0;

    for (const item of queue) {
      try {
        if (item.operation === 'INSERT' || item.operation === 'UPDATE') {
          // Use upsert to guarantee idempotency and avoid duplicate primary keys
          const { error } = await supabase.from(item.table).upsert(item.payload, { onConflict: 'id' });
          if (error) {
            console.error(`Failed to replay mutation for table ${item.table}:`, error.message);
            item.retryCount += 1;
            if (item.retryCount < 5) {
              remainingQueue.push(item);
            }
          } else {
            processedCount++;
            this.notifyDataChange(item.table, item.operation, item.payload);
          }
        } else if (item.operation === 'DELETE') {
          const targetId = item.payload?.id || item.payload;
          const { error } = await supabase.from(item.table).delete().eq('id', targetId);
          if (error) {
            item.retryCount += 1;
            if (item.retryCount < 5) remainingQueue.push(item);
          } else {
            processedCount++;
            this.notifyDataChange(item.table, 'DELETE', item.payload);
          }
        }
      } catch (err) {
        console.error('Exception during offline queue replay:', err);
        item.retryCount += 1;
        if (item.retryCount < 5) remainingQueue.push(item);
      }
    }

    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
    } catch (e) {
      console.warn('Failed to update offline queue after replay:', e);
    }

    this.isReplayingQueue = false;
    this.setStatus(remainingQueue.length > 0 ? 'offline' : 'synced', 
      remainingQueue.length > 0 ? `${remainingQueue.length} pending sync` : 'All changes synchronized with cloud'
    );

    return { success: true, processed: processedCount };
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
      pendingQueueCount: this.getPendingQueueCount(),
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
      pendingQueueCount: this.getPendingQueueCount(),
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

    // Bridge special Supabase Cloud Vault changes to target modules
    if (tableName === 'metal_rates') {
      const rateDate = recordData.rate_date;
      const recId = recordData.id;
      if (rateDate === '1970-01-01' || recId === '00000000-0000-0000-0000-000000000099') {
        this.dataListeners.forEach((listener) => {
          try {
            listener('estimations', eventType, recordData);
            listener('general', eventType, recordData);
          } catch (e) {
            console.error('Error handling realtime event for estimations:', e);
          }
        });
      } else if (rateDate === '1970-01-02' || recId === '00000000-0000-0000-0000-000000000088') {
        this.dataListeners.forEach((listener) => {
          try {
            listener('trusted_devices', eventType, recordData);
            listener('general', eventType, recordData);
          } catch (e) {
            console.error('Error handling realtime event for trusted_devices:', e);
          }
        });
      } else if (rateDate === '1970-01-03' || recId === '00000000-0000-0000-0000-000000000097') {
        this.dataListeners.forEach((listener) => {
          try {
            listener('custom_orders', eventType, recordData);
            listener('general', eventType, recordData);
          } catch (e) {
            console.error('Error handling realtime event for custom_orders:', e);
          }
        });
      }
    }

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

