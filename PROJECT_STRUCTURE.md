# PROJECT_STRUCTURE.md — Directory & Module Guide

## Current Implementation: Next.js Full App

```
AcademicPlanner/
├── academic-planner/               # Next.js App (main application)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/             # Auth route group
│   │   │   │   ├── login/page.tsx   # Magic link login
│   │   │   │   ├── signup/page.tsx  # New user signup
│   │   │   │   └── layout.tsx       # Centered card layout
│   │   │   ├── (dashboard)/        # Authenticated route group
│   │   │   │   ├── page.tsx         # Dashboard (home)
│   │   │   │   ├── layout.tsx       # App shell (sidebar + bottom nav)
│   │   │   │   ├── timetable/page.tsx
│   │   │   │   ├── subjects/page.tsx
│   │   │   │   ├── attendance/page.tsx
│   │   │   │   ├── calendar/page.tsx
│   │   │   │   ├── tasks/page.tsx
│   │   │   │   ├── analytics/page.tsx
│   │   │   │   ├── calculator/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   ├── api/
│   │   │   │   ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   │   │   │   ├── mcp/route.ts                  # Authenticated MCP server endpoint
│   │   │   │   ├── profile/route.ts              # Authenticated profile API
│   │   │   │   └── semesters/route.ts            # Authenticated semester API
│   │   │   ├── providers.tsx       # PersistQueryClient + ThemeProvider + OfflineBanner
│   │   │   ├── layout.tsx          # Root layout (fonts, metadata)
│   │   │   └── globals.css         # Tailwind + shadcn/ui theme vars
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui primitives (29 components)
│   │   │   ├── layout/
│   │   │   │   ├── app-shell.tsx   # Sidebar + bottom nav + page transition
│   │   │   │   └── theme-toggle.tsx # Dark/light toggle
│   │   │   └── shared/             # Shared domain components
│   │   │       ├── attendance-actions.tsx  # 4-button attendance status group
│   │   │       ├── offline-banner.tsx      # Offline/syncing status banner
│   │   │       ├── loading-bar.tsx         # Route transition progress bar
│   │   │       └── empty-state.tsx         # Reusable empty state with icon + CTA
│   │   │
│   │   ├── features/               # Feature modules (each self-contained)
│   │   │   ├── subjects/
│   │   │   │   ├── subjects-page.tsx  # CRUD with color picker
│   │   │   │   └── color-picker.tsx   # Presets + custom shadcn-styled selector
│   │   │   ├── timetable/timetable-page.tsx   # Week grid editor
│   │   │   ├── attendance/attendance-page.tsx # Date-based marking
│   │   │   ├── calendar/calendar-page.tsx    # Month/Week/Day views
│   │   │   ├── tasks/tasks-page.tsx          # CRUD with filters
│   │   │   ├── analytics/
│   │   │   │   ├── analytics-page.tsx        # Stats + per-subject breakdown
│   │   │   │   └── calculator-page.tsx       # Safe-to-miss calculator
│   │   │   └── settings/settings-page.tsx    # Profile, semesters, MCP keys
│   │   │
│   │   ├── lib/
│   │   │   ├── auth/auth.ts        # NextAuth config (Supabase adapter + Resend)
│   │   │   ├── offline/
│   │   │   │   ├── mutation-defaults.ts  # QueryClient factory + offline mutation cache
│   │   │   │   └── use-offline-status.ts # Online/offline status hook
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts       # Browser Supabase client
│   │   │   │   ├── server.ts       # Server Supabase client (cookies)
│   │   │   │   └── admin.ts        # Service role client (admin/MCP)
│   │   │   ├── mcp/tools.ts        # MCP tool implementations
│   │   │   └── utils/
│   │   │       ├── dates.ts        # Date formatting, week/month helpers
│   │   │       └── attendance-stats.ts  # Stats calculation + safe-to-miss
│   │   │
│   │   ├── stores/app-store.ts     # Zustand store (calendar UI state)
│   │   └── types/index.ts          # All TypeScript interfaces
│   │
│   ├── migrations/
│   │   └── 00001_initial_schema.sql  # 9 tables + indexes + RLS policies
│   ├── .env.local                  # Environment variables
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
│
├── rotations/                      # Frozen — completed vanilla PWA prototype
│   ├── index.html, style.css, script.js, manifest.json, service-worker.js
│   └── icons/
│
├── AGENTS.md                       # Agent instructions & project policy
├── PROJECT_STRUCTURE.md            # This file
├── FEATURES.md                     # Detailed feature descriptions
├── DATABASE.md                     # Data model (Supabase schema)
├── UI_UX.md                        # Design system & visual direction
├── AI.md                           # MCP architecture & tool definitions
├── ROADMAP.md                      # Phased implementation plan
├── STATE_MANAGEMENT.md             # State architecture
├── API.md                          # API surface & data flow
└── COMPONENTS.md                   # Component patterns
```

## Key Patterns

| Layer | Pattern |
|-------|---------|
| Pages | Route group `(auth)` and `(dashboard)` separate public/protected routes |
| Data fetching | TanStack Query to authenticated Next.js route handlers |
| UI state | Zustand (calendar view, filters, sidebar) |
| Auth | NextAuth.js with Supabase adapter, Resend magic link |
| MCP | `WebStandardStreamableHTTPServerTransport` in API route |
| Animations | motion.dev page transitions + sidebar stagger |
| Styles | Tailwind CSS v4 + CSS variables for theming |

## Architecture Flow

```
Browser → TanStack Query → authenticated Next.js route handlers → Supabase admin client (explicit user ownership checks)
                                    ↓
MCP Client (Claude/ChatGPT) → /api/mcp → NextAuth session check → Admin Supabase client → Data
```
