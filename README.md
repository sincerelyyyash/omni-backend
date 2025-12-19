# Omni Backend

Omni Backend is an intelligent data processing platform that connects to Gmail, GitHub, Calendar, and Twitter to automatically extract actionable insights from your digital life. Powered by advanced AI agents, it transforms emails, code activity, calendar events, and social interactions into structured memories, prioritized notifications, and contextual suggestions—helping you stay organized and never miss what matters.

## Overview

Omni Backend is an AI-driven distributed system that:
- **Ingests** data from multiple external sources (Gmail, GitHub, Calendar, Twitter)
- **Stores** memories with semantic search capabilities using vector embeddings
- **Enriches** data using specialized AI agents that extract structured information, detect patterns, and generate actionable insights
- **Notifies** users about important events, deadlines, and actionable items with intelligent prioritization

## Architecture

The system is built as a Turborepo monorepo with four main services:

```
omni-backend/
├── apps/
│   ├── server/              # Main API server (Auth, Users, Notifications)
│   ├── ingestion-service/  # Data ingestion from external sources
│   ├── memory-engine/       # Semantic memory storage and retrieval
│   └── ai-service/          # AI-powered data enrichment agents
└── packages/
    ├── database/            # Prisma ORM and database schema
    ├── redis/               # Redis client and queue utilities
    └── types/               # Shared TypeScript types
```

### Services

#### Server (`apps/server`)
Main API server providing:
- Authentication and authorization (Better Auth)
- User management
- Notification endpoints
- RESTful API with Express

#### Ingestion Service (`apps/ingestion-service`)
Fetches and syncs data from external sources:
- **Gmail**: Email ingestion via Google OAuth
- **GitHub**: Repository and activity tracking
- **Calendar**: Event synchronization
- **Twitter**: Social media data ingestion
- Scheduled sync jobs using cron
- Redis Streams for job queueing

#### Memory Engine (`apps/memory-engine`)
Semantic memory storage and retrieval:
- Fact-first storage architecture
- Vector embeddings using OpenAI
- Semantic search via Qdrant
- RAG (Retrieval-Augmented Generation) capabilities
- Content deduplication
- PostgreSQL for structured data

