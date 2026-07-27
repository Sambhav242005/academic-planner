# FEATURES.md — Implemented Feature Descriptions

All features below are **implemented** in the Next.js rewrite (`academic-planner/`). Data persists in Supabase. Auth via NextAuth.js with magic link. The old prototype in `rotations/` is frozen.

---

## Feature Index

1. Authentication
2. Dashboard
3. Timetable
4. Subjects
5. Calendar
6. Attendance Tracker
7. Tasks
8. Analytics
9. Calculator
10. Settings
11. MCP Server

---

## 1. Authentication

### Description

Passwordless email-based auth via NextAuth.js v5 with the Supabase adapter. Users sign in with a magic link sent via Resend.

### Key Components

- `src/lib/auth/auth.ts` — NextAuth configuration with Resend provider and Supabase adapter
- `src/app/(auth)/login/page.tsx` — Login form (email input, send magic link)
- `src/app/(auth)/layout.tsx` — Auth route group layout (redirects to dashboard if signed in)
- `src/app/(dashboard)/layout.tsx` — Dashboard layout guards all dashboard routes, redirects to /login if unauthenticated

### Data Flow

1. User enters email on /login
2. NextAuth calls Resend provider which sends a magic link email
3. User clicks the link in email; the client stays on the confirmation screen while the internal callback completes
4. NextAuth verifies the token, creates/updates the user via Supabase adapter
5. The `handle_new_user()` trigger creates a profile row in the `profiles` table
6. Session cookie is set, user is redirected to `/`
7. `session.user.id` is available in server components via `auth()` and client components via `useSession()`

### States

- **Signed out:** Login page with email input
- **Email sent:** Confirmation message with instructions
- **Signed in:** Dashboard with user's name in greeting
- **Error:** Invalid/expired link, rate limit exceeded

---

## 2. Dashboard

### Description

The default landing page. Answers "What do I need to do right now?" at a glance.

### Key Components

