# ROADMAP.md — Phased Implementation Plan

## Phase Overview

| Phase | Name | Focus | Status |
|-------|------|-------|--------|
| Phase 0 | Documentation & Planning | All project docs, schema design, architecture decisions | ✅ Complete |
| Phase 1 | Vanilla PWA Prototype | Working app with all core features, localStorage | ✅ Complete |
| Phase 2 | Full App Rewrite | Next.js + TypeScript + Tailwind + shadcn/ui, Supabase schema, all features | ✅ Complete |
| Phase 3 | Backend & Deployment | Connect to Supabase project, seed data, deploy to Vercel | 🔲 Next |
| Phase 4 | MCP Integration (Advanced) | Chat UI with DeepSeek, image import pipeline | 🔲 Pending |
| Phase 5 | Smart Features | Notifications, Academic Timeline | 🔲 Pending |
| Phase 6 | Polish | E2E tests, performance optimization, accessibility audit | 🔲 Pending |

---

## Phase 0: Documentation & Planning

**Status:** ✅ Complete

All project documentation has been written and cross-referenced.

### Deliverables

- [x] AGENTS.md — Project rules, coding standards, agent protocol
- [x] PROJECT_STRUCTURE.md — Full directory and module guide
- [x] FEATURES.md — Every feature in full detail
- [x] DATABASE.md — Complete schema with relationships and indexes
- [x] UI_UX.md — Design system, layout, visual direction
- [x] AI.md — MCP architecture, tool definitions
- [x] ROADMAP.md — This file
- [x] STATE_MANAGEMENT.md — Zustand + TanStack Query architecture
- [x] API.md — Endpoints, MCP server, Supabase access
- [x] COMPONENTS.md — Component architecture and patterns

---

## Phase 1: Vanilla PWA Prototype

**Status:** ✅ Complete

A fully functional self-contained PWA built with vanilla HTML, CSS, and JavaScript. Lives in `rotations/` — frozen, no further changes.

### Implemented Features

- [x] **PWA** — manifest.json, service-worker.js, SVG icons, offline caching
- [x] **Dashboard** — Time-based greeting, today's classes, attendance ring, subject mini-cards, upcoming tasks
- [x] **Timetable Editor** — Base week schedule with start/end times, recurring class management
- [x] **Subjects** — CRUD with per-subject stats and history, colour auto-assignment
- [x] **Calendar** — Month/Week/Day views with multi-color gradient cells
- [x] **Attendance Tracking** — Mark present/absent/cancelled/holiday per slot, percentage calculation
- [x] **Analytics** — Week/month/semester/overall views with per-subject breakdown
- [x] **Attendance Calculator** — Safe-to-miss, classes-needed computations
- [x] **Tasks** — CRUD for user, create+read for AI, priority, due dates
- [x] **Holiday System** — Mark day as holiday, bulk declare holidays
- [x] **Settings** — Theme toggle, target %, semester config, export/import, reset
- [x] **Dark/Light Theme** — Full theme support via CSS variables
- [x] **Responsive Design** — Works from 360px to 1920px
- [x] **Offline Support** — Service Worker caches all static assets

### Tech Stack

```
Frontend:   Plain HTML + CSS + JavaScript
Storage:    localStorage (JSON blob)
PWA:        Service Worker + Web App Manifest
Icons:      Inline SVG (no external dependencies)
```

### What's Not In This Phase

The prototype was a throwaway reference implementation. The full app is a complete rewrite using the target stack (Phase 2+).

---

## Phase 2: Full App Rewrite

**Status:** ✅ Complete

Complete rewrite of the prototype as a modern full-stack application with Next.js 14 App Router, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, TanStack Query, and Supabase.

### Scope

