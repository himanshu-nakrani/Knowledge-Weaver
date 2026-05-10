# yukara — Personal Knowledge AI

yukara is a full-stack personal knowledge base application with AI-powered retrieval, document management, and intelligent chat capabilities.

## Features

- **Document Ingestion**: Upload PDFs, Markdown files, URLs, and GitHub repositories
- **AI-Powered Search**: BM25 chunk store with LLM query expansion for relevant results
- **Streaming Chat**: Conversational interface with AI tools for summarization, flashcards, and mind maps
- **Knowledge Graph**: Entity extraction with Mermaid visualization
- **AI Agent**: Multi-step reasoning with trace visualization
- **Spaced Repetition**: Flashcard system with SR data tracking for effective learning
- **Collections**: Organize documents into folders and collections
- **Document Sharing**: Public share links with token-based access

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS v4, Radix UI, Framer Motion |
| Backend | Express 5, Drizzle ORM, PostgreSQL |
| AI/LLM | Groq SDK (llama-3.3-70b-versatile) |
| Search | BM25 (in-memory) + Tavily (optional web search) |
| Auth | Replit OIDC with cookie sessions |
| API | Contract-first OpenAPI with Orval codegen |

## Project Structure

```
artifacts/
├── api-server/           # Express backend API
├── mindforge/            # React frontend application
└── mockup-sandbox/       # Prototype sandbox

lib/
├── api-spec/             # OpenAPI contract definitions
├── api-client-react/     # Generated React Query hooks
├── api-zod/              # Generated Zod validation schemas
├── db/                   # Drizzle ORM schema & migrations
└── replit-auth-web/      # OIDC authentication hook
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Run type checking across all packages
pnpm typecheck

# Build all packages
pnpm build
```

## Architecture

The project follows a contract-first API design:
1. API specifications are defined in `lib/api-spec/`
2. Client code is auto-generated using Orval
3. Server implements the defined contract

## License

MIT
