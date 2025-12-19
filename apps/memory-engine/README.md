# Memory Engine

A TypeScript/Bun service that ingests, stores, and retrieves "memories" (text snippets and extracted facts) with semantic search and retrieval-augmented generation (RAG). Uses Express for the API, Prisma/PostgreSQL for structured storage, Qdrant for vector search, and OpenAI for embeddings, fact extraction, reranking, and answer generation.

## Overview

The Memory Engine is the core storage and retrieval system for the Omni Backend. It provides:
- Semantic memory storage with vector embeddings
- Fact-first architecture for richer recall
- RAG (Retrieval-Augmented Generation) capabilities
- Content deduplication
- Multi-tenant support with user scoping

## Features

- **REST API**: Full CRUD operations for memories
- **Fact-First Storage**: Extracts atomic facts before embedding for richer recall
- **Semantic Search**: Vector similarity search via Qdrant with scoped filters
- **RAG Q&A**: Retrieves memories, optionally reranks, then generates answers with LLMs
- **Deduplication**: Normalized content hashing to prevent duplicates
- **Validation**: Zod schemas on all inputs
- **Configurable Models**: Customizable models for embedding, rerank, fact extraction, and answer generation

## Architecture

```
memory-engine/
├── src/
│   ├── index.ts                    # Express app bootstrap
│   ├── routes/
│   │   └── memory.routes.ts        # Route definitions
│   ├── controllers/
│   │   └── memory.controller.ts   # HTTP handlers + validation
│   ├── services/
│   │   ├── memory/
│   │   │   └── memory.service.ts  # Core domain logic
│   │   ├── extraction/
│   │   │   └── factExtraction.service.ts # Fact extraction (OpenAI)
│   │   ├── embedding/
│   │   │   ├── embedding.service.ts # Embeddings + Qdrant I/O
│   │   │   └── openai.ts           # OpenAI client wrapper
│   │   └── vector/
│   │       └── qdrant.ts           # Qdrant client wrapper
│   ├── config/
│   │   └── prompts.ts              # Prompt templates for RAG flows
│   └── utils/
│       └── hash.ts                 # Normalization and content hashing
```

### Data Flow

- **API Layer**: Express routes under `/api` with controllers handling validation and responses
- **Services**:
  - **Memory Service**: Core orchestration (create, batch ingest, search, ask/answer, dedupe)
  - **Fact Extraction Service**: OpenAI chat completion to produce concise facts
  - **Embedding Service**: Generates embeddings (OpenAI), stores/searches vectors in Qdrant
  - **Rerank & Answer**: Optional reranking plus answer generation via OpenAI chat
- **Data Stores**:
  - **PostgreSQL (Prisma)**: Memory metadata (source, tags, categories, attributes, summary, contentHash)
  - **Qdrant**: Embeddings with payload metadata for filtered search
- **Utilities**: Hashing for deduplication, prompt templates for RAG flows

## API Endpoints

Base path: `/api`

### Memory Operations
- `POST /memory` - Create a memory (fact extraction + embeddings)
- `PUT /memory` - Update memory metadata/content (does not currently re-embed)
- `DELETE /memory` - Delete a memory (controller does not delete vector; use Embedding Service if needed)
- `GET /memory` - Get memory by id
- `GET /memory/user` - List memories for a user

### Batch Operations
- `POST /memories` - Batch ingest messages; defaults to fact extraction unless `infer=false`

### Search & RAG
- `POST /memories/search` - Semantic search with filters (`userId`/`agentId`/`runId`, limit, scoreThreshold)
- `POST /memories/answer` - Ask with optional query override; returns answer + source memories
- `POST /memories/ask` - Similar to answer; returns answer, memories, count, models

Request/response schemas are enforced via Zod in `packages/types/memory/memory.types.ts`.

## Data Model

### Memory Fields
- `id`: Auto-increment primary key
- `userId`: User identifier (scoped)
- `agentId`: Optional agent identifier
- `runId`: Optional run identifier
- `role`: Optional role (e.g., "user", "assistant")
- `source`: Source of the memory (e.g., "gmail", "github")
- `sourceId`: Unique identifier from source
- `timestamp`: Original timestamp of the content
- `contentUrl`: URL to original content (if available)
- `title`: Memory title
- `origin`: Origin identifier
- `tags`: Array of tags
- `category`: Array of categories
- `attribute`: JSON object for additional attributes
- `summary`: Generated summary
- `type`: Memory type
- `importance`: Importance score (0-1)
- `confidence`: Confidence score (0-1)
- `embeddingRef`: Reference to embedding in Qdrant
- `contentHash`: Unique hash for deduplication
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Indexes
- `contentHash` (unique)
- `userId + contentHash`
- `userId + agentId + runId`

