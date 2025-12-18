# Redis Package

Shared Redis client and queue service for the monorepo.

## Features

- Redis client singleton
- Queue service using Redis Streams
- Consumer groups for distributed processing
- Job acknowledgment and retry support

## Usage

### Redis Client

```typescript
import { getRedisClient, closeRedisClient } from "@repo/redis";

const redis = getRedisClient();
await redis.set("key", "value");
const value = await redis.get("key");

await closeRedisClient();
```

### Queue Service

```typescript
import { createQueue } from "@repo/redis";

const queue = createQueue("my:queue");

await queue.enqueue({
  type: "my:job",
  payload: { userId: "123" },
});

const jobs = await queue.dequeue("consumer-group", "consumer-1");
for (const job of jobs) {
  await processJob(job);
  await queue.acknowledge("consumer-group", job.id);
}
```

## Environment Variables

- `REDIS_URL` - Redis connection URL (default: `redis://localhost:6379`)
