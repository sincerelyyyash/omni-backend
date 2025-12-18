import { getRedisClient } from "./client";

export interface QueueJob {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
  retries?: number;
}

export class QueueService {
  private redis = getRedisClient();
  private streamKey: string;

  constructor(streamKey: string) {
    this.streamKey = streamKey;
  }

  async enqueue(job: Omit<QueueJob, "id" | "createdAt">): Promise<string> {
    const jobId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const jobData: QueueJob = {
      id: jobId,
      ...job,
      createdAt: Date.now(),
      retries: job.retries || 0,
    };

    await this.redis.xadd(
      this.streamKey,
      "*",
      "job",
      JSON.stringify(jobData),
    );

    return jobId;
  }

  async dequeue(
    consumerGroup: string,
    consumerName: string,
    count: number = 1,
    blockMs: number = 5000,
  ): Promise<QueueJob[]> {
    try {
      await this.redis.xgroup(
        "CREATE",
        this.streamKey,
        consumerGroup,
        "0",
        "MKSTREAM",
      );
    } catch (error) {
      if (!(error as Error).message.includes("BUSYGROUP")) {
        throw error;
      }
    }

    const results = await this.redis.xreadgroup(
      "GROUP",
      consumerGroup,
      consumerName,
      "COUNT",
      count.toString(),
      "BLOCK",
      blockMs.toString(),
      "STREAMS",
      this.streamKey,
      ">",
    );

    if (!results || results.length === 0) {
      return [];
    }

    const jobs: QueueJob[] = [];
    for (const [stream, messages] of results) {
      for (const [messageId, fields] of messages) {
        const jobField = fields.find((_, i) => i % 2 === 0 && fields[i] === "job");
        if (jobField !== undefined) {
          const jobIndex = fields.indexOf("job");
          const jobData = JSON.parse(fields[jobIndex + 1]) as QueueJob;
          jobs.push({
            ...jobData,
            id: messageId,
          });
        }
      }
    }

    return jobs;
  }

  async acknowledge(consumerGroup: string, messageId: string): Promise<void> {
    await this.redis.xack(this.streamKey, consumerGroup, messageId);
  }

  async getPending(
    consumerGroup: string,
    start: string = "-",
    end: string = "+",
    count: number = 10,
  ): Promise<Array<{ id: string; job: QueueJob }>> {
    const pending = await this.redis.xpending(
      this.streamKey,
      consumerGroup,
      start,
      end,
      count,
    );

    if (!pending || pending.length === 0) {
      return [];
    }

    const results: Array<{ id: string; job: QueueJob }> = [];

    for (const [messageId, , , , retryCount] of pending) {
      const range = await this.redis.xrange(this.streamKey, messageId, messageId);
      if (range && range.length > 0) {
        const [, fields] = range[0];
        const jobIndex = fields.indexOf("job");
        if (jobIndex !== -1) {
          const jobData = JSON.parse(fields[jobIndex + 1]) as QueueJob;
          results.push({
            id: messageId,
            job: { ...jobData, retries: Number(retryCount) || 0 },
          });
        }
      }
    }

    return results;
  }

  async getStreamLength(): Promise<number> {
    return this.redis.xlen(this.streamKey);
  }
}

export const createQueue = (streamKey: string): QueueService => {
  return new QueueService(streamKey);
};
