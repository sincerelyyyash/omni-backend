import { gmailProvider } from "./providers/gmail/gmail.provider";
import { calendarProvider } from "./providers/calendar/calendar.provider";
import { githubProvider } from "./providers/github/github.provider";
import { twitterProvider } from "./providers/twitter/twitter.provider";
import { createQueue, type QueueJob } from "@repo/redis";

const INGESTION_QUEUE_KEY = "ingestion:jobs";
const CONSUMER_GROUP = "ingestion-workers";
const CONSUMER_NAME = `worker-${process.pid}`;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

const queue = createQueue(INGESTION_QUEUE_KEY);

const processJob = async (job: QueueJob): Promise<void> => {
  if (job.type === "gmail:fetch") {
    const { userId, maxResults, since, forceFullSync } = job.payload;

    if (!userId || typeof userId !== "string") {
      throw new Error(`Invalid userId in job payload: ${userId}`);
    }

    const result = await gmailProvider.fetch(userId, {
      maxResults: maxResults as number | undefined,
      since: since ? new Date(since as string) : undefined,
      forceFullSync: forceFullSync as boolean | undefined,
    });

    if (!result.success) {
      throw new Error(
        `Gmail fetch failed for user ${userId}: ${result.error || "Unknown error"}`,
      );
    }

    console.log(
      `[Worker] Processed Gmail fetch for user ${userId}: ${result.itemsProcessed} items processed, ${result.itemsFailed} failed`,
    );
  } else if (job.type === "calendar:fetch") {
    const { userId, maxResults, since, forceFullSync } = job.payload;

    if (!userId || typeof userId !== "string") {
      throw new Error(`Invalid userId in job payload: ${userId}`);
    }

    const result = await calendarProvider.fetch(userId, {
      maxResults: maxResults as number | undefined,
      since: since ? new Date(since as string) : undefined,
      forceFullSync: forceFullSync as boolean | undefined,
    });

    if (!result.success) {
      throw new Error(
        `Calendar fetch failed for user ${userId}: ${result.error || "Unknown error"}`,
      );
    }

    console.log(
      `[Worker] Processed Calendar fetch for user ${userId}: ${result.itemsProcessed} items processed, ${result.itemsFailed} failed`,
    );
  } else if (job.type === "github:fetch") {
    const { userId, maxResults, since, forceFullSync } = job.payload;

    if (!userId || typeof userId !== "string") {
      throw new Error(`Invalid userId in job payload: ${userId}`);
    }

    const result = await githubProvider.fetch(userId, {
      maxResults: maxResults as number | undefined,
      since: since ? new Date(since as string) : undefined,
      forceFullSync: forceFullSync as boolean | undefined,
    });

    if (!result.success) {
      throw new Error(
        `GitHub fetch failed for user ${userId}: ${result.error || "Unknown error"}`,
      );
    }

    console.log(
      `[Worker] Processed GitHub fetch for user ${userId}: ${result.itemsProcessed} items processed, ${result.itemsFailed} failed`,
    );
  } else if (job.type === "twitter:fetch") {
    const { userId, maxResults, since, forceFullSync } = job.payload;

    if (!userId || typeof userId !== "string") {
      throw new Error(`Invalid userId in job payload: ${userId}`);
    }

    const result = await twitterProvider.fetch(userId, {
      maxResults: maxResults as number | undefined,
      since: since ? new Date(since as string) : undefined,
      forceFullSync: forceFullSync as boolean | undefined,
    });

    if (!result.success) {
      throw new Error(
        `Twitter fetch failed for user ${userId}: ${result.error || "Unknown error"}`,
      );
    }

    console.log(
      `[Worker] Processed Twitter fetch for user ${userId}: ${result.itemsProcessed} items processed, ${result.itemsFailed} failed`,
    );
  } else {
    throw new Error(`Unknown job type: ${job.type}`);
  }
};

const shouldRetry = (retries: number | undefined): boolean => {
  return (retries || 0) < MAX_RETRIES;
};

export const startWorker = async (): Promise<void> => {
  console.log(`[Worker] Starting worker ${CONSUMER_NAME}...`);

  const processJobs = async () => {
    try {
      const jobs = await queue.dequeue(CONSUMER_GROUP, CONSUMER_NAME, 10, 5000);

      if (jobs.length === 0) {
        setImmediate(processJobs);
        return;
      }

      console.log(`[Worker] Dequeued ${jobs.length} jobs`);

      for (const job of jobs) {
        try {
          await processJob(job);
          await queue.acknowledge(CONSUMER_GROUP, job.id);
          console.log(`[Worker] Successfully processed job ${job.id}`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(`[Worker] Failed to process job ${job.id}:`, errorMessage);

          const currentRetries = job.retries || 0;

          if (shouldRetry(currentRetries)) {
            console.log(
              `[Worker] Retrying job ${job.id} (attempt ${currentRetries + 1}/${MAX_RETRIES})`,
            );

            await queue.enqueue({
              type: job.type,
              payload: job.payload,
              retries: currentRetries + 1,
            });

            await queue.acknowledge(CONSUMER_GROUP, job.id);

            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          } else {
            console.error(
              `[Worker] Job ${job.id} exceeded max retries (${MAX_RETRIES}), acknowledging to remove from pending`,
            );
            await queue.acknowledge(CONSUMER_GROUP, job.id);
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[Worker] Error in job processing loop:", errorMessage);

      if (
        errorMessage.includes("Redis") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("Connection")
      ) {
        console.log("[Worker] Redis connection error, waiting 10s before retry...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }

    setImmediate(processJobs);
  };

  processJobs();
};
