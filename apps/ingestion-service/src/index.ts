import "dotenv/config";
import { scheduler } from "./scheduler/cron.jobs";
import { startWorker } from "./worker";
import { closeRedisClient } from "@repo/redis";
import { validateEnv } from "./config/env";

try {
  validateEnv();
} catch (error) {
  console.error("Environment validation failed:", (error as Error).message);
  process.exit(1);
}

scheduler.startAll();
startWorker().catch((error) => {
  console.error("Failed to start worker:", error);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  scheduler.stopAll();
  await closeRedisClient();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  scheduler.stopAll();
  await closeRedisClient();
  process.exit(0);
});
