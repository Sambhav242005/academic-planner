# Academic Planner

A personal academic planner for Indian MBBS college students. Answers one question: **"What do I need to do right now?"**

Built with Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, and Supabase.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand (UI) + TanStack Query (server) |
| Database | Supabase (Postgres) |
| Auth | NextAuth.js v5 (magic link via Resend) |
| AI | MCP Server at `/api/mcp` |
| Animations | motion.dev |

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project (remote)
- A Resend API key for magic link emails

### Local Development

```bash
cp .env.example .env   # fill in your credentials
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker

```bash
cp .env.example .env
docker compose up --build
```

Find the mapped port:

```bash
docker compose ps
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_URL` | Supabase URL (server) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (server) |
| `SUPABASE_SECRET_KEY` | Supabase service role key |
| `AUTH_SECRET` | NextAuth.js secret |
| `AUTH_RESEND_KEY` | Resend API key |

## Features

- Subject management with semester filtering
- Recurring timetable editor
- Attendance marking with per-class records
- Dashboard with today's classes and stats
- Calendar (month/week/day views)
- Tasks with priorities and due dates
- Analytics (week/month/semester/overall)
- Attendance calculator
- Settings (profile, target, semesters, export/import)
- AI assistant integration via MCP

## Project Structure

```
src/
├── app/            # Next.js App Router (pages, layouts, API routes)
├── components/     # UI primitives, layout, shared components
├── features/       # Feature modules (dashboard, subjects, etc.)
├── hooks/          # Custom React hooks
├── lib/            # Utilities, clients, config
├── stores/         # Zustand stores
└── types/          # TypeScript definitions
```

## MCP Server

An MCP server runs at `/api/mcp` for AI assistants (Claude, ChatGPT, Cursor) to interact with planner data. Tools are available for subjects, tasks, attendance, and timetable operations.
