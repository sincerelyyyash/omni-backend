export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: {
      data?: string;
    };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
      parts?: Array<{ mimeType: string; body?: { data?: string } }>;
    }>;
  };
  internalDate: string;
  sizeEstimate: number;
}

export interface GmailSyncState {
  lastSyncTime: Date | null;
  lastMessageId: string | null;
  lastHistoryId: string | null;
}

export interface GmailFetchOptions {
  maxResults?: number;
  since?: Date;
  query?: string;
  labelIds?: string[];
}