- `src/app/(dashboard)/page.tsx` — Dashboard page (client component)
- Stat cards with icons (Subjects count, Pending Tasks, Attendance %, Today's classes)
- Today's Classes card showing recurring + instance-based classes with attendance status

### Data Flow

1. Server checks auth via `auth()` in layout, redirects to /login if unauthenticated
2. Client component uses `useSession()` for user info
3. Two TanStack Query hooks fetch data in parallel:
- `['today-classes', today, dayOfWeek, activeSemesterId]` — recurring_classes + class_instances for today
   - `['dashboard-stats']` — subjects count, pending tasks count, attendance summary
4. The authenticated dashboard route checks the NextAuth session and scopes every database query to that user.
5. Loading state shows `Skeleton` components for stat cards and today's classes

### States

- **Loading:** Skeleton cards for stats, skeleton placeholders for today's classes
- **Loaded:** Stat cards with values, today's classes list with subject dots and attendance badges
- Dates are generated in the user's local timezone so the dashboard does not show the previous day's classes in India.
- Today's class cards expose four direct attendance status buttons. A missing class instance is created on first mark, and each change asks for confirmation.
- Marked classes move from Today's Classes into Today's History, where the same direct status controls can be used to correct the record after confirmation.
- **Empty (no classes today):** "No classes today." message
- **Error:** TanStack Query error boundary (retry button)

---

## 3. Timetable

### Description

Base week schedule editor. Defines recurring classes — which subjects, days, times, and class types.

### Key Components

- `src/features/timetable/timetable-page.tsx` — Recurring classes management view

### Fields per Recurring Class

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `subject_id` | UUID | Yes | References subjects.id |
| `day_of_week` | SMALLINT | Yes | 0=Monday through 6=Sunday |
| `start_time` | TIME | Yes | 24-hour format |
| `end_time` | TIME | No | Optional |
| `class_type` | TEXT | Yes | theory / clinical / practical / tutorial / exam |

### Behaviour

- View the full week grid (Monday–Sunday) with all recurring classes
- Add a class to any day: pick subject, type, start/end time
- Edit or delete any recurring class
- Class instances are generated from recurring classes when marking attendance

### States

- **Loading:** Skeleton grid
- **Empty:** "No classes scheduled" with an add button
- **Populated:** Cards grouped by day with subject colour dots, times, class type badge

---

## 4. Subjects

### Description

Manage the list of subjects. Each subject gets a name and a colour. Attendance stats are calculated per-subject at query time.

### Key Components

- `src/features/subjects/subjects-page.tsx` — Subject CRUD with Dialog form
- `src/features/subjects/color-picker.tsx` — shadcn-styled colour picker with presets and a native custom colour selector

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | TEXT | Yes | Displayed across the app |
| `color` | TEXT (hex) | Yes | Used for calendar cells, charts, and cards |

### Behaviour

- **Create:** Dialog with name input and colour picker, uses `useMutation` to insert
- **Colour selection:** Choose a preset or any valid hex colour with the accessible custom colour input.
- **Edit:** Pre-filled dialog, updates via `useMutation`
- **Delete:** Confirmation prompt, deletes subject (class instances reference via FK with cascade)
- TanStack Query cache invalidated on every mutation via `queryClient.invalidateQueries({ queryKey: ['subjects'] })`

### States

- **Loading:** Grid of skeleton cards
- **Empty:** Centered card with BookOpen icon and "No subjects yet" message + CTA button
- **Populated:** Responsive grid (1 col mobile, 2 col tablet, 3 col desktop) with subject cards showing colour dot, name, colour hex, edit/delete buttons

---

## 5. Calendar

### Description

Three-mode calendar for viewing attendance, classes, and schedules.

### Key Components

- `src/features/calendar/calendar-page.tsx` — Month/Week/Day views with navigation

### Modes

#### Month View
- Standard month grid with day numbers
- Navigate between months with arrows, "Today" button jumps to current month
- Uses Zustand store (`useAppStore`) for calendar view state

#### Week View
- 7-column timeline with colour-coded event blocks by subject

#### Day View
- Full single-day view with all scheduled slots listed chronologically
- Mark buttons for each slot: Present / Absent / Cancelled / Holiday

### Navigation

- Mode switcher tabs (Month / Week / Day)
- Previous/Next arrows adapt to current mode
- "Today" shortcut always jumps to current date

### Data Flow

1. Calendar view state (year, month, view mode, selectedDate) lives in Zustand `useAppStore`
2. Class instances and attendance records fetched via TanStack Query
3. Day view mutation: `useMutation` upserts attendance_record, invalidates class instances query

### States

- **Loading:** Skeleton grid/week/day
- **Empty day:** "No classes scheduled"
- **Holiday:** Holiday banner displayed at top

---

## 6. Attendance Tracker

### Description

Mark attendance per class instance. Only raw records are stored — percentages are computed at render time.

### Key Components

- `src/features/attendance/attendance-page.tsx` — Attendance marking interface

### Actions

- **Present:** Slot was attended
- **Absent:** Slot was missed
- **Cancelled:** Class was cancelled (excluded from percentage calculation)
- **Holiday:** Date was a holiday (excluded from percentage calculation)

### Percentage Calculation

```
percentage = present / (present + absent) x 100
```

Cancelled and holiday slots never penalise the student.

### Data Flow

1. Fetch class instances with attendance records via TanStack Query
2. User clicks a status button → `useMutation` upserts `attendance_records`
3. On success: invalidate queries for attendance records and dashboard stats
4. RLS ensures user can only access their own records

### States

- **Unmarked slot:** Mark buttons visible, no badge
- **Marked slot:** Badge showing current status (present/absent/cancelled/holiday)
- **Status editing:** Direct Present / Absent / Cancelled / Holiday buttons with confirmation before saving a change
- **Loading:** Skeleton list

---

## 7. Tasks

### Description

Todo list for assignments, study sessions, and personal reminders. Supports user-created and AI-created tasks.

### Key Components

- `src/features/tasks/tasks-page.tsx` — Task CRUD with filters

### Fields

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `title` | TEXT | Yes | — | Task title |
| `subject_id` | UUID | No | null | References subjects.id |
| `due_date` | DATE | No | null | Used for sorting and overdue detection |
| `priority` | TEXT | No | medium | low / medium / high |
| `note` | TEXT | No | '' | Additional details |
| `completed` | BOOLEAN | Yes | false | Toggle status |
| `source` | TEXT | Yes | user | user / ai — distinguishes who created the task |

### Behaviour

- **Create:** Dialog form, `useMutation` insert, cache invalidation
- **Edit:** Pre-filled dialog, update mutation
- **Delete:** Remove with confirmation
- **Complete:** Toggle checkbox, optimistic update via TanStack Query
- **Filters:** Filter by completion status
- **Relative due labels:** "Today", "Tomorrow", "In X days", "Overdue"
- **AI-created tasks:** `source = 'ai'` field distinguishes them

### States

- **Loading:** Skeleton task list
- **Empty (no tasks):** "No tasks yet." with CTA
- **Empty filter:** "No tasks match this filter."
- **Overdue:** Visual flag on tasks past due date

---

## 8. Analytics

### Description

Visualise attendance data across different time periods with per-subject breakdowns.

### Key Components

- `src/features/analytics/analytics-page.tsx` — Analytics view with period tabs and per-subject stats

### Tabs

| Tab | Scope |
|-----|-------|
| This Week | Monday to Sunday of the current week |
| This Month | Full current calendar month |
| This Semester | From active semester start |
| Overall | All recorded data |

### Visualisations

- Attendance percentage per period
- Per-subject breakdown with counts and percentages
- Colour-coded bars (subject colour)

### Data Flow

1. TanStack Query fetches attendance records for selected period
2. Computation done at render time in the component
3. RLS ensures per-user isolation

---

## 9. Calculator

### Description

Attendance calculator showing safe-to-miss and classes-needed-to-reach-target computations.

### Key Components

- `src/features/analytics/calculator-page.tsx` — Calculator form and result display

### Behaviour

- Select a subject
- Calculates current attendance percentage
- Shows "safe to miss" count (how many more classes can be missed before dropping below target)
- Shows "classes needed" (how many of the next N classes must be attended to reach target)

### Data Flow

1. Fetches attendance records for the selected subject via TanStack Query
2. Computes all values client-side with reactive updates as inputs change
3. No server-side calculation needed — all inputs are already in the query cache

### States

- **No subject selected:** "Select a subject to calculate."
- **No data:** "No attendance data for this subject."
- **Result:** Verdict card with safe/warn/danger styling

---

## 10. Settings

### Description

Configure app preferences, manage account, and handle data.

### Key Components

- `src/features/settings/settings-page.tsx` — Settings form with sections

### Sections

| Section | Fields |
|---------|--------|
| Profile | Display name, college |
| Academic | Active semester selector, default attendance target % |
| MCP Keys | List of API keys for MCP access, create/revoke |
| Data | Export data (JSON download), Import data (JSON upload) |
| Danger Zone | Reset all data with confirmation |

### Data Flow

- Profile mutations call authenticated server routes via TanStack Query.
- Semesters CRUD via `useMutation` with cache invalidation, including inline label editing and active-semester refresh
- Semester mutations are authenticated and scoped to the current user's row on the server.
- MCP key management only returns key metadata; hashes never reach the browser.
- Export: calls a scoped server route and deliberately excludes MCP API keys.
- Import: validates and remaps records on the server, ignoring source owner IDs and key data.

### States

**Loading:** Skeleton form sections
**Saved:** Success toast after profile/settings update
**Error:** Error toast with retry

---

## 11. MCP Server

### Description

Model Context Protocol server endpoint at `/api/mcp` for AI assistants (Claude, Cursor, ChatGPT) to read and write the user's academic data.

### Key Components

- `src/app/api/mcp/route.ts` — MCP server route (POST handler)
- `src/lib/mcp/tools.ts` — Tool implementations using Supabase admin client

### Exposed Tools

| Tool | Description | Access |
|------|-------------|--------|
| `list_subjects` | List all subjects | Read |
| `list_subjects_with_attendance` | List subjects with attendance stats | Read |
| `create_task` | Create a new task (AI-sourced) | Write |
| `list_tasks` | List tasks with optional filters | Read |
| `update_task` | Update an existing task | Write |
| `delete_task` | Delete a task | Write |
| `get_today_classes` | Get today's class schedule | Read |
| `get_attendance_stats` | Get attendance statistics | Read |

### Authentication

All MCP requests require a valid NextAuth session cookie. The server reads the session via `auth()`, extracts `session.user.id`, and passes it as `userId` in the auth info to each tool handler.

### States

- **Unauthenticated:** HTTP 401 response
- **Authenticated:** Tools run scoped to the authenticated user
- **Error:** Tool throws descriptive error message returned as MCP error content