#### 2.1 Project Scaffolding
- [x] Initialize Next.js 14+ project with App Router
- [x] Configure TypeScript (strict mode)
- [x] Set up Tailwind CSS v4 with PostCSS
- [x] Install and configure shadcn/ui (24 primitives)
- [x] Create feature-based folder structure
- [x] Configure ESLint with `eslint-config-next`
- [x] Set up TanStack Query provider
- [x] Create Zustand store (app-store.ts)
- [x] Configure `globals.css` with OKLCH CSS variables
- [x] Create `.env.local` template

#### 2.2 Data Layer Foundation
- [x] Supabase client setup (browser, server, admin)
- [x] Database schema migrations (9 tables)
- [x] RLS policies for every table
- [x] TanStack Query hooks for all data operations
- [x] Zustand store for UI state (calendar view, sidebar)

#### 2.3 App Shell & Navigation
- [x] Root layout with Providers (QueryClient, ThemeProvider, TooltipProvider)
- [x] `(dashboard)` route group layout with NextAuth guard
- [x] Desktop sidebar navigation with 9 links
- [x] Mobile bottom tab bar (6 tabs)
- [x] Mobile header with navigation dropdown
- [x] Responsive sidebar (hidden on mobile)
- [x] Theme toggle (Sun/Moon icons)

#### 2.4 Auth
- [x] NextAuth.js v5 configuration with Resend provider
- [x] Supabase adapter for database-backed sessions
- [x] Magic link email authentication
- [x] Login page with email input
- [x] Auth route group with redirect guard
- [x] Dashboard layout with auth check
- [x] `handle_new_user()` trigger for auto-profile creation

#### 2.5 Subjects Module
- [x] Subject CRUD UI (Dialog + TanStack Query mutation)
- [x] ColorPicker component
- [x] Responsive grid display
- [x] Loading / empty / error states

#### 2.6 Timetable Module
- [x] Recurring classes management
- [x] Weekly grid view (Monday–Sunday)
- [x] Add/edit/delete recurring class
- [x] Subject colour-coded cards

#### 2.7 Attendance Module
- [x] Per-class-instance attendance marking
- [x] Status badges (present/absent/cancelled/holiday)
- [x] Upsert mutation pattern

#### 2.8 Task Module
- [x] Task CRUD with TanStack Query
- [x] Completion toggle with optimistic update
- [x] Priority badges
- [x] Due date display and overdue detection
- [x] AI-sourced task support

#### 2.9 Calendar
- [x] Month/Week/Day views
- [x] Zustand-powered calendar navigation
- [x] Subject colour-coded events

