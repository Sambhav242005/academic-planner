# COMPONENTS.md — Component Patterns

> **Current phase:** Next.js rewrite (`academic-planner/`). The old prototype in `rotations/` used vanilla DOM manipulation — see the old COMPONENTS.md for that reference.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    app/layout.tsx                        │
│  RootLayout: Geist font, globals.css, <Providers>        │
├──────────────────────────────────────────────────────────┤
│                    app/providers.tsx                      │
│  Providers: PersistQueryClientProvider + ThemeProvider +  │
│             TooltipProvider + OfflineBanner               │
├──────────────────────────────────────────────────────────┤
│               app/(dashboard)/layout.tsx                  │
│  DashboardLayout: auth() check, <AppShell> wrapper        │
├──────────────────────────────────────────────────────────┤
│              components/layout/app-shell.tsx              │
│  AppShell: Sidebar + Header + MobileNav + <main>         │
├──────────────────────────────────────────────────────────┤
│                      Feature Pages                        │
│  (dashboard)/page.tsx → renders inline                    │
│  subjects/page.tsx    → renders <SubjectsPage>            │
│  tasks/page.tsx       → renders <TasksPage>               │
│  ...                                                     │
├──────────────────────────────────────────────────────────┤
│                   components/ui/*                         │
│  shadcn/ui primitives (24 components)                     │
└──────────────────────────────────────────────────────────┘
```

---

## 1. Page Wrappers

### Root Layout (`src/app/layout.tsx`)

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

Responsibilities:
- Loads Geist (sans) and Geist Mono fonts via `next/font/google`
- Sets CSS variable classes on `<html>`
- Wraps children in `Providers`

### Providers (`src/app/providers.tsx`)

```typescript
'use client'

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

Three providers nested: TanStack Query → next-themes → shadcn/ui Tooltip.

### Auth Route Group (`src/app/(auth)/layout.tsx`)

- Renders children without AppShell
- Redirects to `/` if user is already signed in

### Dashboard Route Group (`src/app/(dashboard)/layout.tsx`)

```typescript
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return <AppShell>{children}</AppShell>
}
```

- Server component — checks auth via `auth()`
- Redirects to /login if unauthenticated
- Wraps children in `AppShell`

---

## 2. Layout Components

### AppShell (`src/components/layout/app-shell.tsx`)

The main application shell. Renders different chrome for desktop vs mobile.

**Desktop (768px+):**
- Left sidebar (256px, `border-r`, `bg-sidebar`)
  - Logo + brand name at top
  - ScrollArea with 9 navigation links (motion.div staggered entrance)
  - ThemeToggle at bottom
- Main content area with page transition animation

**Mobile (<768px):**
- Top header with logo, ThemeToggle, and mobile nav dropdown
- Main content area
- Bottom tab bar (6 tabs: Dashboard, Timetable, Subjects, Attendance, Calendar, Tasks)

**Navigation links:**
Dashboard (`/`), Timetable (`/timetable`), Subjects (`/subjects`), Attendance (`/attendance`), Calendar (`/calendar`), Tasks (`/tasks`), Analytics (`/analytics`), Calculator (`/calculator`), Settings (`/settings`)

**Page transition:**
```typescript
<motion.main
  key={pathname}
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
  className="flex-1 p-4 md:p-6 lg:p-8"
>
```

### ThemeToggle (`src/components/layout/theme-toggle.tsx`)

- Uses `useTheme()` from `next-themes`
- Toggles between dark and light
- Displays Sun icon (light) or Moon icon (dark) from lucide-react

---

## 3. UI Primitives (shadcn/ui)

24 components installed from shadcn/ui, used throughout the app:

| Component | Used In | Purpose |
|-----------|---------|---------|
| `Button` | Every view | All clickable actions |
| `Card, CardHeader, CardContent, CardTitle` | Dashboard, Subjects, Analytics | Content containers |
| `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose` | Subjects, Tasks, Settings | CRUD forms |
| `Input` | Subjects, Settings, Tasks | Text input fields |
| `Label` | Subjects, Tasks, Settings | Form labels |
| `Select` | Subjects, Tasks, Timetable | Dropdown selects |
| `Badge` | Dashboard, Tasks, Attendance | Status indicators |
| `Skeleton` | Every data-fetching view | Loading placeholders |
| `Progress` | Dashboard | Attendance progress |
| `Tabs` | Analytics | Period selection |
| `Tooltip` | Various | Hover tooltips |
| `ScrollArea` | AppShell sidebar | Scrollable nav |
| `Separator` | Settings | Section dividers |
| `Sheet` | (reserved) | Slide-in panels |
| `DropdownMenu` | (reserved) | Context menus |
| `Popover` | (reserved) | Inline selectors |
| `Command` | (reserved) | Command palette |
| `Table` | (reserved) | Data tables |
| `Textarea` | Tasks | Multi-line input |
| `Checkbox` | Tasks | Completion toggle |
| `Calendar` | Tasks, Settings | Date picker |
| `Avatar` | AppShell sidebar | User avatar |
| `Sidebar` | AppShell (shadcn sidebar) | Desktop nav |

---

## 4. Feature Components

Each feature lives in `src/features/<feature>/` with a single page component file (re-exported from the route page).

| Feature | File | Type |
|---------|------|------|
| Subjects | `src/features/subjects/subjects-page.tsx` | Client component |
| Tasks | `src/features/tasks/tasks-page.tsx` | Client component |
| Attendance | `src/features/attendance/attendance-page.tsx` | Client component |
| Calendar | `src/features/calendar/calendar-page.tsx` | Client component |
| Analytics | `src/features/analytics/analytics-page.tsx` | Client component |
| Calculator | `src/features/analytics/calculator-page.tsx` | Client component |
| Timetable | `src/features/timetable/timetable-page.tsx` | Client component |
| Settings | `src/features/settings/settings-page.tsx` | Client component |

All feature components are `'use client'` because they use TanStack Query hooks, `useSession`, and interactive UI.

### Feature Component Pattern

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function FeaturePage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const supabase = createClient()

  // TanStack Query hooks
  // render logic with loading/empty/error states
}
```

---

## 5. Form Patterns

### Dialog + TanStack Query Mutate

All CRUD forms use shadcn/ui Dialog with local state for form fields and `useMutation` for the data write.

```typescript
const [open, setOpen] = useState(false)
const [editingId, setEditingId] = useState<string | null>(null)
const [name, setName] = useState('')
const [color, setColor] = useState('#2563eb')

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

const updateMutation = useMutation({
  mutationFn: async (values: { id: string; name: string; color: string }) => {
    const { error } = await supabase.from('subjects')
      .update({ name: values.name, color: values.color })
      .eq('id', values.id)
    if (error) throw error
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['subjects'] })
  },
})
```

### Form Field Management

- Form state is managed with local `useState` hooks (not React Hook Form — forms are simple enough)
- Validation is manual (check for empty `.trim()` before submit)
- Labels use `<Label htmlFor="...">` for accessibility
- Each input has a unique `id` matching the label's `htmlFor`

### Delete Pattern

Deletions use `window.confirm()` for simplicity:

```typescript
function handleDelete(id: string, name: string) {
  if (window.confirm(`Delete "${name}"?`)) {
    deleteMutation.mutate(id)
  }
}
```

---

## 6. Loading / Error / Empty State Patterns

### Loading State

Every data-fetching component shows `Skeleton` components while loading:

```typescript
if (isLoading) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3 pt-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-8" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

Skeleton shapes match the final content layout:
- `Skeleton className="h-8 w-8 rounded-full"` for circles/dots
- `Skeleton className="h-4 w-24"` for text lines
- `Skeleton className="h-14 w-full"` for list items

### Error State

```typescript
if (error) {
  return <div>Failed to load: {(error as Error).message}</div>
}
```

Errors show a descriptive message. TanStack Query's built-in retry mechanism handles transient failures.

### Empty State

```typescript
if (data.length === 0) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
        <div className="text-center">
          <p className="font-medium">No subjects yet</p>
          <p className="text-sm text-muted-foreground">Add your first subject to get started</p>
        </div>
        <Button onClick={openAdd} variant="outline">Add Subject</Button>
      </CardContent>
    </Card>
  )
}
```

Empty states have:
- Large icon (lucide-react, `text-muted-foreground/50`)
- Title: "No [items] yet"
- Subtitle: helpful context
- CTA button to create the first item

---

## 7. Event Handling

The app uses standard React event handling (no event delegation pattern from the old prototype). All events are bound through JSX attributes:

```typescript
<Button onClick={handleSave} disabled={!name.trim() || isPending}>
  {editingId ? 'Save Changes' : 'Add Subject'}
</Button>

<Button
  variant="ghost"
  size="icon-sm"
  onClick={() => openEdit(subject)}
  aria-label={`Edit ${subject.name}`}
>
  <Pencil className="h-4 w-4" />
</Button>
```

shadcn/ui components provide accessible interactions out of the box (focus management, keyboard navigation, ARIA attributes).

---

## 8. Accessibility Patterns

- Every interactive element has `aria-label` when the action is not obvious from visible text
- Every icon has `aria-hidden="true"` (decorative) or the button has `aria-label`
- Form inputs use `<Label htmlFor="...">` (never placeholders as labels)
- Focus-visible outlines are applied globally via `globals.css`: `* { @apply border-border outline-ring/50; }`
- Color is never the sole indicator of state — badges show text labels alongside colour

---

## 9. Shared Components

Reusable domain-specific components in `src/components/shared/`.

### AttendanceActions (`src/components/shared/attendance-actions.tsx`)

Four-button group for setting attendance status (Present/Absent/Cancelled/Holiday). Shows a spinner on the clicked button while the mutation is pending. Used on both the dashboard and attendance page.

```typescript
<AttendanceActions
  currentStatus={instance.attendance?.status ?? null}
  onChange={(status) => handleStatusClick(instance, status)}
  disabled={isPending}
  pendingStatus={pendingStatus?.instanceId === instance.id ? pendingStatus.status : null}
  size="sm" // optional — 'default' | 'sm'
/>
```

### OfflineBanner (`src/components/shared/offline-banner.tsx`)

Fixed banner at the top of the viewport. Shows amber background with "You're offline" when `navigator.onLine` is false, or a spinner with "Syncing pending changes…" when mutations are queued. Uses the `useOfflineStatus` hook from `src/lib/offline/use-offline-status.ts`.

### LoadingBar (`src/components/shared/loading-bar.tsx`)

Top-of-page progress bar that shows during route transitions.

---

## 10. Responsive Layout

All feature components use Tailwind's responsive prefixes:

```
Grid:     grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
Padding:  p-4 md:p-6 lg:p-8
Layout:   stack on mobile, sidebar on desktop (via AppShell media queries)
```

No JavaScript-based responsive logic — all layout changes are handled by Tailwind breakpoints:

- **Mobile (default):** Single column, full-width content
- **Tablet (768px+):** Multi-column grids, sidebar visible
- **Desktop (1024px+):** Full sidebar, wider cards, 3-4 column layouts

---

## 11. Performance Characteristics

- **TanStack Query caching:** Server data cached in memory, stale times configured per resource (2–30 min)
- **localStorage persistence:** Query cache persists across page reloads via PersistQueryClientProvider
- **Optimistic updates:** All mutations apply instantly to local cache, rollback on error
- **No redundant re-renders:** Zustand atomic selectors prevent unnecessary component updates
- **Skeleton loading:** Placeholder UI during data fetch prevents layout shift
- **Lazy 'use client':** Only interactive pages are client components; layout is a server component
- **No virtual DOM overhead:** React's built-in diffing is sufficient for the data sizes involved
