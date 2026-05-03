# MindForge — Personal Second Brain AI

## Overview

Full-stack personal knowledge base app with adaptive RAG. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24 | **TypeScript**: 5.9 | **Package manager**: pnpm
- **Frontend**: React + Vite (Tailwind v4, dark glassmorphism UI) — `artifacts/mindforge` → path `/`
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL — `artifacts/api-server` → path `/api`
- **Auth**: Replit OIDC (openid-client) — `lib/replit-auth-web` hook, cookie session stored in DB
- **LLM**: Groq (llama-3.3-70b-versatile) — requires `GROQ_API_KEY` env var
- **Retrieval**: In-memory BM25 chunk store (re-indexed from DB on boot)
- **Web search**: Tavily — optional `TAVILY_API_KEY` env var
- **API codegen**: Orval (contract-first OpenAPI → React Query hooks + Zod schemas)

## Architecture

```
artifacts/
  api-server/         # Express backend
    src/
      routes/         # documents, chat, tools, eval, stats, auth
      lib/            # chunker, vectorStore (BM25), groq.ts, github.ts, pdfParser.ts, auth.ts
      middlewares/    # authMiddleware.ts (OIDC session loading)
  mindforge/          # React+Vite frontend
    src/
      pages/          # Home, Documents (pin/trash), Flashcards, Eval, Settings, Trash
      components/
        layout/       # AppLayout (sidebar + user profile/login)
        ChatArea, DocumentSidebar, UploadModal, ToolResultModal, CommandPalette, QuickNoteModal, DocumentReader

lib/
  api-spec/           # OpenAPI spec (source of truth)
  api-client-react/   # Generated React Query hooks
  api-zod/            # Generated Zod schemas
  db/                 # Drizzle DB client + schema (documents, chat, activity, flashcards, auth/sessions, users)
  replit-auth-web/    # useAuth() React hook for Replit OIDC
```

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI
- `pnpm --filter @workspace/db run push` — push DB schema (dev only)

## Important Notes

- **BM25 store is in-memory**: chunks are loaded from DB on server start
- **Codegen script** in `lib/api-spec/package.json` patches `lib/api-zod/src/index.ts` after orval runs — do not change
- **Tailwind v4**: no `@apply dark` — use `document.documentElement.classList.add("dark")` in main.tsx instead
- **Zod in api-server**: use `import { z } from "zod"` (NOT `"zod/v4"` — esbuild can't resolve it)
- **Soft delete**: deleting a document sets `deletedAt`, moves it to Trash; `/documents/trash` lists them; restore via PATCH `/documents/:id/restore`; permanent delete via DELETE `/documents/:id/permanent`
- **Pin**: PATCH `/documents/:id/pin` toggles pinned boolean; pinned docs appear first in Library
- **Auth session**: cookie name `sid`, stored in `sessions` PostgreSQL table, 7-day TTL

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `GROQ_API_KEY` | **Yes for AI** | Groq LLM inference |
| `TAVILY_API_KEY` | No | Web search fallback |
| `REPL_ID` | Yes (auto-set) | OIDC client ID for Replit Auth |
| `ISSUER_URL` | No | OIDC issuer (default: https://replit.com/oidc) |

## Features Completed

- Phase 1–4: Document ingestion (PDF/MD/URL/GitHub), BM25 RAG, streaming chat, AI tools (summarize/actions/flashcards/mindmap), Mermaid rendering, Cmd+K palette, export suite, DocumentReader modal, QuickNote (⌘N)
- Phase 5: Replit Auth (OIDC login/logout in sidebar), pinned documents (pin toggle in Library), soft delete + Trash page (restore / permanent delete), full data export bundle (Settings → Export all data)