#### 2.10 Dashboard
- [x] Time-based greeting with user name
- [x] Today's date display
- [x] Stat cards (subjects, tasks, attendance, today's count)
- [x] Today's classes widget
- [x] Loading / empty states for all sections
- [x] Staggered animation via motion.dev

#### 2.11 Analytics
- [x] Period tabs (Week/Month/Semester/Overall)
- [x] Per-subject attendance breakdown
- [x] Aggregated stats

#### 2.12 Calculator
- [x] Subject selector + target input
- [x] Safe-to-miss and classes-needed computation
- [x] Verdict display (safe/warn/danger)

#### 2.13 Settings
- [x] Profile editor (display name, college)
- [x] Active semester management
- [x] Default attendance target
- [x] MCP API key management (create/revoke)
- [x] Data export (JSON download)
- [x] Data import (JSON upload)

#### 2.14 MCP Server
- [x] MCP endpoint at `POST /api/mcp`
- [x] 8 tool definitions (list_subjects, list_subjects_with_attendance, create_task, list_tasks, update_task, delete_task, get_today_classes, get_attendance_stats)
- [x] NextAuth session authentication
- [x] Admin Supabase client for service-role queries
- [x] Zod input validation

### Tech Stack (Current)

```
Frontend:  Next.js 14 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui
State:     Zustand (UI state) + TanStack Query (server state)
Backend:   Supabase (Postgres, Auth via NextAuth adapter)
Auth:      NextAuth.js v5 with Supabase adapter, Magic Link via Resend
AI:        MCP Server at /api/mcp
Email:     Resend (magic link emails)
Animations:motion.dev
Icons:     lucide-react
```

---

## Phase 3: Backend & Deployment

**Status:** 🔲 Next

Connect the app to a live Supabase project, seed demo data, and deploy to production.

### Scope

#### 3.1 Supabase Project Setup
- [ ] Create Supabase project
- [ ] Run migrations (`00001_initial_schema.sql`)
- [ ] Create authentication providers (Resend)
- [ ] Set up environment variables in Vercel/Supabase
- [ ] Configure database backups (point-in-time recovery)

#### 3.2 Seed Data
- [ ] Create seed script with default MBBS subjects
- [ ] Create sample timetable entries
- [ ] Create sample tasks
- [ ] Development data script for testing

#### 3.3 Deployment
- [ ] Deploy to Vercel (production branch)
- [ ] Configure custom domain (optional)
- [ ] Set up preview deployments per PR
- [ ] Configure CSP and security headers
- [ ] Set up monitoring and error tracking (Sentry)

#### 3.4 CI/CD
- [ ] GitHub Actions workflow for lint + type-check
- [ ] Auto-deploy on main branch push
- [ ] Database migration checks in CI

---

## Phase 4: MCP Integration (Advanced)

**Status:** 🔲 Pending

Build the chat UI and image import pipeline on top of the MCP server.

### Scope

#### 4.1 Chat Interface
- [ ] Floating chat trigger button
- [ ] Chat drawer component with message history
- [ ] Streaming DeepSeek V4 Flash integration
- [ ] Suggested prompts (empty state)
- [ ] Context builder (gathers user data for prompt)

#### 4.2 Image Import Pipeline
- [ ] OCR engine integration (Tesseract.js)
- [ ] Image upload component
- [ ] Three-stage pipeline: OCR → DeepSeek structuring → human approval
- [ ] Import preview with confidence scores

#### 4.3 MCP Server Enhancements
- [ ] MCP API key authentication (as alternative to session cookie)
- [ ] Additional tools (get_analytics, list_calendar_events)
- [ ] Rate limiting per user

---

## Phase 5: Smart Features

**Status:** 🔲 Pending

Add notifications and the unified Academic Timeline.

### Scope

#### 5.1 Notifications
- [ ] Browser Notification API integration
- [ ] Morning summary notification (7:00 AM)
- [ ] Class reminders (30 minutes before)
- [ ] Deadline reminders (24 hours before)
- [ ] Attendance threshold warnings (weekly)

#### 5.2 Academic Timeline
- [ ] Unified weekly view combining classes, tasks, holidays
- [ ] Current time indicator
- [ ] Event detail panel
- [ ] Filter controls

---

## Phase 6: Polish

**Status:** 🔲 Pending

Production-quality experience: comprehensive testing, performance, accessibility.

### Scope

#### 6.1 Testing
- [ ] Unit tests for stores, utilities, hooks (vitest)
- [ ] Integration tests for data flows
- [ ] E2E tests for critical paths (Playwright)
- [ ] Accessibility audit (axe-core)

#### 6.2 Performance
- [ ] Bundle analysis and code splitting
- [ ] Server component migration
- [ ] Lighthouse audit (90+ all categories)

#### 6.3 Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Screen reader testing
- [ ] Colour contrast verification

#### 6.4 Visual Polish
- [ ] Skeleton screen animations
- [ ] Empty state illustrations
- [ ] Splash screen (PWA)
- [ ] Page transition refinements

---

## Future / Post-v1

These items are explicitly **not in scope** for any phase but are documented for future consideration:

- **Collaborative features:** Share tasks, timetable, or attendance with classmates
- **Grade tracking:** Link assignments to grades, calculate GPA
- **Calendar sync:** Two-way sync with Google Calendar / Apple Calendar
- **Mobile app:** React Native or Flutter companion app
- **Multi-language:** Hindi, regional language support
