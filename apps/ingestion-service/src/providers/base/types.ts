export interface FetchOptions {
  maxResults?: number;
  since?: Date;
  forceFullSync?: boolean;
}

export interface FetchResult {
  success: boolean;
  itemsProcessed: number;
  itemsFailed: number;
  lastSyncTime?: Date;
  error?: string;
}

export interface SyncState {
  lastSyncTime: Date | null;
  lastItemId: string | null;
  metadata?: Record<string, unknown>;
}

export interface DataProvider {
  name: string;
  fetch(userId: string, options?: FetchOptions): Promise<FetchResult>;
  getSyncState(userId: string): Promise<SyncState>;
}
