# AI Service

A worker service that processes memory enrichment and suggestion execution using AI agents. It consumes jobs from Redis queues and applies various AI agents to enrich memories and execute user suggestions.

## Overview

The AI service is a background worker that processes two types of jobs:
1. **Memory Enrichment**: Applies AI agents to extract structured information from memories
2. **Suggestion Execution**: Executes user-requested actions based on notification suggestions

## Features

- **Memory Enrichment**: Processes memories through multiple AI agents:
  - **Action Item Agent**: Extracts actionable tasks from memories
  - **Deadline Agent**: Identifies and tracks deadlines
  - **Finance Agent**: Extracts financial information and transactions
  - **Notification Agent**: Generates intelligent notifications
  - **Suggestion Agent**: Creates contextual suggestions

- **Suggestion Execution**: Executes user-requested actions from notification suggestions

- **Queue-Based Processing**: Uses Redis Streams for reliable job processing
- **Retry Logic**: Automatic retry with exponential backoff (max 3 retries)
- **Distributed Processing**: Consumer groups for horizontal scaling

## Architecture

```
ai-service/
├── src/
│   ├── index.ts                    # Service entry point
│   ├── worker.ts                   # Queue worker implementation
│   ├── agents/
│   │   ├── base.agent.ts           # Base agent class
│   │   ├── action-item.agent.ts    # Action item extraction
│   │   ├── deadline.agent.ts       # Deadline detection
│   │   ├── finance.agent.ts        # Financial data extraction
│   │   ├── notification.agent.ts  # Notification generation
│   │   └── suggestion.agent.ts     # Suggestion generation
│   ├── services/
│   │   ├── enrichment.service.ts   # Memory enrichment orchestration
│   │   ├── memory-client.service.ts # Memory engine API client
│   │   ├── notification.service.ts  # Notification service client
│   │   └── suggestion-execution.service.ts # Suggestion execution logic
│   └── config/
│       └── env.ts                  # Environment validation
```

## How It Works

### Memory Enrichment Flow

1. **Job Consumption**: Worker dequeues `memory:enrich` jobs from `memory:enrichment` queue
2. **Agent Processing**: Each agent processes the memory:
   - Action Item Agent extracts tasks
   - Deadline Agent identifies deadlines
   - Finance Agent extracts financial data
   - Notification Agent generates notifications
   - Suggestion Agent creates suggestions
3. **Data Storage**: Enriched data is stored back to the database
4. **Notification Creation**: New notifications are created based on agent outputs
5. **Acknowledgment**: Job is acknowledged after successful processing

### Suggestion Execution Flow

1. **Job Consumption**: Worker dequeues `suggestion:execute` jobs from `ai:jobs` queue
2. **Validation**: Validates notification and suggestion IDs
3. **Execution**: Executes the suggestion action (e.g., creating calendar events, sending emails)
4. **Status Update**: Updates notification and suggestion status
5. **Acknowledgment**: Job is acknowledged after successful execution

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/omni_db"

# Redis
REDIS_URL="redis://localhost:6379"

# Memory Engine API
MEMORY_ENGINE_URL="http://localhost:8001"

# Google Gemini API (for AI agents)
GEMINI_API_KEY="your-gemini-api-key"
```

## Setup

1. **Install dependencies** (from root):
   ```bash
   bun install
   ```

2. **Configure environment variables**:
   Create `.env` file in `apps/ai-service/` with required variables (see above).

3. **Ensure dependencies are running**:
   - PostgreSQL database (shared with other services)
   - Redis (for job queues)
   - Memory Engine service (for memory retrieval)

## Running

### Development
```bash
# From root directory
bun run dev

# Or from service directory
cd apps/ai-service
bun run dev
```

The worker will start processing jobs from Redis queues.

### Production
```bash
# Build first
bun run build

# Then run the built application
bun run apps/ai-service/dist/index.js
```

## Queue System

### Memory Enrichment Queue
- **Queue Name**: `memory:enrichment`
- **Consumer Group**: `ai-workers`
- **Job Type**: `memory:enrich`
- **Payload**:
  ```typescript
  {
    memoryId: number;
    userId: number;
  }
  ```

### AI Jobs Queue
- **Queue Name**: `ai:jobs`
- **Consumer Group**: `ai-workers`
- **Job Type**: `suggestion:execute`
- **Payload**:
  ```typescript
  {
    notificationId: string;
    suggestionId: string;
    userId: number;
  }
  ```

## AI Agents

### Action Item Agent
Extracts actionable tasks from memories. Identifies:
- Task descriptions
- Assignees
- Priority levels
- Due dates

### Deadline Agent
Detects and tracks deadlines:
- Event dates
- Due dates
- Reminder dates
- Recurring deadlines

### Finance Agent
Extracts financial information:
- Transaction amounts
- Categories
- Dates
- Payment methods
- Vendors/merchants

### Notification Agent
Generates intelligent notifications:
- Priority assessment
- Action requirements
- Contextual metadata
- Enrichment data

### Suggestion Agent
Creates contextual suggestions:
- Actionable recommendations
- Quick actions
- Related tasks
- Follow-up items

## Retry Logic

Jobs are automatically retried on failure:
- **Max Retries**: 3 attempts
- **Retry Delay**: 5 seconds between retries
- **Failure Handling**: After max retries, job is acknowledged and removed from queue

## Scaling

The service supports horizontal scaling:
- Multiple worker instances can run simultaneously
- Each worker uses a unique consumer name (`ai-worker-${process.pid}`)
- Redis Streams consumer groups ensure each job is processed only once
- Workers automatically balance load

## Monitoring

The service logs:
- Job processing start/completion
- Agent execution results
- Errors and retries
- Queue statistics

## Dependencies

- **LangChain**: AI framework for agent orchestration
- **Google Gemini**: LLM for agent processing
- **Prisma**: Database access (via `@repo/database`)
- **Redis**: Job queue (via `@repo/redis`)
- **Zod**: Schema validation

## Related Services

- **Memory Engine**: Source of memories to enrich
- **Server**: Receives enrichment results and creates notifications
- **Ingestion Service**: Provides source data that becomes memories
