'use client'

import { Button } from '@/components/ui/button'
import type { AttendanceStatus } from '@/types'
import { cn } from '@/lib/utils'
import { Loader2, Check, X, Minus, Plane } from 'lucide-react'

const ATTENDANCE_ACTIONS: {
  status: AttendanceStatus
  icon: React.ComponentType<{ className?: string }>
  label: string
  activeClass: string
  hoverClass: string
}[] = [
  { status: 'present', icon: Check, label: 'Present', activeClass: 'bg-green-500/15 text-green-600 dark:text-green-400 ring-1 ring-green-500/30', hoverClass: 'hover:bg-green-500/10 hover:text-green-600' },
  { status: 'absent', icon: X, label: 'Absent', activeClass: 'bg-red-500/15 text-red-600 dark:text-red-400 ring-1 ring-red-500/30', hoverClass: 'hover:bg-red-500/10 hover:text-red-600' },
  { status: 'cancelled', icon: Minus, label: 'Cancelled', activeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30', hoverClass: 'hover:bg-amber-500/10 hover:text-amber-600' },
  { status: 'holiday', icon: Plane, label: 'Holiday', activeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30', hoverClass: 'hover:bg-sky-500/10 hover:text-sky-600' },
]

export { ATTENDANCE_ACTIONS }

export function AttendanceActions({
  currentStatus,
  onChange,
  disabled,
  pendingStatus,
  size = 'default',
}: {
  currentStatus: AttendanceStatus | null
  onChange: (status: AttendanceStatus) => void
  disabled: boolean
  pendingStatus?: AttendanceStatus | null
  size?: 'default' | 'sm'
}) {
  const isSmall = size === 'sm'
  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1" role="group" aria-label="Set attendance status">
      {ATTENDANCE_ACTIONS.map((action) => {
        const isPending = pendingStatus === action.status
        const isActive = currentStatus === action.status
        const Icon = action.icon
        return (
          <Button
            key={action.status}
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn(
              isSmall ? 'h-8 w-8 sm:h-7 sm:w-7' : 'h-9 w-9 sm:h-8 sm:w-8',
              'rounded-lg text-sm leading-none transition-all duration-150',
              isActive
                ? action.activeClass
                : cn('opacity-60 hover:opacity-100', action.hoverClass)
            )}
            onClick={() => onChange(action.status)}
            disabled={disabled || isPending}
            aria-label={`Mark ${action.label}`}
            aria-pressed={isActive}
            title={action.label}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
          </Button>
        )
      })}
    </div>
  )
}
