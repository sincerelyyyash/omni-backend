import cron from "node-cron";
import { prisma } from "@repo/database";
import { createQueue } from "@repo/redis";

const INGESTION_QUEUE_KEY = "ingestion:jobs";

export class IngestionScheduler {
  private jobs: Array<{ start: () => void; stop: () => void }> = [];
  private queue = createQueue(INGESTION_QUEUE_KEY);

  startGmailSync() {
    const job = cron.schedule("*/15 * * * *", async () => {
      console.log("[Scheduler] Starting Gmail sync job...");

      try {
        const accounts = await prisma.account.findMany({
          where: {
            providerId: "google",
            accessToken: { not: null },
          },
          select: {
            userId: true,
          },
          distinct: ["userId"],
        });

        console.log(`[Scheduler] Found ${accounts.length} users with Google accounts`);

        if (accounts.length === 0) {
          console.log("[Scheduler] No users with Google accounts found");
          return;
        }

        let enqueuedCount = 0;
        let failedCount = 0;

        for (const account of accounts) {
          try {
            await this.queue.enqueue({
              type: "gmail:fetch",
              payload: {
                userId: account.userId,
                maxResults: 50,
              },
            });
            enqueuedCount++;
          } catch (error) {
            failedCount++;
            console.error(
              `[Scheduler] Failed to enqueue job for user ${account.userId}:`,
              error,
            );
          }
        }

        console.log(
          `[Scheduler] Enqueued ${enqueuedCount} Gmail sync jobs${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
        );
      } catch (error) {
        console.error("[Scheduler] Error in Gmail sync job:", error);
      }
    });

    this.jobs.push({
      start: () => job.start(),
      stop: () => job.stop(),
    });

    job.start();
    console.log("[Scheduler] Gmail sync job started (runs every 15 minutes)");
  }

  startCalendarSync() {
    const job = cron.schedule("*/15 * * * *", async () => {
      console.log("[Scheduler] Starting Calendar sync job...");

      try {
        const accounts = await prisma.account.findMany({
          where: {
            providerId: "google",
            accessToken: { not: null },
          },
          select: {
            userId: true,
          },
          distinct: ["userId"],
        });

        console.log(`[Scheduler] Found ${accounts.length} users with Google accounts`);

        if (accounts.length === 0) {
          console.log("[Scheduler] No users with Google accounts found");
          return;
        }

        let enqueuedCount = 0;
        let failedCount = 0;

        for (const account of accounts) {
          try {
            await this.queue.enqueue({
              type: "calendar:fetch",
              payload: {
                userId: account.userId,
                maxResults: 50,
              },
            });
            enqueuedCount++;
          } catch (error) {
            failedCount++;
            console.error(
              `[Scheduler] Failed to enqueue calendar job for user ${account.userId}:`,
              error,
            );
          }
        }

        console.log(
          `[Scheduler] Enqueued ${enqueuedCount} Calendar sync jobs${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
        );
      } catch (error) {
        console.error("[Scheduler] Error in Calendar sync job:", error);
      }
    });

    this.jobs.push({
      start: () => job.start(),
      stop: () => job.stop(),
    });

    job.start();
    console.log("[Scheduler] Calendar sync job started (runs every 15 minutes)");
  }

  startGitHubSync() {
    const job = cron.schedule("*/15 * * * *", async () => {
      console.log("[Scheduler] Starting GitHub sync job...");

      try {
        const accounts = await prisma.account.findMany({
          where: {
            providerId: "github",
            accessToken: { not: null },
          },
          select: {
            userId: true,
          },
          distinct: ["userId"],
        });

        console.log(`[Scheduler] Found ${accounts.length} users with GitHub accounts`);

        if (accounts.length === 0) {
          console.log("[Scheduler] No users with GitHub accounts found");
          return;
        }

        let enqueuedCount = 0;
        let failedCount = 0;

        for (const account of accounts) {
          try {
            await this.queue.enqueue({
              type: "github:fetch",
              payload: {
                userId: account.userId,
                maxResults: 50,
              },
            });
            enqueuedCount++;
          } catch (error) {
            failedCount++;
            console.error(
              `[Scheduler] Failed to enqueue GitHub job for user ${account.userId}:`,
              error,
            );
          }
        }

        console.log(
          `[Scheduler] Enqueued ${enqueuedCount} GitHub sync jobs${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
        );
      } catch (error) {
        console.error("[Scheduler] Error in GitHub sync job:", error);
      }
    });

    this.jobs.push({
      start: () => job.start(),
      stop: () => job.stop(),
    });

    job.start();
    console.log("[Scheduler] GitHub sync job started (runs every 15 minutes)");
  }

  startTwitterSync() {
    const job = cron.schedule("*/15 * * * *", async () => {
      console.log("[Scheduler] Starting Twitter sync job...");

      try {
        const accounts = await prisma.account.findMany({
          where: {
            providerId: "twitter",
            accessToken: { not: null },
          },
          select: {
            userId: true,
          },
          distinct: ["userId"],
        });

        console.log(`[Scheduler] Found ${accounts.length} users with Twitter accounts`);

        if (accounts.length === 0) {
          console.log("[Scheduler] No users with Twitter accounts found");
          return;
        }

        let enqueuedCount = 0;
        let failedCount = 0;

        for (const account of accounts) {
          try {
            await this.queue.enqueue({
              type: "twitter:fetch",
              payload: {
                userId: account.userId,
                maxResults: 50,
              },
            });
            enqueuedCount++;
          } catch (error) {
            failedCount++;
            console.error(
              `[Scheduler] Failed to enqueue Twitter job for user ${account.userId}:`,
              error,
            );
          }
        }

        console.log(
          `[Scheduler] Enqueued ${enqueuedCount} Twitter sync jobs${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
        );
      } catch (error) {
        console.error("[Scheduler] Error in Twitter sync job:", error);
      }
    });

    this.jobs.push({
      start: () => job.start(),
      stop: () => job.stop(),
    });

    job.start();
    console.log("[Scheduler] Twitter sync job started (runs every 15 minutes)");
  }

  startAll() {
    this.startGmailSync();
    this.startCalendarSync();
    this.startGitHubSync();
    this.startTwitterSync();
  }

  stopAll() {
    this.jobs.forEach((job) => job.stop());
    console.log("[Scheduler] All jobs stopped");
  }
}

export const scheduler = new IngestionScheduler();
