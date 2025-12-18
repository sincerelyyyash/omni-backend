import "dotenv/config";

const requiredEnvVars = [
  "DATABASE_URL",
  "REDIS_URL",
] as const;

const optionalEnvVars = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "TWITTER_CLIENT_ID",
  "TWITTER_CLIENT_SECRET",
  "MEMORY_ENGINE_URL",
] as const;

export const validateEnv = (): void => {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`Warning: Optional environment variable ${envVar} is not set`);
    }
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn(
      "Warning: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set. Gmail sync will not work.",
    );
  }

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.warn(
      "Warning: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not set. GitHub sync will not work.",
    );
  }

  if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
    console.warn(
      "Warning: TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET are not set. Twitter sync will not work.",
    );
  }
};
