# AGENTS.md — Academic Planner (Next.js Rewrite)

## Project Vision

A personal academic planner for Indian MBBS college students that answers one question above all others: **"What do I need to do right now?"** It is calm, fast, minimal, and stays out of your way. Attendance tracking is one feature among equals — not the identity of the app. The app feels like Apple Calendar, Linear, Todoist, Notion, and Raycast had a product designed specifically for academic life. It is explicitly **not** an ERP dashboard or a data-dense admin panel.

## Architecture Summary

```
Tech Stack (current — Next.js rewrite):
  Frontend:  Next.js 14 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui
  State:     Zustand (UI state) + TanStack Query (server state)
  Backend:   Supabase (Postgres, Auth via NextAuth adapter, Storage)
  Auth:      NextAuth.js v5 with Supabase adapter, Magic Link via Resend
  AI:        MCP Server (standalone endpoint at /api/mcp) for Claude/ChatGPT/Cursor
  Animations:motion.dev
  Icons:     lucide-react
  Email:     Resend (magic link emails)
```

## Rules for All Agents Working in This Repo

### 1. Documentation First
- Never modify AGENTS.md, PROJECT_STRUCTURE.md, FEATURES.md, DATABASE.md, UI_UX.md, AI.md, ROADMAP.md, STATE_MANAGEMENT.md, API.md, or COMPONENTS.md without updating cross-references and the CURRENT IMPLEMENTATION STAGE section below.

### 2. No AI Autonomy
- The AI assistant **never** edits, deletes, or writes data automatically via the web app. Every action is previewed to the user for approval.
- AI assistants connecting via MCP can create/read/update/delete tasks and read data per the tool definitions.

### 3. Data Philosophy
- Never store a calculated value. Percentages, aggregates, and derived fields are always computed at query time.
- Attendance is stored as raw records per class instance (Present / Absent / Cancelled / Holiday). Percentage is calculated.
- RLS on every table. The user_id column on every data table enforces row-level security.
- Service role key is used only by the MCP server and admin operations.

### 4. UI Philosophy
- Mobile-first, fully responsive. Every component works on 360px–1920px.
- Generous whitespace, rounded corners, modern typography, no clutter.
- Subject colours are the primary source of visual variety.
- Success/warning/danger colours are used sparingly and only where functionally necessary.
- Error states, loading states, and empty states are designed, not afterthoughts.
- Dark mode by default, light mode toggle available (next-themes).

### 5. Accessibility
- Every interactive element must have visible focus styles.
- Every icon must have an `aria-label` or `aria-hidden="true"`.
- Colour is never the sole indicator of state (add text or icons).
- Forms must have proper `<label>` elements, not placeholders as labels.
- Keyboard navigation must work through every feature.

### 6. Performance
- All data fetching uses TanStack Query with stale times configured per resource type.
- Supabase RLS is the single source of truth for data access.
- Use 'use client' only where needed — prefer server components for data fetching.

### 7. Testing Philosophy
- Unit tests for stores, utilities, hooks.
- Integration tests for data flow.
- Tests live next to the file they test (`file.test.ts`).

### 8. How to Add a New Feature
1. Update FEATURES.md with the feature's full description.
2. Update PROJECT_STRUCTURE.md to add any new files.
3. Update DATABASE.md if the data model changes.
4. Create the feature in `src/features/<feature>/` with its own page component.
5. Add a route in `src/app/(dashboard)/<feature>/page.tsx` that re-exports the feature page.
6. Add the link to `src/components/layout/app-shell.tsx`.
7. Update CURRENT IMPLEMENTATION STAGE below when done.

### 9. AI / MCP Integration Rules
- MCP server lives at `src/app/api/mcp/route.ts`.
- Tool definitions are in `src/lib/mcp/tools.ts`.
- AI can create, read, update, and delete tasks. AI-created tasks have `source: 'ai'`.
- AI can read subjects, timetable, attendance stats, and analytics.
- All MCP operations are scoped to the authenticated user via NextAuth session.
- MCP auth uses the NextAuth session cookie (same-site, httpOnly).

## Coding Standards

### Naming Conventions
| Thing | Convention | Example |
|-------|-----------|---------|
| Components | PascalCase | `SubjectsPage`, `AppShell` |
| Functions | camelCase | `createClient()` |
| Files (features) | kebab-case | `subjects-page.tsx` |
| Files (components) | kebab-case | `app-shell.tsx` |
| Types | PascalCase | `AttendanceStatus` |
| Zustand stores | camelCase | `useAppStore` |
| Query keys | array | `['subjects']` |