## Key Flows

### Create Memory
1. Controller validates input
2. Memory Service dedupes by hash
3. Save row to PostgreSQL
4. Extract facts using OpenAI
5. Embed each fact
6. Store vectors in Qdrant
7. Update memory summary/embeddingRef
8. Return created memory

### Batch Ingest
1. Iterate through messages
2. If `infer=true`: Follow Create flow per message
3. If `infer=false`: Store full-content embedding once
4. Return batch results

### Semantic Search
1. Generate query embedding using OpenAI
2. Qdrant search with filters (userId, agentId, runId)
3. Return scored payloads with metadata

### Ask/Answer (RAG)
1. Perform semantic search
2. Optionally rerank via LLM scores
3. Format memories for context
4. Generate answer via LLM with context
5. Return answer + source memories

## Environment Variables

```bash
PORT=8001

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/omni_db"

# Redis (optional, for caching)
REDIS_URL="redis://localhost:6379"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"
EMBEDDING_MODEL="text-embedding-3-small"  # or "text-embedding-3-large"
EMBEDDING_DIMENSION=1536  # Must match Qdrant collection dimension
ANSWER_MODEL="gpt-4o-mini"
RERANK_MODEL="gpt-4o-mini"
FACT_MODEL="gpt-4o-mini"
RERANK_ENABLED="true"
RERANK_TOP_K=5

# Qdrant
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""  # Optional, for Qdrant Cloud
QDRANT_COLLECTION_NAME="memories"  # or COLLECTION_NAME

# Environment
NODE_ENV="development"  # Controls Prisma logging
```

## Setup

1. **Install dependencies** (from root):
   ```bash
   bun install
   ```

2. **Configure environment variables**:
   Create `.env` file in `apps/memory-engine/` with required variables (see above).

3. **Set up PostgreSQL**:
   Ensure database is running and accessible via `DATABASE_URL`.

4. **Set up Qdrant**:
   ```bash
   # Using Docker
   docker run -p 6333:6333 qdrant/qdrant
   
   # Or use Qdrant Cloud
   ```

5. **Generate Prisma Client**:
   ```bash
   bun run generate
   ```

6. **Run migrations**:
   ```bash
   bun run db:migrate:dev
   ```

## Running

### Development
```bash
# From root directory
bun run dev

# Or from service directory
cd apps/memory-engine
bun run dev
```

The server listens on `PORT` (default: 8001) and exposes `/api/...` routes.

### Production
```bash
# Build first
bun run build

# Then run the built application
bun run apps/memory-engine/dist/index.js
```

## Operational Notes

### Deduplication
- Deduplication is per `userId` (and agent/run attributes) using `contentHash`
- Content is normalized before hashing (whitespace, case, etc.)
- Duplicate content for the same user is rejected

### Fact Extraction
- Fact extraction is mandatory in the create flow
- If no facts are extracted, the memory is stored without embeddings
- Facts are atomic, concise statements extracted from content

### Embeddings
- Each fact is embedded separately for richer recall
- Embedding updates on memory updates are not automatic in current controllers
- Embeddings are stored in Qdrant with payload metadata

### Qdrant Collection
- Collection is auto-created on first use
- Uses cosine distance metric
- Dimension must match `EMBEDDING_DIMENSION` environment variable
- Payload includes: `memoryId`, `userId`, `agentId`, `runId`, `fact`, `source`

### Reranking
- Rerank is optional and can be toggled per request or via env defaults
- Uses LLM to score and rerank search results
- Top K results after rerank are used for answer generation

## Performance Considerations

- **Batch Operations**: Use `/memories` endpoint for bulk ingestion
- **Search Filters**: Always include `userId` filter for performance
- **Embedding Dimension**: Smaller dimensions (1536) are faster but less accurate
- **Reranking**: Disable for faster responses if not needed
- **Qdrant**: Use local instance for development, Qdrant Cloud for production

## Dependencies

- **Express**: Web framework
- **OpenAI**: Embeddings, fact extraction, reranking, answer generation
- **Qdrant**: Vector database
- **Prisma**: Database ORM (via `@repo/database`)
- **Redis**: Optional caching (via `@repo/redis`)
- **Zod**: Schema validation

## Related Services

- **Ingestion Service**: Provides source data that becomes memories
- **AI Service**: Enriches memories after creation
- **Server**: Queries memories for notifications and user data
