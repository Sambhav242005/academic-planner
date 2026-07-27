# STATE_MANAGEMENT.md — State Architecture

## Architecture Overview

The app uses a **two-layer state model**: Zustand for UI state (client-only, ephemeral + persisted preferences), TanStack Query for server state (Supabase data).

```
┌────────────────────────────────────────────────────┐
│                    Zustand                          │
│  (UI state only — NO server data)                   │
│                                                     │
│  useAppStore                                        │
│  ├── calendar: { year, month, view, selectedDate }  │
│  └── sidebarOpen: boolean                           │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│                 TanStack Query                      │
│  (Server state — all Supabase data)                 │
│                                                     │
│  QueryClient                                        │
│  ├── ['subjects']            → Subject[]            │
│  ├── ['today-classes', ...]  → Today's classes      │
│  ├── ['dashboard-stats']     → Aggregated stats     │
│  ├── ['tasks']               → Task[]               │
│  └── ...                                            │
└────────────────────────────────────────────────────┘
```

---

## Layer 1: Zustand Store — UI State Only

### Store: `useAppStore`

Located at `src/stores/app-store.ts`. Manages calendar navigation and sidebar state — purely client-side UI concerns with no server data.

```typescript
interface CalenderView {
  year: number
  month: number
  view: 'month' | 'week' | 'day'
  selectedDate: string
}

interface AppState {
  calendar: CalenderView
  sidebarOpen: boolean
  setCalendarView: (view: CalenderView['view']) => void
  setCalendarDate: (year: number, month: number) => void
  setSelectedDate: (date: string) => void
  toggleSidebar: () => void
}
```

### State

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `calendar.year` | number | Current year | Calendar year being viewed |
| `calendar.month` | number | Current month (0-indexed) | Calendar month being viewed |
| `calendar.view` | 'month' \| 'week' \| 'day' | 'month' | Active calendar view mode |
| `calendar.selectedDate` | string (YYYY-MM-DD) | Today | Selected day in calendar |
| `sidebarOpen` | boolean | true | Desktop sidebar expanded state |

### Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `setCalendarView` | `view: 'month' \| 'week' \| 'day'` | Switch calendar mode |
| `setCalendarDate` | `year: number, month: number` | Navigate calendar to a specific month |
| `setSelectedDate` | `date: string` | Select a specific day |
| `toggleSidebar` | none | Toggle desktop sidebar |

### Usage Pattern

```typescript
import { useAppStore } from '@/stores/app-store'

// Read atomic values (never the whole store)
const calendarView = useAppStore((s) => s.calendar.view)
const selectedDate = useAppStore((s) => s.calendar.selectedDate)

// Get action functions
const setCalendarView = useAppStore((s) => s.setCalendarView)
const toggleSidebar = useAppStore((s) => s.toggleSidebar)
```

### When NOT to use Zustand

- Data comes from Supabase → TanStack Query
- State is local to one component → `useState`
- State is form input → local state + controlled inputs

---

## Layer 2: TanStack Query — Server State

### Provider Setup

Located in `src/app/providers.tsx`. The `QueryClientProvider` wraps the entire app:

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

### Query Patterns

All Supabase reads use `useQuery` with explicit query keys. All Supabase writes use `useMutation` with cache invalidation on success.

#### useQuery Pattern

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['subjects'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name')
    if (error) throw error
    return (data ?? []).map(mapSubject)
  },
})
```

#### useMutation Pattern

```typescript
const queryClient = useQueryClient()

const createMutation = useMutation({
  mutationFn: async (values: { name: string; color: string }) => {
    const { error } = await supabase.from('subjects').insert({
      user_id: session!.user!.id,
      name: values.name,
      color: values.color,
    })
    if (error) throw error
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['subjects'] })
  },
})
```

### Query Keys

| Key | Data | Stale Time | Description |
|-----|------|------------|-------------|
| `['subjects']` | Subject[] | 30 min | All subjects |
| `['today-classes', today, dayOfWeek]` | { recurring, instances } | 2 min | Today's class schedule |
| `['dashboard-stats']` | { subjects, tasks, attendance } | 2 min | Aggregated stats |
| `['tasks']` | Task[] | 2 min | All tasks |
| `['attendance-records']` | AttendanceRecord[] | 2 min | Attendance records |

### Cache Invalidation Strategy

After every mutation, the relevant query key is invalidated to trigger a refetch:

```typescript
// After creating/updating/deleting a subject
queryClient.invalidateQueries({ queryKey: ['subjects'] })

// After marking attendance
queryClient.invalidateQueries({ queryKey: ['today-classes', today, dayOfWeek] })
queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
queryClient.invalidateQueries({ queryKey: ['attendance-records'] })
```

No optimistic updates are currently used. The cache invalidation + refetch pattern ensures data consistency with minimal complexity.

### Supabase Clients

Three client factories in `src/lib/supabase/`:

| Client | File | Key | When to Use |
|--------|------|-----|-------------|
| Browser client | `src/lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client components (TanStack Query hooks) |
| Server client | `src/lib/supabase/server.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Server components, NextAuth adapter |
| Admin client | `src/lib/supabase/admin.ts` | `SUPABASE_SERVICE_ROLE_KEY` | MCP server (bypasses RLS) |

The browser and server clients respect RLS. The admin client bypasses RLS and must explicitly scope queries with `.eq('user_id', userId)`.

---

## Data Flow Patterns

### Page Load

```
Server component (layout.tsx)
  → auth() checks session
  → Redirects to /login if unauthenticated
  → Renders AppShell with children

Client component (page.tsx)
  → useQuery hooks fire in parallel
  → Loading state shown via Skeleton components
  → Data arrives → re-render with content
  → Error state shown if query fails
```

### User Mutation (e.g., Create Subject)

```
User clicks "Add Subject" → opens Dialog
User fills form → clicks Save
useMutation fires:
  1. mutationFn: supabase.from('subjects').insert(...)
  2. onSuccess: queryClient.invalidateQueries(['subjects'])
Dialog closes
TanStack Query refetches subjects → UI updates automatically
```

### Calendar Navigation

```
User clicks "Next Month"
Zustand: useAppStore.getState().setCalendarDate(year, month + 1)
Calendar component re-renders with new state
TanStack Query queries for new month's data (if different query key dependencies)
```

---

## Summary

| Concern | Tool | Location | Persisted? |
|---------|------|----------|------------|
| Calendar view state | Zustand | `src/stores/app-store.ts` | No (resets on refresh) |
| Sidebar open/closed | Zustand | `src/stores/app-store.ts` | No |
| Subject data | TanStack Query | Feature components | Supabase |
| Timetable data | TanStack Query | Feature components | Supabase |
| Attendance data | TanStack Query | Feature components | Supabase |
| Task data | TanStack Query | Feature components | Supabase |
| Profile/settings | TanStack Query | Feature components | Supabase |
| Form input | Local useState | Feature components | No |
| Theme preference | next-themes | `src/app/providers.tsx` | localStorage |

Zustand contains **zero server data**. TanStack Query handles **all server state**. This boundary is strictly enforced — no exceptions.
