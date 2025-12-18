const MEMORY_ENGINE_URL = process.env.MEMORY_ENGINE_URL || "http://localhost:8000";

export interface MemoryClientConfig {
  baseUrl?: string;
}

export interface Memory {
  id: number;
  userId: number;
  source: string;
  sourceId: string;
  timestamp: Date;
  contentUrl: string;
  title: string;
  origin: string;
  tags: string[];
  category: string[];
  attribute: Record<string, unknown>;
  summary: string;
  type: string;
  content?: string;
}

export class MemoryClientService {
  private baseUrl: string;

  constructor(config?: MemoryClientConfig) {
    this.baseUrl = config?.baseUrl || MEMORY_ENGINE_URL;
  }

  async getMemory(memoryId: number): Promise<Memory | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: memoryId }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        throw new Error(
          `Memory engine API error: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      return data as Memory;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Memory engine API request timed out");
        }
        if (
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("fetch failed")
        ) {
          throw new Error(
            `Memory engine is unreachable at ${this.baseUrl}. Is it running?`,
          );
        }
      }
      throw error;
    }
  }

  async searchMemories(
    userId: number,
    query: string,
    filters?: {
      source?: string;
      category?: string[];
      limit?: number;
    },
  ): Promise<Memory[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memories/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          userId,
          limit: filters?.limit || 10,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Memory engine API error: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      const searchResults = (data.memories || []) as Array<{
        id: string | number;
        score: number;
        text: string;
        payload: Record<string, unknown>;
      }>;
      
      return searchResults.map((result) => {
        const payload = result.payload || {};
        const memoryId = payload.memoryId 
          ? (payload.memoryId as number)
          : (typeof result.id === 'string' && result.id.startsWith('memory_'))
          ? parseInt(result.id.split('_')[1] || '0')
          : (typeof result.id === 'number' ? result.id : 0);
        
        return {
          id: memoryId,
          userId: (payload.userId as number) || 0,
          source: (payload.source as string) || '',
          sourceId: String(payload.sourceId || ''),
          timestamp: payload.timestamp ? new Date(payload.timestamp as string) : new Date(),
          contentUrl: (payload.contentUrl as string) || '',
          title: (payload.title as string) || result.text.substring(0, 100),
          origin: (payload.origin as string) || '',
          tags: (payload.tags as string[]) || [],
          category: (payload.category as string[]) || [],
          attribute: (payload.attribute as Record<string, unknown>) || {},
          summary: (payload.summary as string) || result.text,
          type: (payload.type as string) || 'text',
          content: result.text,
        } as Memory;
      });
    } catch (error) {
      console.error("Error searching memories:", error);
      return [];
    }
  }
}

export const memoryClient = new MemoryClientService();
