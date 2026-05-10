# yukara — Personal Knowledge AI

## Overview

Full-stack personal knowledge base app with adaptive RAG, AI agent traces, knowledge graph, and document sharing. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24 | **TypeScript**: 5.9 | **Package manager**: pnpm
- **Frontend**: React + Vite (Tailwind v4, dark/light glassmorphism UI) — `artifacts/mindforge` → landing path `/`, workspace path `/workspace`
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL — `artifacts/api-server` → path `/api`
- **Auth**: Replit OIDC (openid-client) — `lib/replit-auth-web` hook, cookie session stored in DB
- **LLM**: Groq (llama-3.3-70b-versatile) — requires `GROQ_API_KEY` env var
- **Retrieval**: In-memory BM25 chunk store (re-indexed from DB on boot) + LLM query expansion + position-based re-ranking
- **Web search**: Tavily — optional `TAVILY_API_KEY` env var
- **API codegen**: Orval (contract-first OpenAPI → React Query hooks + Zod schemas)

## Architecture

```
artifacts/
  api-server/         # Express backend
    src/
      routes/         # documents, chat, tools, eval, stats, auth, collections, knowledge, agent
      lib/            # chunker, vectorStore (BM25), groq.ts (expandQuery), github.ts, pdfParser.ts, auth.ts
      middlewares/    # authMiddleware.ts (OIDC session loading)
  mindforge/          # React+Vite frontend
    src/
      pages/          # Home, Documents, Flashcards, Eval, Settings, Trash,
                      # KnowledgeGraph, Agent, SharedDocument
      components/
        layout/       # AppLayout (sidebar + user + theme toggle + shortcuts)
        ChatArea, DocumentSidebar, UploadModal, ToolResultModal, CommandPalette,
        QuickNoteModal, DocumentReader, ShortcutsModal
      hooks/          # useTheme.ts (dark/light localStorage toggle), usePreferences.ts (localStorage: topK, webSearch, cardsPerDeck, compactView)

lib/
  api-spec/           # OpenAPI spec (source of truth)
  api-client-react/   # Generated React Query hooks
  api-zod/            # Generated Zod schemas
  db/                 # Drizzle DB client + schema (documents, chat, activity, flashcards[+srData/streak/lastReviewedAt], auth/sessions, users, collections)
  replit-auth-web/    # useAuth() React hook for Replit OIDC
```

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI
- `psql "$DATABASE_URL" -f migration.sql` — apply DB migrations (drizzle-kit push is interactive; use psql directly)

## Important Notes

