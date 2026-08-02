/**
 * Universal Color Palette for Academic Planner
 * 
 * Centralized color definitions for easy theme changes.
 * Import from '@/lib/colors' to use these in components.
 * 
 * For CSS variables, see src/app/globals.css
 */

// ============================================
// BRAND COLORS
// ============================================
export const BRAND = {
  /** Primary purple - used for buttons, links, active states */
  primary: {
    light: 'oklch(0.45 0.187 286)',    // Deep purple
    dark: 'oklch(0.75 0.18 286)',      // Bright purple
  },
  /** Gradient for text and accents */
  gradient: {
    from: 'oklch(0.75 0.18 286)',      // Purple
    to: 'oklch(0.70 0.22 310)',        // Pink-purple
  },
} as const

// ============================================
// SEMANTIC STATUS COLORS
// ============================================
export const STATUS = {
  present: {
    light: 'oklch(0.55 0.18 155)',     // Green
    dark: 'oklch(0.70 0.18 155)',
    bg: { light: 'oklch(0.55 0.18 155 / 12%)', dark: 'oklch(0.70 0.18 155 / 12%)' },
    hex: { light: '#22c55e', dark: '#4ade80' },
    tailwind: { light: 'text-green-500', dark: 'text-green-400' },
  },
  absent: {
    light: 'oklch(0.577 0.245 27.325)', // Red
    dark: 'oklch(0.65 0.22 25)',
    bg: { light: 'oklch(0.577 0.245 27.325 / 12%)', dark: 'oklch(0.65 0.22 25 / 12%)' },
    hex: { light: '#ef4444', dark: '#f87171' },
    tailwind: { light: 'text-red-500', dark: 'text-red-400' },
  },
  cancelled: {
    light: 'oklch(0.75 0.15 85)',      // Amber
    dark: 'oklch(0.80 0.15 85)',
    bg: { light: 'oklch(0.75 0.15 85 / 12%)', dark: 'oklch(0.80 0.15 85 / 12%)' },
    hex: { light: '#f59e0b', dark: '#fbbf24' },
    tailwind: { light: 'text-amber-500', dark: 'text-amber-400' },
  },
  holiday: {
    light: 'oklch(0.55 0.15 255)',     // Blue
    dark: 'oklch(0.65 0.15 255)',
    bg: { light: 'oklch(0.55 0.15 255 / 12%)', dark: 'oklch(0.65 0.15 255 / 12%)' },
    hex: { light: '#3b82f6', dark: '#60a5fa' },
    tailwind: { light: 'text-blue-500', dark: 'text-blue-400' },
  },
} as const

// ============================================
// ATTENDANCE STATUS COMBINED
// ============================================
export const ATTENDANCE_COLORS = {
  present: STATUS.present.hex,
  absent: STATUS.absent.hex,
  cancelled: STATUS.cancelled.hex,
  holiday: STATUS.holiday.hex,
} as const

// ============================================
// SEMESTER / PERIOD COLORS
// ============================================
export const SEMESTER_COLORS = {
  purple: { hex: '#8b5cf6', tailwind: 'bg-purple-500' },
  blue: { hex: '#3b82f6', tailwind: 'bg-blue-500' },
  green: { hex: '#22c55e', tailwind: 'bg-green-500' },
  amber: { hex: '#f59e0b', tailwind: 'bg-amber-500' },
  red: { hex: '#ef4444', tailwind: 'bg-red-500' },
  pink: { hex: '#ec4899', tailwind: 'bg-pink-500' },
  indigo: { hex: '#6366f1', tailwind: 'bg-indigo-500' },
  teal: { hex: '#14b8a6', tailwind: 'bg-teal-500' },
  orange: { hex: '#f97316', tailwind: 'bg-orange-500' },
  cyan: { hex: '#06b6d4', tailwind: 'bg-cyan-500' },
} as const

// ============================================
// DEFAULT SUBJECT COLORS (for color picker)
// ============================================
export const SUBJECT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#64748b', // slate
  '#6b7280', // gray
] as const

// ============================================
// PRIORITY COLORS (for tasks)
// ============================================
export const PRIORITY_COLORS = {
  high: { hex: '#ef4444', tailwind: 'text-red-500', bg: 'bg-red-500/10' },
  medium: { hex: '#8b5cf6', tailwind: 'text-purple-500', bg: 'bg-purple-500/10' },
  low: { hex: '#6b7280', tailwind: 'text-gray-500', bg: 'bg-gray-500/10' },
} as const

// ============================================
// STAT CARD GRADIENTS (for dashboard)
// ============================================
export const STAT_GRADIENTS = {
  purple: 'stat-gradient-purple',
  green: 'stat-gradient-green',
  amber: 'stat-gradient-amber',
  blue: 'stat-gradient-blue',
} as const

// ============================================
// CHART COLORS (for analytics)
// ============================================
export const CHART_COLORS = [
  'oklch(0.60 0.20 286)',  // Purple
  'oklch(0.65 0.18 165)',  // Green
  'oklch(0.60 0.20 330)',  // Pink
  'oklch(0.70 0.15 85)',   // Amber
  'oklch(0.55 0.22 30)',   // Red
] as const

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get attendance color hex based on status */
export function getAttendanceColor(status: string, mode: 'light' | 'dark' = 'dark'): string {
  const colors = ATTENDANCE_COLORS[status as keyof typeof ATTENDANCE_COLORS]
  return colors?.[mode] ?? '#6b7280'
}

/** Get priority color based on level */
export function getPriorityColor(priority: string) {
  return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] ?? PRIORITY_COLORS.low
}

/** Get a subject color by index (cycles through the palette) */
export function getSubjectColor(index: number): string {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length]
}
