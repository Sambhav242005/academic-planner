# STATE_MANAGEMENT.md — State Architecture

## Architecture Overview

The app uses a **two-layer state model**: Zustand for UI state (client-only, ephemeral + persisted preferences), TanStack Query for server state (Supabase data) with localStorage persistence and optimistic updates.

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
│  + Optimistic updates for all mutations             │
│  + localStorage persistence (offline support)       │
│                                                     │
│  PersistQueryClientProvider                         │
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

Located in `src/app/providers.tsx`. The `PersistQueryClientProvider` wraps the entire app with localStorage persistence:

```typescript
'use client'

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SessionProvider } from 'next-auth/react'
import { useState, useMemo } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  }), [])

  const persister = useMemo(() => {
    if (typeof window === 'undefined') return null
    return createSyncStoragePersister({ storage: window.localStorage })
  }, [])

  return (
    <SessionProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: persister as any }}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </SessionProvider>
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

#### useMutation Pattern (with optimistic updates)

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
  onMutate: async (values) => {
    await queryClient.cancelQueries({ queryKey: ['subjects'] })
    const previous = queryClient.getQueryData(['subjects'])
    const newSubject = { id: `temp-${Date.now()}`, name: values.name, color: values.color }
    queryClient.setQueryData(['subjects'], (old: any[]) => [...(old ?? []), newSubject])
    return { previous }
  },
  onError: (_err, _values, context) => {
    if (context?.previous) queryClient.setQueryData(['subjects'], context.previous)
  },
  onSettled: () => {
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

After every mutation, the relevant query key is invalidated to trigger a refetch. All mutations also use **optimistic updates** for instant UI feedback — the local cache is updated before the server responds, and rolled back on error.

```typescript
// After creating/updating/deleting a subject
queryClient.invalidateQueries({ queryKey: ['subjects'] })

// After marking attendance
queryClient.invalidateQueries({ queryKey: ['today-classes', today, dayOfWeek] })
queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
queryClient.invalidateQueries({ queryKey: ['attendance-records'] })
```

### Optimistic Updates + Offline Queue

Every mutation follows this pattern:

1. **onMutate:** Cancel outgoing refetches, snapshot previous cache, apply optimistic update
2. **onError:** Rollback to snapshot if server rejects the change
3. **onSettled:** Invalidate queries to refetch fresh data from server

The `PersistQueryClientProvider` with `createSyncStoragePersister` persists the query cache to `localStorage`. When the browser goes offline, mutations queue in the mutation cache and flush automatically when reconnection is detected. An amber banner displays the offline/syncing state.

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
  1. onMutate: cancel refetches, snapshot cache, apply optimistic update
  2. UI updates instantly with temp item
  3. mutationFn: supabase.from('subjects').insert(...)
  4. onSettled: invalidate queries → refetch from server
Dialog closes
TanStack Query refetches subjects → UI shows real data
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
| Subject data | TanStack Query | Feature components | Supabase + localStorage cache |
| Timetable data | TanStack Query | Feature components | Supabase + localStorage cache |
| Attendance data | TanStack Query | Feature components | Supabase + localStorage cache |
| Task data | TanStack Query | Feature components | Supabase + localStorage cache |
| Profile/settings | TanStack Query | Feature components | Supabase + localStorage cache |
| Offline mutations | TanStack Query mutationCache | `providers.tsx` | Queued until online |
| Form input | Local useState | Feature components | No |
| Theme preference | next-themes | `src/app/providers.tsx` | localStorage |

Zustand contains **zero server data**. TanStack Query handles **all server state**. This boundary is strictly enforced — no exceptions.
