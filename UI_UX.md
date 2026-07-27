# UI_UX.md — Design System, Visual Direction & Screen Descriptions

> This document describes the **Next.js rewrite** (`academic-planner/`). The old prototype in `rotations/` used a different design system (native CSS variables, emoji icons).

---

## Design Principles

1. **Calm above all.** White space is a feature, not wasted space. Every screen should feel airy, not dense.
2. **Answers one question.** Every screen primarily answers "What do I need to do right now?" — secondary information is de-emphasised.
3. **Colour with purpose.** Subject colours provide visual variety. Semantic colours are used only where functionally necessary.
4. **Generous but not loose.** Ample padding but information is still scannable at a glance.
5. **Touch-first, mouse-friendly.** Large tap targets (min 44px), generous spacing, smooth gestures.
6. **Starship trim level.** No visual noise — no redundant borders, no decorative flourishes that don't carry information.

---

## Font

| Role | Font | Source |
|------|------|--------|
| Sans (headings + body) | Geist | `next/font/google` — loaded as `--font-sans` |
| Mono | Geist Mono | `next/font/google` — loaded as `--font-geist-mono` |

```tsx
// src/app/layout.tsx
const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
```

Applied globally via `globals.css`:
```css
@theme inline {
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
}
```

---

## Dark/Light Theme

Managed by `next-themes` via `ThemeProvider`:

```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
  {children}
</ThemeProvider>
```

- **Dark mode is the default.** The `.dark` class is applied to `<html>` by default.
- **Light mode** toggled by removing the `.dark` class.
- Theme is persisted in localStorage by `next-themes`.
- Toggle component: `src/components/layout/theme-toggle.tsx` with Sun/Moon icons.

---

## CSS Variables

Defined in `src/app/globals.css` using OKLCH colour space:

### :root (Light)

| Variable | Value | Usage |
|----------|-------|-------|
| `--background` | `oklch(1 0 0)` | Page background |
| `--foreground` | `oklch(0.145 0 0)` | Primary text |
| `--card` | `oklch(1 0 0)` | Card background |
| `--card-foreground` | `oklch(0.145 0 0)` | Card text |
| `--popover` | `oklch(1 0 0)` | Popover background |
| `--popover-foreground` | `oklch(0.145 0 0)` | Popover text |
| `--primary` | `oklch(0.205 0 0)` | Primary button bg |
| `--primary-foreground` | `oklch(0.985 0 0)` | Primary button text |
| `--secondary` | `oklch(0.97 0 0)` | Secondary button bg |
| `--secondary-foreground` | `oklch(0.205 0 0)` | Secondary button text |
| `--muted` | `oklch(0.97 0 0)` | Muted background |
| `--muted-foreground` | `oklch(0.556 0 0)` | Muted text |
| `--accent` | `oklch(0.97 0 0)` | Accent background |
| `--accent-foreground` | `oklch(0.205 0 0)` | Accent text |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Destructive actions |
| `--border` | `oklch(0.922 0 0)` | Borders, dividers |
| `--input` | `oklch(0.922 0 0)` | Input borders |
| `--ring` | `oklch(0.708 0 0)` | Focus rings |
| `--radius` | `0.625rem` | Base border radius |

### .dark (Dark Mode)

| Variable | Value | Usage |
|----------|-------|-------|
| `--background` | `oklch(0.145 0 0)` | Page background |
| `--foreground` | `oklch(0.985 0 0)` | Primary text |
| `--card` | `oklch(0.205 0 0)` | Card background |
| `--muted-foreground` | `oklch(0.708 0 0)` | Muted text |
| `--border` | `oklch(1 0 0 / 10%)` | Borders |
| `--input` | `oklch(1 0 0 / 15%)` | Input borders |
| `--ring` | `oklch(0.556 0 0)` | Focus rings |

All chart and sidebar colour variables follow the same dark/light switching pattern.

---

## Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `0.375rem` | Small badges, tags |
| `--radius-md` | `0.5rem` | Inputs, buttons |
| `--radius-lg` | `0.625rem` | Cards, dialogs |
| `--radius-xl` | `0.875rem` | Larger containers |
| `--radius-2xl` | `1.125rem` | Modals |
| `--radius-3xl` | `1.375rem` | Special surfaces |
| `--radius-4xl` | `1.625rem` | Maximum rounding |

---

## shadcn/ui Primitives Used

24 components from shadcn/ui are installed and used throughout the app:

| Component | File | Usage |
|-----------|------|-------|
| `avatar` | `src/components/ui/avatar.tsx` | User avatar in sidebar |
| `badge` | `src/components/ui/badge.tsx` | Status badges, class type, priority |
| `button` | `src/components/ui/button.tsx` | All interactive actions |
| `calendar` | `src/components/ui/calendar.tsx` | Date picker widgets |
| `card` | `src/components/ui/card.tsx` | Dashboard stat cards, feature containers |
| `checkbox` | `src/components/ui/checkbox.tsx` | Task completion toggle |
| `command` | `src/components/ui/command.tsx` | Search/select command palettes |
| `dialog` | `src/components/ui/dialog.tsx` | CRUD forms, confirmations |
| `dropdown-menu` | `src/components/ui/dropdown-menu.tsx` | Context menus, actions |
| `input` | `src/components/ui/input.tsx` | Form text inputs |
| `input-group` | `src/components/ui/input-group.tsx` | Grouped input + label |
| `label` | `src/components/ui/label.tsx` | Form labels |
| `popover` | `src/components/ui/popover.tsx` | Inline selectors |
| `progress` | `src/components/ui/progress.tsx` | Attendance progress bars |
| `scroll-area` | `src/components/ui/scroll-area.tsx` | Scrollable sidebar nav |
| `select` | `src/components/ui/select.tsx` | Dropdown selects |
| `separator` | `src/components/ui/separator.tsx` | Visual dividers |
| `sheet` | `src/components/ui/sheet.tsx` | Slide-in panels |
| `sidebar` | `src/components/ui/sidebar.tsx` | Desktop sidebar navigation |
| `skeleton` | `src/components/ui/skeleton.tsx` | Loading state placeholders |
| `table` | `src/components/ui/table.tsx` | Data tables |
| `tabs` | `src/components/ui/tabs.tsx` | Analytics, calendar mode switching |
| `textarea` | `src/components/ui/textarea.tsx` | Multi-line text input |
| `tooltip` | `src/components/ui/tooltip.tsx` | Hover tooltips |

---

## App Layout

### Desktop (1024px+)

```
┌──────────────────────────────────────────────────┐
│ ┌──────────┐  ┌────────────────────────────────┐ │
│ │ SIDEBAR  │  │  MAIN CONTENT                   │ │
│ │ 256px    │  │  padding: 2rem                  │ │
│ │          │  │                                 │ │
│ │ Logo     │  │  ┌───────┐ ┌───────┐ ┌──────┐ │ │
│ │ [Nav]    │  │  │ Stat  │ │ Stat  │ │ Stat │ │ │
│ │ [Nav]    │  │  └───────┘ └───────┘ └──────┘ │ │
│ │ [Nav]    │  │                                 │ │
│ │ ...      │  │  [Content Area]                 │ │
│ │          │  │                                 │ │
│ │ Theme    │  │                                 │ │
│ └──────────┘  └────────────────────────────────┘ │
│                                  BOTTOM NAV (hidden)│
└──────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌────────────────────────────────┐
│ HEADER: Logo         [Theme]   │
│ [Menu Button]                  │
├────────────────────────────────┤
│                                │
│  MAIN CONTENT                  │
│  padding: 1rem                 │
│                                │
│  ┌──────┐ ┌──────┐            │
│  │ Stat  │ │ Stat │            │
│  └──────┘ └──────┘            │
│                                │
│  [Content Area]                │
│                                │
├────────────────────────────────┤
│ BOTTOM NAV (6 tabs)           │
│ [Dash][Time][Subj][Cal][Task] │
│ [Analytics]                    │
└────────────────────────────────┘
```

---

