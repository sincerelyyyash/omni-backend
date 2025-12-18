# Ingestion Service

A service for fetching and ingesting data from external sources (Gmail, GitHub, Calendar, etc.) into the memory engine using Redis Streams for job queueing.

## Features

- **Gmail Integration**: Fetches emails from Gmail API using OAuth tokens stored by Better Auth
- **Automatic Token Refresh**: Handles OAuth token expiration and refresh automatically
- **Scheduled Sync**: Runs recurring sync jobs via cron scheduler that enqueue jobs to Redis
- **Queue-Based Processing**: Uses Redis Streams for reliable, scalable job processing
- **Worker Pattern**: Separate worker processes consume jobs from the queue
- **Incremental Sync**: Tracks last sync time to avoid duplicate processing
- **Memory Integration**: Sends fetched data to memory-engine for storage and embedding

## Architecture

```
ingestion-service/
├── src/
│   ├── providers/
│   │   ├── gmail/          # Gmail provider implementation
│   │   └── base/           # Base provider interface
│   ├── services/
│   │   ├── token.service.ts      # OAuth token management
│   │   └── memory-client.service.ts  # Memory engine API client
│   ├── scheduler/          # Cron jobs that enqueue to Redis
│   └── worker.ts           # Worker that processes jobs from queue
```

## Setup

1. Install dependencies:
```bash
bun install
```

2. Ensure Redis is running (via docker-compose):
```bash
docker-compose up redis
```

3. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

4. Ensure you have:
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (same as server app)
   - `DATABASE_URL` (shared database)
   - `REDIS_URL` (default: `redis://localhost:6379`)
   - `MEMORY_ENGINE_URL` (memory-engine service URL)

## Running

```bash
bun run dev
```

The service will:
- Start cron scheduler that enqueues jobs to Redis every 15 minutes
- Start worker process that consumes and processes jobs from Redis queue

## How It Works

1. **Scheduler**: Runs every 15 minutes, finds all users with Google accounts, and enqueues `gmail:fetch` jobs to Redis
2. **Worker**: Continuously polls Redis queue, processes jobs, and acknowledges completion
3. **Provider**: Executes the actual Gmail API calls and sends data to memory-engine

## Queue System

Jobs are enqueued to Redis Stream `ingestion:jobs` with:
- `type`: Job type (e.g., `gmail:fetch`)
- `payload`: Job data (userId, options, etc.)

Workers consume from consumer group `ingestion-workers` for distributed processing.

## Adding New Providers

1. Create provider directory under `src/providers/`
2. Implement `DataProvider` interface from `base/types.ts`
3. Add scheduler job in `scheduler/cron.jobs.ts` that enqueues jobs
4. Add job type handler in `worker.ts`
