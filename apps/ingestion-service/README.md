# Ingestion Service

A service for fetching and ingesting data from external sources (Gmail, GitHub, Calendar, Twitter) into the memory engine using Redis Streams for job queueing and scheduled synchronization.

## Overview

The ingestion service is responsible for:
- Fetching data from multiple external sources via OAuth
- Transforming source data into memory format
- Sending data to the memory engine for storage and embedding
- Managing OAuth token refresh automatically
- Scheduling periodic sync jobs

## Features

- **Multi-Source Integration**:
  - **Gmail**: Email ingestion via Google OAuth API
  - **GitHub**: Repository activity, commits, issues, pull requests
  - **Calendar**: Google Calendar event synchronization
  - **Twitter**: Social media data ingestion

- **Scheduled Synchronization**: Cron-based jobs that enqueue sync tasks
- **Queue-Based Processing**: Redis Streams for reliable, scalable job processing
- **Worker Pattern**: Separate worker processes consume jobs from the queue
- **Incremental Sync**: Tracks last sync time to avoid duplicate processing
- **Automatic Token Refresh**: Handles OAuth token expiration and refresh
- **Memory Integration**: Sends fetched data to memory-engine for storage

## Architecture

```
ingestion-service/
├── src/
│   ├── index.ts                    # Service entry point
│   ├── worker.ts                   # Queue worker implementation
│   ├── providers/
│   │   ├── base/
│   │   │   └── types.ts            # Base provider interface
│   │   ├── gmail/                  # Gmail provider
│   │   │   ├── gmail.auth.ts       # OAuth authentication
│   │   │   ├── gmail.client.ts     # Gmail API client
│   │   │   ├── gmail.provider.ts   # Provider implementation
│   │   │   ├── gmail.sync.ts       # Sync state management
│   │   │   └── gmail.transformer.ts # Data transformation
│   │   ├── github/                 # GitHub provider
│   │   ├── calendar/               # Calendar provider
│   │   └── twitter/                # Twitter provider
│   ├── services/
│   │   ├── token.service.ts        # OAuth token management
│   │   ├── memory-client.service.ts # Memory engine API client
│   │   ├── github-token.service.ts  # GitHub token refresh
│   │   └── twitter-token.service.ts  # Twitter token refresh
│   ├── scheduler/
│   │   └── cron.jobs.ts            # Scheduled sync jobs
│   └── config/
│       └── env.ts                  # Environment validation
```

## How It Works

### Sync Flow

1. **Scheduler**: Cron jobs run periodically (default: every 15 minutes)
2. **Job Enqueueing**: Scheduler finds users with connected accounts and enqueues sync jobs
3. **Worker Processing**: Workers consume jobs from Redis queue
4. **Provider Execution**: Provider fetches data from external API
5. **Transformation**: Data is transformed into memory format
6. **Memory Storage**: Transformed data is sent to memory-engine
7. **Sync State Update**: Last sync time is updated to track progress

### OAuth Token Management

- Tokens are stored in the database (via Better Auth)
- Automatic refresh when tokens expire
- Provider-specific refresh logic (Google, GitHub, Twitter)
- Token validation before API calls

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/everything_db"

# Redis
REDIS_URL="redis://localhost:6379"

# Memory Engine API
MEMORY_ENGINE_URL="http://localhost:8001"

# OAuth Providers (same credentials as server)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

## Setup

1. **Install dependencies** (from root):
   ```bash
   bun install
   ```

2. **Configure environment variables**:
   Create `.env` file in `apps/ingestion-service/` with required variables (see above).

3. **Ensure dependencies are running**:
   - PostgreSQL database (shared with other services)
   - Redis (for job queues)
   - Memory Engine service (for storing ingested data)

## Running

### Development
```bash
# From root directory
bun run dev

# Or from service directory
cd apps/ingestion-service
bun run dev
```

The service will:
- Start cron scheduler that enqueues jobs to Redis
- Start worker process that consumes and processes jobs from Redis queue

### Production
```bash
# Build first
bun run build

# Then run the built application
bun run apps/ingestion-service/dist/index.js
```

## Queue System

