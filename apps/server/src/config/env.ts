import "dotenv/config";

const requiredEnvVars = [
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "DATABASE_URL",
] as const;

const optionalEnvVars = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "TWITTER_CLIENT_ID",
  "TWITTER_CLIENT_SECRET",
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
};
