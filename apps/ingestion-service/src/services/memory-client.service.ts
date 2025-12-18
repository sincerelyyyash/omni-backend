import type { AddMemoryInput } from "@repo/types";

const MEMORY_ENGINE_URL = process.env.MEMORY_ENGINE_URL || "http://localhost:8000";

export interface MemoryClientConfig {
  baseUrl?: string;
}

export class MemoryClientService {
  private baseUrl: string;

  constructor(config?: MemoryClientConfig) {
    this.baseUrl = config?.baseUrl || MEMORY_ENGINE_URL;
  }

  async addMemory(memory: AddMemoryInput): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(memory),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Memory engine API error: ${response.status} - ${errorText}`,
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Memory engine API request timed out");
        }
        if (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")) {
          throw new Error(
            `Memory engine is unreachable at ${this.baseUrl}. Is it running?`,
          );
        }
      }
      throw error;
    }
  }

  async addMemories(memories: AddMemoryInput[]): Promise<unknown[]> {
    if (memories.length === 0) {
      return [];
    }

    const batchSize = 10;
    const results: unknown[] = [];
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;

    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((memory) => this.addMemory(memory)),
      );

      let batchSuccessCount = 0;
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
          batchSuccessCount++;
        } else {
          const errorMessage =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
          console.warn("Failed to add memory:", errorMessage);

          if (
            errorMessage.includes("unreachable") ||
            errorMessage.includes("ECONNREFUSED") ||
            errorMessage.includes("timed out")
          ) {
            consecutiveFailures++;
          }
        }
      });

      if (
        batchSuccessCount === 0 &&
        consecutiveFailures >= maxConsecutiveFailures
      ) {
        console.error(
          `Stopping memory ingestion after ${consecutiveFailures} consecutive failures. Memory engine may be down.`,
        );
        throw new Error(
          "Memory engine is unavailable. Stopping batch processing.",
        );
      }

      if (batchSuccessCount > 0) {
        consecutiveFailures = 0;
      }

      if (i + batchSize < memories.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }
}

export const memoryClient = new MemoryClientService();
