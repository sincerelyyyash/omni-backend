import { createQueue, type QueueJob } from "@repo/redis";
import { enrichmentService } from "./services/enrichment.service";

const ENRICHMENT_QUEUE_KEY = "memory:enrichment";
const AI_JOBS_QUEUE_KEY = "ai:jobs";
const CONSUMER_GROUP = "ai-workers";
const CONSUMER_NAME = `ai-worker-${process.pid}`;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

const enrichmentQueue = createQueue(ENRICHMENT_QUEUE_KEY);
const aiJobsQueue = createQueue(AI_JOBS_QUEUE_KEY);

const processEnrichmentJob = async (job: QueueJob): Promise<void> => {
  if (job.type === "memory:enrich") {
    const { memoryId, userId } = job.payload;

    if (!memoryId || typeof memoryId !== "number") {
      throw new Error(`Invalid memoryId in job payload: ${memoryId}`);
    }

    if (!userId || typeof userId !== "number") {
      throw new Error(`Invalid userId in job payload: ${userId}`);
    }

    await enrichmentService.enrichMemory(memoryId, userId);

    console.log(
      `[AI Worker] Enriched memory ${memoryId} for user ${userId}`,
    );
  } else {
    throw new Error(`Unknown enrichment job type: ${job.type}`);
  }
};

const processSuggestionExecutionJob = async (job: QueueJob): Promise<void> => {
  if (job.type === "suggestion:execute") {
    const { notificationId, suggestionId, userId } = job.payload;

    if (!notificationId || typeof notificationId !== "string") {
      throw new Error(`Invalid notificationId in job payload: ${notificationId}`);
    }

    if (!suggestionId || typeof suggestionId !== "string") {
      throw new Error(`Invalid suggestionId in job payload: ${suggestionId}`);
    }

    if (!userId || typeof userId !== "number") {
      throw new Error(`Invalid userId in job payload: ${userId}`);
    }

    const { suggestionExecutionService } = await import("./services/suggestion-execution.service");
    await suggestionExecutionService.execute(userId, notificationId, suggestionId);

    console.log(
      `[AI Worker] Executed suggestion ${suggestionId} for notification ${notificationId}`,
    );
  } else {
    throw new Error(`Unknown AI job type: ${job.type}`);
  }
};

const shouldRetry = (retries: number | undefined): boolean => {
  return (retries || 0) < MAX_RETRIES;
};

const processEnrichmentJobs = async (): Promise<void> => {
  try {
    const jobs = await enrichmentQueue.dequeue(CONSUMER_GROUP, CONSUMER_NAME, 10, 5000);

    if (jobs.length === 0) {
      setImmediate(processEnrichmentJobs);
      return;
    }

    console.log(`[AI Worker] Dequeued ${jobs.length} enrichment jobs`);

    for (const job of jobs) {
      try {
        await processEnrichmentJob(job);
        await enrichmentQueue.acknowledge(CONSUMER_GROUP, job.id);
        console.log(`[AI Worker] Successfully processed enrichment job ${job.id}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`[AI Worker] Failed to process enrichment job ${job.id}:`, errorMessage);

        const currentRetries = job.retries || 0;

        if (shouldRetry(currentRetries)) {
          console.log(
            `[AI Worker] Retrying enrichment job ${job.id} (attempt ${currentRetries + 1}/${MAX_RETRIES})`,
          );

          await enrichmentQueue.enqueue({
            type: job.type,
            payload: job.payload,
            retries: currentRetries + 1,
          });

          await enrichmentQueue.acknowledge(CONSUMER_GROUP, job.id);

          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          console.error(
            `[AI Worker] Enrichment job ${job.id} exceeded max retries (${MAX_RETRIES}), acknowledging to remove from pending`,
          );
          await enrichmentQueue.acknowledge(CONSUMER_GROUP, job.id);
        }
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[AI Worker] Error in enrichment job processing loop:", errorMessage);

    if (
      errorMessage.includes("Redis") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("Connection")
    ) {
      console.log("[AI Worker] Redis connection error, waiting 10s before retry...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  setImmediate(processEnrichmentJobs);
};

const processAiJobs = async (): Promise<void> => {
  try {
    const jobs = await aiJobsQueue.dequeue(CONSUMER_GROUP, CONSUMER_NAME, 10, 5000);

    if (jobs.length === 0) {
      setImmediate(processAiJobs);
      return;
    }

    console.log(`[AI Worker] Dequeued ${jobs.length} AI jobs`);

    for (const job of jobs) {
      try {
        await processSuggestionExecutionJob(job);
        await aiJobsQueue.acknowledge(CONSUMER_GROUP, job.id);
        console.log(`[AI Worker] Successfully processed AI job ${job.id}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`[AI Worker] Failed to process AI job ${job.id}:`, errorMessage);

        const currentRetries = job.retries || 0;

        if (shouldRetry(currentRetries)) {
          console.log(
            `[AI Worker] Retrying AI job ${job.id} (attempt ${currentRetries + 1}/${MAX_RETRIES})`,
          );

          await aiJobsQueue.enqueue({
            type: job.type,
            payload: job.payload,
            retries: currentRetries + 1,
          });

          await aiJobsQueue.acknowledge(CONSUMER_GROUP, job.id);

          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          console.error(
            `[AI Worker] AI job ${job.id} exceeded max retries (${MAX_RETRIES}), acknowledging to remove from pending`,
          );
          await aiJobsQueue.acknowledge(CONSUMER_GROUP, job.id);
        }
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[AI Worker] Error in AI job processing loop:", errorMessage);

    if (
      errorMessage.includes("Redis") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("Connection")
    ) {
      console.log("[AI Worker] Redis connection error, waiting 10s before retry...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  setImmediate(processAiJobs);
};

export const startWorker = async (): Promise<void> => {
  console.log(`[AI Worker] Starting worker ${CONSUMER_NAME}...`);

  processEnrichmentJobs();
  processAiJobs();

  const shutdown = () => {
    console.log("[AI Worker] Shutting down gracefully...");
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};
