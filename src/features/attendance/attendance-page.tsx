'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ClassInstance, Subject, ClassType, AttendanceStatus } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarDays, AlertCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLocalDateKey } from '@/lib/utils/dates'

const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  theory: 'Theory',
  clinical: 'Clinical',
  practical: 'Practical',
  tutorial: 'Tutorial',
  exam: 'Exam',
}

const ATTENDANCE_ACTIONS: {
  status: AttendanceStatus
  symbol: string
  label: string
  className: string
}[] = [
  { status: 'present', symbol: '●', label: 'Present', className: 'text-green-500' },
  { status: 'absent', symbol: '○', label: 'Absent', className: 'text-red-500' },
  { status: 'cancelled', symbol: '—', label: 'Cancelled', className: 'text-amber-500' },
  { status: 'holiday', symbol: '✕', label: 'Holiday', className: 'text-sky-500' },
]

function mapSubject(row: Record<string, unknown>): Subject {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    color: row.color as string,
    semesterId: (row.semester_id as string) ?? null,
    createdAt: row.created_at as string,
  }
}

function mapClassInstance(row: Record<string, unknown>): ClassInstance {
  const subject = row.subject
    ? mapSubject(row.subject as Record<string, unknown>)
    : undefined
  const attendanceArr = row.attendance as Record<string, unknown>[] | undefined
  let attendance = undefined
  if (attendanceArr && attendanceArr.length > 0) {
    attendance = {
      id: attendanceArr[0].id as string,
      userId: attendanceArr[0].user_id as string,
      classInstanceId: attendanceArr[0].class_instance_id as string,
      status: attendanceArr[0].status as AttendanceStatus,
      note: (attendanceArr[0].note as string) ?? '',
      markedAt: attendanceArr[0].marked_at as string,
    }
  }
  return {
    id: row.id as string,
    userId: row.user_id as string,
    recurringClassId: (row.recurring_class_id as string) ?? null,
    date: row.date as string,
    startTime: row.start_time as string,
    endTime: (row.end_time as string) ?? null,
    subjectId: row.subject_id as string,
    subject,
    classType: row.class_type as ClassType,
    attendance,
  }
}

export function AttendancePage() {
  const queryClient = useQueryClient()

  const [selectedDate, setSelectedDate] = useState(() => getLocalDateKey())

  const { data: attendanceData, isLoading, isError } = useQuery({
    queryKey: ['class-instances', selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/attendance?date=${encodeURIComponent(selectedDate)}`)
      if (!response.ok) throw new Error('Could not load classes')
      const data = await response.json() as { instances: Record<string, unknown>[] }
      return data.instances.map(mapClassInstance)
    },
  })
  const instances = attendanceData

  const upsertMutation = useMutation({
    mutationFn: async ({
      classInstanceId,
      status,
    }: {
      classInstanceId: string
      status: AttendanceStatus
    }) => {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classInstanceId, status }),
      })
      if (!response.ok) throw new Error('Could not save attendance')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-instances', selectedDate] })
      queryClient.invalidateQueries({ queryKey: ['today-classes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  function handleStatusClick(instance: ClassInstance, status: AttendanceStatus) {
    if (instance.attendance?.status === status) return
    if (!window.confirm(`Set ${instance.subject?.name ?? 'this class'} as ${status}?`)) return
    upsertMutation.mutate({
      classInstanceId: instance.id,
      status,
    })
  }

  function formatTime(time: string | null): string {
    if (!time) return ''
    return time.slice(0, 5)
  }

  function shiftDate(days: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(getLocalDateKey(d))
  }

  const isPending = upsertMutation.isPending

  const displayDate = new Date(selectedDate).toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">Mark attendance for your classes</p>
        </div>

        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
          <Button variant="ghost" size="icon-sm" onClick={() => shiftDate(-1)} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[140px] h-8 bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 font-medium"
            />
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => shiftDate(1)} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-destructive">Something went wrong.</p>
            <p className="text-xs text-destructive/80 mt-1 mb-4">Could not load your classes for this date.</p>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['class-instances', selectedDate] })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : instances && instances.length > 0 ? (
        <div className="space-y-2">
          {instances.map((instance) => {
            const subjectColor = instance.subject?.color ?? '#888'
            const currentStatus = instance.attendance?.status ?? null
            return (
              <div
                key={instance.id}
                className="group flex items-center gap-4 rounded-lg border bg-card p-3 transition-all hover:bg-muted/30 hover:border-border/80"
                style={{ borderLeftWidth: 3, borderLeftColor: subjectColor }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {instance.subject?.name ?? 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(instance.startTime)}
                      {instance.endTime ? ` - ${formatTime(instance.endTime)}` : ''}
                    </span>
                    <span className="text-text-3">·</span>
                    <span>{CLASS_TYPE_LABELS[instance.classType]}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label={`Set attendance for ${instance.subject?.name ?? 'class'}`}>
                  {ATTENDANCE_ACTIONS.map((action) => (
                    <Button
                      key={action.status}
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className={cn(
                        'h-7 w-7 rounded-md text-sm leading-none opacity-70 hover:opacity-100',
                        action.className,
                        currentStatus === action.status && 'bg-muted opacity-100 ring-1 ring-current'
                      )}
                      onClick={() => handleStatusClick(instance, action.status)}
                      disabled={isPending}
                      aria-label={`Mark ${action.label}`}
                      aria-pressed={currentStatus === action.status}
                      title={action.label}
                    >
                      {action.symbol}
                    </Button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="border border-dashed border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <CalendarDays className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold">No classes on this date</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                You don&apos;t have any classes scheduled for {displayDate}.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => shiftDate(-1)}>Previous Day</Button>
              <Button variant="outline" size="sm" onClick={() => shiftDate(1)}>Next Day</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
