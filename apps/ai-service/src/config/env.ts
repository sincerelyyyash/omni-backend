import "dotenv/config";

const requiredEnvVars = [
  "GEMINI_API_KEY",
  "MEMORY_ENGINE_URL",
  "DATABASE_URL",
  "REDIS_URL",
] as const;

const optionalEnvVars = [] as const;

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