## Layout Components

### AppShell (`src/components/layout/app-shell.tsx`)

- Desktop: Left sidebar (256px, border-right, scrollable nav) + main content
- Mobile: Top header with logo/theme-toggle/mobile-nav + bottom tab bar (6 tabs) + main content
- Sidebar links: Dashboard, Timetable, Subjects, Attendance, Calendar, Tasks, Analytics, Calculator, Settings
- Animation: `motion.div` with page transition (opacity + y-axis) on route change via `key={pathname}`
- ThemeToggle in sidebar (desktop) and header (mobile)

### ThemeToggle (`src/components/layout/theme-toggle.tsx`)

- Uses `useTheme()` from `next-themes`
- Sun/Moon icons from `lucide-react`
- Toggles between 'dark' and 'light'

---

## Responsive Breakpoints

| Breakpoint | Min-Width | Changes |
|------------|-----------|---------|
| Mobile | 0 | Single column, bottom nav, top header |
| Tablet | 768px | Sidebar appears, cards 2-column |
| Desktop | 1024px | Full sidebar, stat cards 4-column, subject cards 3-column |

---

## Subject Colour System

Subject colours are user-assigned via a colour picker in the subject form. No curated palette is enforced — any hex colour is valid. Colours are used for:

- Dot next to subject name in cards and lists
- Calendar cell backgrounds (multi-colour via gradient in month view)
- Border accents on class instance cards
- Chart bars in analytics

---

## Animations

Uses `motion.dev` (React) for page transitions and staggered children.

| Element | Animation | Details |
|---------|-----------|---------|
| Page transitions | opacity + translateY | `initial: { opacity: 0, y: 8 }`, `animate: { opacity: 1, y: 0 }`, 200ms |
| Stagger cards | StaggerChildren | 50ms delay between each card, opacity + y: 12 |
| Sidebar links | Slide-in | `initial: { opacity: 0, x: -12 }`, 30ms stagger |
| Theme toggle | Smooth colour | CSS transitions on background/text/border |

### Reduced Motion

Disabled via `prefers-reduced-motion: reduce` media query — all motion durations set to 0.01ms.

---

## Icon Library

- **lucide-react** — All UI icons (Calendar, CheckSquare, ClipboardCheck, LayoutDashboard, Settings, BookOpen, BarChart3, Clock, GraduationCap, Sun, Moon, Plus, Pencil, Trash2, etc.)
- All icons have `aria-hidden="true"` when decorative, or `aria-label` on parent buttons

---

## Accessibility

- **Focus styles:** All interactive elements have visible focus-visible outlines (via `outline-ring/50` in `globals.css`)
- **Icon labels:** Every icon has `aria-label` or `aria-hidden="true"`
- **Colour independence:** Status uses colour + text labels (present/absent/cancelled/holiday badges)
- **Form labels:** Every form input has an associated `<Label>` with `htmlFor`
- **Keyboard navigation:** All features navigable via keyboard (shadcn/ui primitives handle this)
- **Semantic HTML:** Proper heading hierarchy, `<nav>`, `<main>`, `<aside>`, `<header>` elements

---

## Loading States

All data-fetching views use `Skeleton` components from shadcn/ui:

- **Stat cards:** Skeleton of 3-4 lines matching card layout
- **Lists:** Repeated skeleton rows matching list item height
- **Grids:** Skeleton cards matching grid card dimensions

Usage pattern:
```tsx
const { data, isLoading } = useQuery({ ... })

if (isLoading) return <SubjectSkeleton />
```

---

## Empty States

Every list/grid has a designed empty state with:

- A large icon (from lucide-react) at reduced opacity
- A title: "No [items] yet"
- A subtitle with helpful context
- A CTA button to create the first item

Example (Subjects):
```tsx
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
```

---

## Error States

TanStack Query provides error state handling:

```tsx
const { data, isLoading, error } = useQuery({ ... })

if (error) return <div>Failed to load: {(error as Error).message}</div>
```

Error states show a descriptive message with a retry mechanism (TanStack Query's built-in refetch).
