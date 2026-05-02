# MindForge — Personal Second Brain AI

## Overview

Full-stack personal knowledge base app with adaptive RAG. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24 | **TypeScript**: 5.9 | **Package manager**: pnpm
- **Frontend**: React + Vite (Tailwind v4, dark glassmorphism UI) — `artifacts/mindforge` → path `/`
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL — `artifacts/api-server` → path `/api`
- **LLM**: Groq (llama-3.3-70b-versatile) — requires `GROQ_API_KEY` env var
- **Retrieval**: In-memory BM25 chunk store (re-indexed from DB on boot)
- **Web search**: Tavily — optional `TAVILY_API_KEY` env var
- **API codegen**: Orval (contract-first OpenAPI → React Query hooks + Zod schemas)

## Architecture

```
artifacts/
  api-server/         # Express backend (routes, BM25 vector store, Groq, PDF parser)
    src/
      routes/         # documents, chat, tools, eval, stats
      lib/            # chunker, vectorStore (BM25), groq.ts, github.ts, pdfParser.ts, evalStore.ts
      db/             # Drizzle schema (documents, chat_sessions, chat_messages, activity)
  mindforge/          # React+Vite frontend
    src/
      pages/          # Home (workspace), Documents, Eval, Settings
      components/
        layout/       # AppLayout (sidebar with sessions)
        ChatArea      # Chat interface with source citations
        DocumentSidebar # Left panel with doc list, stats, activity
        UploadModal   # Text / GitHub ingestion UI
        ToolResultModal # Summarize / Action Items / Flashcards / MindMap

lib/
  api-spec/           # OpenAPI spec (source of truth)
  api-client-react/   # Generated React Query hooks
  api-zod/            # Generated Zod schemas
  db/                 # Drizzle DB client + schema
```

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI
- `pnpm --filter @workspace/db run push` — push DB schema (dev only)

## Important Notes

- **BM25 store is in-memory**: chunks are loaded from DB on server start — documents indexed in DB are always available
- **Codegen script** in `lib/api-spec/package.json` patches `lib/api-zod/src/index.ts` after orval runs — do not change this
- **Tailwind v4**: no `@apply dark` — use `document.documentElement.classList.add("dark")` in main.tsx instead
- `useGetChatSession(id, { query: options })` — standard orval hook signature
- `useSendMessage().mutateAsync({ id, data: { content } })` — matches OpenAPI

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `SESSION_SECRET` | Yes | Express session |
| `GROQ_API_KEY` | **Yes for AI** | Groq LLM inference |
| `TAVILY_API_KEY` | No | Web search fallback |

## Sample Data

4 seeded documents: RAG intro, BM25 algorithm, LLaMA 3.3, Personal Knowledge Management.