### Ingestion Jobs Queue
- **Queue Name**: `ingestion:jobs`
- **Consumer Group**: `ingestion-workers`
- **Job Types**:
  - `gmail:fetch` - Fetch Gmail messages
  - `github:fetch` - Fetch GitHub activity
  - `calendar:fetch` - Fetch calendar events
  - `twitter:fetch` - Fetch Twitter data

- **Job Payload**:
  ```typescript
  {
    type: string;        // Job type (e.g., "gmail:fetch")
    payload: {
      userId: string;
      options?: {
        maxResults?: number;
        since?: Date;
        forceFullSync?: boolean;
      };
    };
  }
  ```

## Scheduled Jobs

Cron jobs run periodically to sync data:
- **Gmail Sync**: Every 15 minutes (default)
- **GitHub Sync**: Every 15 minutes (default)
- **Calendar Sync**: Every 15 minutes (default)
- **Twitter Sync**: Every 15 minutes (default)

Schedule can be customized in `scheduler/cron.jobs.ts`.

## Data Providers

### Gmail Provider
- Fetches emails from user's Gmail account
- Supports incremental sync (only new emails)
- Transforms emails into memory format with:
  - Subject, body, sender, recipients
  - Timestamps, labels, attachments
  - Thread information

### GitHub Provider
- Fetches repository activity
- Tracks commits, issues, pull requests
- Transforms into memory format with:
  - Repository, branch, commit info
  - Issue/PR metadata
  - Code changes and diffs

### Calendar Provider
- Syncs Google Calendar events
- Tracks event changes and cancellations
- Transforms into memory format with:
  - Event title, description, location
  - Start/end times, attendees
  - Recurrence rules

### Twitter Provider
- Fetches tweets and interactions
- Tracks mentions, replies, likes
- Transforms into memory format with:
  - Tweet content, author, timestamp
  - Engagement metrics
  - Media attachments

## Adding New Providers

1. **Create provider directory** under `src/providers/`
   ```bash
   mkdir -p src/providers/newprovider
   ```

2. **Implement DataProvider interface** from `base/types.ts`:
   ```typescript
   export interface DataProvider {
     name: string;
     fetch(userId: string, options?: FetchOptions): Promise<FetchResult>;
     getSyncState(userId: string): Promise<SyncState>;
   }
   ```

3. **Add authentication** (if needed):
   - Create `newprovider.auth.ts` for OAuth setup
   - Implement token refresh logic

4. **Add API client**:
   - Create `newprovider.client.ts` for API calls

5. **Add transformer**:
   - Create `newprovider.transformer.ts` to convert data to memory format

6. **Add sync state management**:
   - Create `newprovider.sync.ts` to track sync state

7. **Add scheduler job** in `scheduler/cron.jobs.ts`:
   ```typescript
   scheduler.addJob('newprovider:sync', '*/15 * * * *', async () => {
     // Enqueue sync jobs
   });
   ```

8. **Add worker handler** in `worker.ts`:
   ```typescript
   case 'newprovider:fetch':
     await newProvider.fetch(userId, options);
     break;
   ```

## Sync State Management

Each provider tracks:
- `lastSyncTime`: Timestamp of last successful sync
- `lastItemId`: ID of last processed item (for pagination)
- `metadata`: Provider-specific metadata (JSON)

Sync state is stored per user per provider to enable incremental syncs.

## Error Handling

- **Token Refresh Failures**: Automatically retries with refreshed token
- **API Rate Limits**: Implements exponential backoff
- **Network Errors**: Retries with configurable delays
- **Job Failures**: Logged and can be retried manually

## Scaling

The service supports horizontal scaling:
- Multiple worker instances can run simultaneously
- Each worker uses a unique consumer name
- Redis Streams consumer groups ensure each job is processed only once
- Workers automatically balance load

## Monitoring

The service logs:
- Sync job start/completion
- Items processed per sync
- API errors and retries
- Token refresh events
- Queue statistics

## Dependencies

- **googleapis**: Google APIs client (Gmail, Calendar)
- **node-cron**: Cron job scheduling
- **Prisma**: Database access (via `@repo/database`)
- **Redis**: Job queue (via `@repo/redis`)
- **Zod**: Schema validation

## Related Services

- **Memory Engine**: Destination for ingested data
- **Server**: Manages OAuth connections and user accounts
- **AI Service**: Processes ingested memories for enrichment