#### AI Service (`apps/ai-service`)
AI-powered data enrichment with specialized agents:
- **Action Item Agent**: Extracts actionable tasks with priority and due dates
- **Deadline Agent**: Identifies and tracks time-sensitive deadlines
- **Finance Agent**: Extracts financial transactions and payment information
- **Notification Agent**: Classifies and prioritizes notifications intelligently
- **Suggestion Agent**: Generates contextual, actionable suggestions

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) (v1.2.22+)
- **Monorepo**: [Turborepo](https://turborepo.org)
- **Language**: TypeScript
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io)
- **Vector DB**: [Qdrant](https://qdrant.tech)
- **Cache/Queue**: Redis
- **AI/ML**: 
  - OpenAI (embeddings, fact extraction, RAG)
  - Google Gemini (agent processing)
  - LangChain
- **Auth**: Better Auth
- **API Framework**: Express.js

## Prerequisites

- **Bun** >= 1.2.22 ([Installation Guide](https://bun.sh/docs/installation))
- **PostgreSQL** >= 14
- **Redis** >= 6
- **Qdrant** (local or cloud instance)
- **Node.js** >= 18 (for some tooling)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sincerelyyyash/omni-backend
   cd omni-backend
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Using Docker Compose (if available)
   docker-compose up -d postgres
   
   # Or use your existing PostgreSQL instance
   ```

4. **Set up Redis**
   ```bash
   # Using Docker Compose (if available)
   docker-compose up -d redis
   
   # Or use your existing Redis instance
   ```

5. **Set up Qdrant**
   ```bash
   # Using Docker
   docker run -p 6333:6333 qdrant/qdrant
   
   # Or use Qdrant Cloud
   ```

## Configuration

### Environment Variables

Each service requires its own `.env` file. Copy the example files and configure:

#### Root `.env`
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/omni_db"

# Redis
REDIS_URL="redis://localhost:6379"
```

#### Server (`apps/server/.env`)
```bash
PORT=8000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/omni_db"
REDIS_URL="redis://localhost:6379"

# Auth
AUTH_SECRET="your-secret-key"
AUTH_URL="http://localhost:8000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

#### Memory Engine (`apps/memory-engine/.env`)
```bash
PORT=8001
DATABASE_URL="postgresql://user:password@localhost:5432/omni_db"
REDIS_URL="redis://localhost:6379"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIMENSION=1536
ANSWER_MODEL="gpt-4o-mini"
RERANK_MODEL="gpt-4o-mini"
FACT_MODEL="gpt-4o-mini"
RERANK_ENABLED="true"
RERANK_TOP_K=5

# Qdrant
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""  # Optional
QDRANT_COLLECTION_NAME="memories"
```

#### Ingestion Service (`apps/ingestion-service/.env`)
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/omni_db"
REDIS_URL="redis://localhost:6379"
MEMORY_ENGINE_URL="http://localhost:8001"

# OAuth (same as server)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

#### AI Service (`apps/ai-service/.env`)
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/omni_db"
REDIS_URL="redis://localhost:6379"
MEMORY_ENGINE_URL="http://localhost:8001"

# Google Gemini
GEMINI_API_KEY="your-gemini-api-key"
```

### Database Setup

1. **Generate Prisma Client**
   ```bash
   bun run generate
   ```

2. **Run migrations**
   ```bash
   bun run db:migrate:dev
   ```

3. **Seed database (optional)**
   ```bash
   bun run db:seed
   ```

## Running the Project

### Development Mode

Run all services in development mode:
```bash
bun run dev
```

This starts all services concurrently using Turborepo.

### Individual Services

Run services individually:

```bash
# Server
cd apps/server
bun run dev

# Memory Engine
cd apps/memory-engine
bun run dev

# Ingestion Service
cd apps/ingestion-service
bun run dev

# AI Service
cd apps/ai-service
bun run dev
```

### Production Build

Build all services:
```bash
bun run build
```

## Project Structure

```
omni-backend/
├── apps/
│   ├── server/                    # Main API server
│   │   ├── src/
│   │   │   ├── controllers/      # Request handlers
│   │   │   ├── routes/            # API routes
│   │   │   ├── middleware/        # Express middleware
│   │   │   ├── services/          # Business logic
│   │   │   └── auth.ts            # Better Auth configuration
│   │   └── package.json
│   │
│   ├── ingestion-service/         # Data ingestion
│   │   ├── src/
│   │   │   ├── providers/         # External source providers
│   │   │   │   ├── gmail/
│   │   │   │   ├── github/
│   │   │   │   ├── calendar/
│   │   │   │   └── twitter/
│   │   │   ├── scheduler/         # Cron jobs
│   │   │   └── worker.ts          # Queue worker
│   │   └── package.json
│   │
│   ├── memory-engine/              # Memory storage
│   │   ├── src/
│   │   │   ├── controllers/       # API controllers
│   │   │   ├── routes/            # API routes
│   │   │   ├── services/
│   │   │   │   ├── memory/        # Core memory logic
│   │   │   │   ├── embedding/     # Embedding generation
│   │   │   │   ├── extraction/    # Fact extraction
│   │   │   │   └── vector/        # Qdrant integration
│   │   │   └── config/            # Prompts and config
│   │   └── package.json
│   │
│   └── ai-service/                 # AI agents
│       ├── src/
│       │   ├── agents/             # AI agent implementations
│       │   ├── services/           # Agent services
│       │   └── worker.ts           # Queue worker
│       └── package.json
│
├── packages/
│   ├── database/                   # Prisma schema and client
│   │   ├── prisma/
│   │   │   └── schema.prisma       # Database schema
│   │   └── src/
│   │       └── client.ts           # Prisma client export
│   │
│   ├── redis/                      # Redis utilities
│   │   └── src/
│   │       ├── client.ts           # Redis client
│   │       └── queue.ts            # Queue implementation
│   │
│   ├── types/                      # Shared TypeScript types
│   │   ├── memory/
│   │   ├── notification/
│   │   └── user/
│   │
│   ├── config-eslint/              # ESLint configuration
│   └── config-typescript/          # TypeScript configuration
│
├── package.json                    # Root package.json
├── turbo.json                      # Turborepo configuration
└── README.md                       # This file
```

## Key Features

### Data Ingestion
- Multi-source data synchronization (Gmail, GitHub, Calendar, Twitter)
- OAuth token management with automatic refresh
- Incremental sync to avoid duplicate processing
- Scheduled background jobs

### Semantic Memory
- Fact-first storage architecture
- Vector embeddings for semantic search
- Content deduplication
- RAG (Retrieval-Augmented Generation) for Q&A
- Configurable embedding and reranking models

### AI Agents & Enrichment

Omni Backend features a sophisticated AI agent system that processes every memory through specialized agents:

#### Action Item Agent
Extracts actionable tasks from emails, messages, and documents:
- Identifies action verbs (review, approve, complete, follow-up, respond)
- Extracts task descriptions and context
- Assigns priority levels (high, medium, low) based on urgency
- Detects and extracts due dates when mentioned
- Handles direct requests and implicit tasks

**Example**: From an email "Please review the PR by Friday" → Extracts: {text: "Review PR", verb: "review", priority: "high", dueDate: "2024-01-05"}

#### Deadline Agent
Detects and tracks time-sensitive items and deadlines:
- Identifies explicit deadlines ("due by", "deadline", "before")
- Extracts dates from natural language
- Calculates urgency based on proximity (high: <24h, medium: <7d, low: >7d)
- Tracks meeting dates, payment due dates, submission deadlines
- Monitors time-sensitive items across all sources

**Example**: From a calendar event "Project submission due Jan 10" → Extracts: {text: "Project submission", dueDate: "2024-01-10", urgency: "medium"}

#### Finance Agent
Extracts comprehensive financial information from receipts, bills, and transactions:
- **Amount & Currency**: Detects amounts with currency inference (₹, $, €, INR, USD, etc.)
- **Merchant/Vendor**: Identifies service providers and merchants
- **Transaction Details**: Extracts transaction IDs, payment methods, bank information
- **Payment Methods**: Recognizes cards, UPI (PhonePe, Google Pay, Paytm), NEFT, RTGS, IMPS, bank transfers
- **Categories**: Classifies expenses (food, travel, utilities, shopping, entertainment, healthcare)
- **Due Dates**: Tracks bill due dates and subscription renewals
- **Account Info**: Extracts last 4 digits of cards/accounts when mentioned

**Example**: From an email receipt "Paid ₹1,500 via UPI to Swiggy" → Extracts: {amount: 1500, currency: "INR", merchant: "Swiggy", type: "receipt", paymentMethod: "UPI", category: "food"}

#### Notification Agent
Intelligently classifies and prioritizes notifications:
- **Type Classification**: Categorizes as email, PR review, mention, meeting, bill, action-item, etc.
- **Priority Assessment**: Determines priority (high/medium/low) based on:
  - Content urgency and importance
  - Source credibility
  - Time sensitivity
  - User interaction patterns
- **Action Detection**: Identifies if notification requires user action
- **Action Type**: Specifies required action (review, reply, pay, attend, complete)
- **Due Date Extraction**: Captures deadlines and time-sensitive information

**Example**: From a GitHub notification "PR #123 needs your review" → Classifies: {type: "pr-review", priority: "high", requiresAction: true, actionType: "review"}

#### Suggestion Agent
Generates contextual, actionable suggestions based on notification content:
- **Context-Aware Suggestions**: Creates relevant suggestions based on notification type and content
- **Actionable Recommendations**: Provides specific actions users can take
- **Priority-Based**: Suggests high-priority actions first
- **Rich Context**: Includes relevant metadata (person names, dates, participants)

**Examples**:
- Calendar birthday event → "Would you like me to suggest birthday gift ideas for [person]?"
- Meeting with participants → "Would you like a summary of emails between you and [participants]?"
- PR review needed → "Would you like a review checklist for this PR?"
- Bill due soon → "Would you like me to set a payment reminder?"

All agents use Google Gemini for processing and return structured, validated data using Zod schemas.

#### How AI Agents Work Together

1. **Memory Ingestion**: Data from external sources (Gmail, GitHub, Calendar, Twitter) is ingested and stored as memories
2. **Agent Processing**: Each memory is processed through all relevant AI agents in parallel:
   - Action Item Agent extracts tasks
   - Deadline Agent identifies time-sensitive items
   - Finance Agent extracts financial data
   - Notification Agent classifies and prioritizes
   - Suggestion Agent generates actionable suggestions
3. **Data Enrichment**: Extracted data is stored in the memory's `attribute` field as structured JSON
4. **Notification Creation**: Based on agent outputs, intelligent notifications are created with:
   - Priority levels
   - Action requirements
   - Due dates
   - Contextual suggestions
5. **User Insights**: Users receive prioritized, actionable notifications with suggestions they can execute

### Notifications
- Priority-based notification system
- Actionable notifications with URLs
- Rich metadata and enrichment data
- Status tracking (read/unread)

## API Endpoints

### Server API (`http://localhost:8000`)
- `GET /health` - Health check
- `POST /api/auth/*` - Authentication endpoints (Better Auth)
- `GET /api/v1/users/*` - User management
- `GET /api/v1/notifications/*` - Notification endpoints

### Memory Engine API (`http://localhost:8001`)
- `POST /api/memory` - Create a memory
- `PUT /api/memory` - Update memory
- `DELETE /api/memory` - Delete memory
- `GET /api/memory` - Get memory by ID
- `GET /api/memory/user` - List user memories
- `POST /api/memories` - Batch ingest
- `POST /api/memories/search` - Semantic search
- `POST /api/memories/answer` - RAG Q&A
- `POST /api/memories/ask` - Ask with query

## Database Schema

The system uses PostgreSQL with the following main models:
- **User**: User accounts and authentication
- **Account**: OAuth account connections
- **Session**: User sessions
- **Memory**: Stored memories with metadata
- **Notification**: User notifications

See `packages/database/prisma/schema.prisma` for the complete schema.

## Support

For issues, questions, or contributions, please open an issue on the [repository](https://github.com/sincerelyyyash/omni-backend).