### Directory Structure
| Path | Purpose |
|------|---------|
| `src/app/` | Next.js App Router — pages, layouts, API routes |
| `src/components/ui/` | shadcn/ui primitives |
| `src/components/layout/` | App shell, sidebar, navigation |
| `src/components/shared/` | Shared domain components |
| `src/features/` | Feature modules (each with its own page component) |
| `src/lib/` | Shared utilities, clients, config |
| `src/stores/` | Zustand stores |
| `src/types/` | TypeScript interfaces |
| `migrations/` | Supabase SQL migrations |

### Supabase Patterns
- Browser client: `createClient()` from `@/lib/supabase/client`
- Server client: `createClient()` from `@/lib/supabase/server`
- Admin client (service role): `createAdminClient()` from `@/lib/supabase/admin`
- Always use TanStack Query for Supabase reads/writes
- Mutations: `useMutation` + `queryClient.invalidateQueries`

### MCP Server
- Import `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`
- Import `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js`
- Tools use `zod` for input schema validation
- Auth flows via `extra.authInfo.extra.userId` from NextAuth session

## Review Checklist

Before marking any task as complete, verify:
- [ ] Types are consistent across data model and components
- [ ] Loading states are handled (Skeleton)
- [ ] Error states are handled (retry, error message)
- [ ] Empty states are handled (helpful message + CTA)
- [ ] Keyboard navigation works
- [ ] Focus styles are visible
- [ ] Screen reader labels are present
- [ ] Mobile layout works (360px+)
- [ ] Tablet layout works (768px+)
- [ ] Desktop layout works (1024px+)
- [ ] Data persists in Supabase
- [ ] RLS policies cover the new table
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] No hardcoded strings (use constants)
- [ ] AI/MCP tools are documented

## Definition of Done

A feature is done when:
1. TypeScript compiles without errors (`npx tsc --noEmit`).
2. Data model is updated in `src/types/index.ts` and Supabase migration.
3. Loading / empty / error states render correctly.
4. Responsive layout works at mobile, tablet, desktop breakpoints.
5. Feature is cross-referenced in AGENTS.md and FEATURES.md.
6. Export/Import in Settings includes the new data.
7. The CURRENT IMPLEMENTATION STAGE below is updated.

## CURRENT IMPLEMENTATION STAGE

**Phase 1 — Vanilla PWA Prototype** ✅ Complete (in `rotations/`)

**Phase 2 — Full App Rewrite** 🔄 In Progress (in `academic-planner/`)

| Feature | Status |
|---------|--------|
| Project scaffold (Next.js + TypeScript + Tailwind + shadcn/ui) | ✅ |
| Supabase schema (9 tables + RLS policies) | ✅ |
| Auth (NextAuth + Resend magic link) | ✅ |
| App shell (sidebar, bottom nav, theme toggle, responsive) | ✅ |
| Subjects CRUD (filtered by active semester) | ✅ |
| Timetable (recurring classes editor) | ✅ |
| Attendance marking | ✅ |
| Dashboard (greeting, today's classes, stat cards) | ✅ |
| Calendar (Month/Week/Day views with multi-color cells) | ✅ |
| Tasks CRUD | ✅ |
| Analytics (week/month/semester/overall breakdown) | ✅ |
| Attendance Calculator | ✅ |
| Settings (profile, target, semesters, export/import, MCP keys) | ✅ |
| MCP Server (full data access tools) | ✅ |
| Animations (motion.dev page transitions, stagger) | ✅ |

**Next:** Connect to Supabase project, seed data, deploy.

## Document Cross-References

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) — File and module guide
- [FEATURES.md](./FEATURES.md) — Detailed feature descriptions
- [DATABASE.md](./DATABASE.md) — Data model (Supabase schema)
- [UI_UX.md](./UI_UX.md) — Design system, screens, visual direction
- [AI.md](./AI.md) — AI/MCP architecture and tools
- [ROADMAP.md](./ROADMAP.md) — Phased implementation plan
- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) — State architecture
- [API.md](./API.md) — API surface and data flow
- [COMPONENTS.md](./COMPONENTS.md) — Component patterns
