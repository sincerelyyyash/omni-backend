import "dotenv/config";
import { validateEnv } from "./config/env";
import { startWorker } from "./worker";

try {
  validateEnv();
} catch (error) {
  console.error("Environment validation failed:", (error as Error).message);
  process.exit(1);
}

startWorker().catch((error) => {
  console.error("Failed to start AI service worker:", error);
  process.exit(1);
});