- **BM25 store is in-memory**: chunks are loaded from DB on server start
- **Query expansion**: `expandQuery()` in `groq.ts` uses Groq to expand user queries for better BM25 recall; wired into `chat.ts` `buildChatContext`
- **Codegen script** in `lib/api-spec/package.json` patches `lib/api-zod/src/index.ts` after orval runs — do not change
- **Tailwind v4**: no `@apply dark` — use `document.documentElement.classList.add("dark")` in `main.tsx` instead
- **Theme**: stored in `localStorage` key `yukara-theme` (dark/light, with legacy migration); initialized in `main.tsx`; `useTheme` hook in `artifacts/mindforge/src/hooks/useTheme.ts`
- **Zod in api-server**: use `import { z } from "zod"` (NOT `"zod/v4"` — esbuild can't resolve it)
- **Soft delete**: deleting a document sets `deletedAt`, moves it to Trash; `/documents/trash` lists them; restore via PATCH `/documents/:id/restore`; permanent delete via DELETE `/documents/:id/permanent`
- **Pin**: PATCH `/documents/:id/pin` toggles pinned boolean; pinned docs appear first in Library
- **Auth session**: cookie name `sid`, stored in `sessions` PostgreSQL table, 7-day TTL
- **DB migrations**: `drizzle-kit push` is interactive; use `psql "$DATABASE_URL"` to run migrations directly when non-interactive execution is needed

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `GROQ_API_KEY` | **Yes for AI** | Groq LLM inference |
| `TAVILY_API_KEY` | No | Web search fallback |
| `REPL_ID` | Yes (auto-set) | OIDC client ID for Replit Auth |
| `ISSUER_URL` | No | OIDC issuer (default: https://replit.com/oidc) |

## Features Completed

### Phase 1–4 (Core)
- Document ingestion (PDF/MD/URL/GitHub), BM25 RAG, streaming chat, AI tools (summarize/actions/flashcards/mindmap), Mermaid rendering, Cmd+K palette, export suite, DocumentReader modal, QuickNote (⌘N)

### Phase 5 (Auth + Polish)
- Replit Auth (OIDC login/logout in sidebar), pinned documents, soft delete + Trash page, full data export bundle

### Phase 6 (Collections / Folders)
- `collections` DB table; CRUD API (`GET/POST /collections`, `PATCH/DELETE /collections/:id`)
- `collectionId` + `shareToken` columns added to `documents` table
- Filter `/documents?collectionId=N` on backend

### Phase 7 (Improved Retrieval)
- `expandQuery()` in `groq.ts` uses LLM to generate alternative phrasings before BM25 search
- Wired into `buildChatContext` in `chat.ts`

### Phase 8 (Knowledge Graph)
- `POST /api/knowledge-graph` — extracts entities + Mermaid graph via Groq from selected documents
- `/knowledge-graph` frontend page: document multi-select, focus query, Mermaid visualization, entity list tab

### Phase 10 (Document Sharing)
- `POST /documents/:id/share` → generates random share token
- `DELETE /documents/:id/share` → revokes token
- `GET /share/:token` → public document view (no auth)
- Share button on document cards with modal showing copy-able link
- `/share/:token` frontend page (`SharedDocument.tsx`) — public, no auth required

### Phase 11 (AI Agent)
- `GET /api/agent/run?content=...` — SSE endpoint streaming multi-step trace: plan → retrieve → websearch → reason → answer
- `/agent` frontend page: collapsible step cards with status icons, source attribution, example prompts

### Phase 12 (AI Enhancements + UX Polish)
- **groq.ts**: `extractTags(title, content)` — LLM extracts 3-7 tags; `generateSummary(title, content)` — concise 2-4 sentence overview
- **Document endpoints**: `POST /documents/:id/summarize`, `GET /documents/:id/related` (BM25 similarity), `POST /documents/:id/auto-tag` (LLM tags saved back to doc)
- **DocumentReader**: "✨ Summary" tab (lazy-loads AI summary, regenerate button), "🔗 Related" tab (similarity-ranked list, click to open), "AI Auto-tag" button in Details tab
- **Query analytics**: in-memory ring buffer (`trackQuery()`) called on every chat + agent query; `GET /stats/queries` endpoint; analytics widget in Settings
- **Rate limiting**: `rateLimiter(n, windowMs)` Express middleware (8 req/min on `/agent/run`)
- **LLM model selector**: 4 Groq model options in Settings (radio buttons); stored in `localStorage` via `usePreferences`
- **Collection inline rename**: double-click collection name in sidebar → inline input; pencil icon on hover; PATCH `/collections/:id`
- **Bulk operations**: Select mode gains "Move" (collection picker dropdown) and "Tag" (inline input) toolbar buttons; parallel PATCH calls
- **Agent persistence**: completed runs saved/loaded from `localStorage`; "Clear history" button; "Export trace" → copies full Markdown to clipboard

### Quick Wins
- Dark/light theme toggle (⌘\\ or sidebar button), stored in localStorage
- Keyboard shortcuts modal (`?` key) via `ShortcutsModal.tsx`
- Document copy-to-clipboard button on cards
- Document duplicate button (`POST /documents/:id/duplicate`)
- Bulk select mode in Document Library with batch delete, bulk move, bulk tag
- Knowledge Graph + AI Agent entries in nav sidebar and Cmd+K palette
