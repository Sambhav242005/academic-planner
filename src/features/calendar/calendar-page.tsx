'use client'

import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/stores/app-store'
import { getMonthDays, getWeekDays, DAY_NAMES, isToday, startOfWeek, endOfWeek } from '@/lib/utils/dates'
import { isIndianHoliday } from '@/lib/utils/indian-holidays'
import type { ClassInstance, Subject, AttendanceRecord, AttendanceStatus, ClassType, Holiday } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  AlertCircle,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  theory: 'Theory',
  clinical: 'Clinical',
  practical: 'Practical',
  tutorial: 'Tutorial',
  exam: 'Exam',
}

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  cancelled: 'Cancelled',
  holiday: 'Holiday',
}

function dateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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
  let attendance: AttendanceRecord | undefined
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

function mapHoliday(row: Record<string, unknown>): Holiday {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    date: row.date as string,
  }
}

function formatTime(time: string | null): string {
  if (!time) return ''
  return time.slice(0, 5)
}

function getMonthGrid(year: number, month: number): Date[] {
  const days = getMonthDays(year, month)
  const gridStart = startOfWeek(days[0])
  const gridEnd = endOfWeek(days[days.length - 1])
  const grid: Date[] = []
  const cur = new Date(gridStart)
  while (cur <= gridEnd) {
    grid.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return grid
}

interface GroupedInstances {
  [date: string]: ClassInstance[]
}

export function CalendarPage() {
  const queryClient = useQueryClient()

  const { calendar, setCalendarView, setCalendarDate, setSelectedDate } = useAppStore()
  const { year, month, view, selectedDate } = calendar

  const selDate = new Date(selectedDate + 'T00:00:00')

  const rangeBounds = useMemo(() => {
    if (view === 'month') {
      const days = getMonthDays(year, month)
      return { start: startOfWeek(days[0]), end: endOfWeek(days[days.length - 1]) }
    }
    if (view === 'week') {
      const start = startOfWeek(selDate)
      const end = endOfWeek(selDate)
      return { start, end }
    }
    return { start: selDate, end: selDate }
  }, [view, year, month, selDate])

  const rangeStartStr = dateStr(rangeBounds.start)
  const rangeEndStr = dateStr(rangeBounds.end)

  const { data: calendarData, isLoading: instancesLoading, isError: instancesError, error: instancesErrorObj } = useQuery({
    queryKey: ['class-instances', 'calendar', rangeStartStr, rangeEndStr],
    queryFn: async () => {
      const response = await fetch(`/api/calendar?start=${encodeURIComponent(rangeStartStr)}&end=${encodeURIComponent(rangeEndStr)}`)
      if (!response.ok) throw new Error('Could not load calendar')
      const data = await response.json() as { instances: Record<string, unknown>[]; holidays: Record<string, unknown>[] }
      return { instances: data.instances.map(mapClassInstance), holidays: data.holidays.map(mapHoliday) }
    },
  })
  const instances = calendarData?.instances
  const holidays = calendarData?.holidays

  const groupedByDate: GroupedInstances = useMemo(() => {
    const groups: GroupedInstances = {}
    if (instances) {
      for (const inst of instances) {
        if (!groups[inst.date]) groups[inst.date] = []
        groups[inst.date].push(inst)
      }
    }
    return groups
  }, [instances])

  const holidaySet: Set<string> = useMemo(() => {
    return new Set((holidays ?? []).map(h => h.date))
  }, [holidays])

  function handlePrev() {
    if (view === 'month') {
      const newMonth = month - 1
      const newYear = newMonth < 0 ? year - 1 : year
      const adjustedMonth = newMonth < 0 ? 11 : newMonth
      setCalendarDate(newYear, adjustedMonth)
      setSelectedDate(dateStr(new Date(newYear, adjustedMonth, 1)))
    } else if (view === 'week') {
      const d = new Date(selDate)
      d.setDate(d.getDate() - 7)
      setSelectedDate(dateStr(d))
      setCalendarDate(d.getFullYear(), d.getMonth())
    } else {
      const d = new Date(selDate)
      d.setDate(d.getDate() - 1)
      setSelectedDate(dateStr(d))
      setCalendarDate(d.getFullYear(), d.getMonth())
    }
  }

  function handleNext() {
    if (view === 'month') {
      const newMonth = month + 1
      const newYear = newMonth > 11 ? year + 1 : year
      const adjustedMonth = newMonth > 11 ? 0 : newMonth
      setCalendarDate(newYear, adjustedMonth)
      setSelectedDate(dateStr(new Date(newYear, adjustedMonth, 1)))
    } else if (view === 'week') {
      const d = new Date(selDate)
      d.setDate(d.getDate() + 7)
      setSelectedDate(dateStr(d))
      setCalendarDate(d.getFullYear(), d.getMonth())
    } else {
      const d = new Date(selDate)
      d.setDate(d.getDate() + 1)
      setSelectedDate(dateStr(d))
      setCalendarDate(d.getFullYear(), d.getMonth())
    }
  }

  function handleToday() {
    const now = new Date()
    setCalendarDate(now.getFullYear(), now.getMonth())
    setSelectedDate(dateStr(now))
  }

  function handleDayClick(day: Date) {
    setSelectedDate(dateStr(day))
    setCalendarDate(day.getFullYear(), day.getMonth())
    setCalendarView('day')
  }

  const navLabel = useMemo(() => {
    if (view === 'month') {
      const d = new Date(year, month, 1)
      return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    }
    if (view === 'week') {
      const start = startOfWeek(selDate)
      const end = endOfWeek(selDate)
      const fmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
      return `${start.toLocaleDateString('en-IN', fmt)} – ${end.toLocaleDateString('en-IN', { ...fmt, year: 'numeric' })}`
    }
    return selDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }, [view, year, month, selDate])

  if (instancesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">View your class schedule</p>
          </div>
        </div>
        {view === 'month' ? (
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((day, i) => (
              <Skeleton key={i} className="h-6 w-full rounded-md" />
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full rounded-lg" />
            ))}
          </div>
        ) : view === 'week' ? (
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-10 w-full rounded-md" />
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (instancesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">View your class schedule</p>
          </div>
        </div>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-2" />
            <div className="text-center">
              <p className="font-medium text-destructive">Failed to load calendar</p>
              <p className="text-sm text-destructive/80 mt-1">
                {(instancesErrorObj as Error)?.message ?? 'An unexpected error occurred'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['class-instances', 'calendar'] })}
              aria-label="Retry loading calendar"
              className="mt-2"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">View your class schedule</p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted/50 p-1" role="tablist" aria-label="Calendar view mode">
          {(['month', 'week', 'day'] as const).map((mode) => (
            <button
              key={mode}
              role="tab"
              aria-selected={view === mode}
              onClick={() => setCalendarView(mode)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                view === mode
                  ? 'bg-background text-foreground ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            aria-label="Previous"
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-[180px] text-center font-semibold text-lg">
            {navLabel}
          </p>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            aria-label="Next"
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={handleToday} aria-label="Go to today" className="font-medium">
          <CalendarDays className="h-4 w-4 mr-1.5" />
          Today
        </Button>
      </div>

      {view === 'month' && (
        <MonthView
          year={year}
          month={month}
          holidaySet={holidaySet}
          groupedByDate={groupedByDate}
          onDayClick={handleDayClick}
        />
      )}

      {view === 'week' && (
        <WeekView
          selDate={selDate}
          holidaySet={holidaySet}
          groupedByDate={groupedByDate}
          onDayClick={handleDayClick}
        />
      )}

      {view === 'day' && (
        <DayView
          selDate={selDate}
          selectedDateStr={selectedDate}
          groupedByDate={groupedByDate}
          holidaySet={holidaySet}
        />
      )}
    </div>
  )
}

interface DayAttendance {
  present: number
  absent: number
  cancelled: number
  holiday: number
  total: number
}

function getDayAttendance(date: string, groupedByDate: GroupedInstances): DayAttendance {
  const insts = groupedByDate[date] ?? []
  const att: DayAttendance = { present: 0, absent: 0, cancelled: 0, holiday: 0, total: insts.length }
  for (const inst of insts) {
    const status = inst.attendance?.status
    if (status === 'present') att.present++
    else if (status === 'absent') att.absent++
    else if (status === 'cancelled') att.cancelled++
    else if (status === 'holiday') att.holiday++
  }
  return att
}

function attendancePct(att: DayAttendance): number {
  const effective = att.total - att.cancelled - att.holiday
  return effective > 0 ? Math.round((att.present / effective) * 100) : -1
}

function cellConicGradient(att: DayAttendance): string | null {
  const total = att.present + att.absent + att.cancelled + att.holiday
  if (total === 0) return null
  const segments: string[] = []
  let degrees = 0
  const addSegment = (count: number, color: string) => {
    if (count === 0) return
    const pct = (count / total) * 100
    segments.push(`${color} ${degrees}deg ${degrees + (pct / 100) * 360}deg`)
    degrees += (pct / 100) * 360
  }
  addSegment(att.present, '#22c55e')
  addSegment(att.absent, '#ef4444')
  addSegment(att.cancelled, '#fbbf24')
  addSegment(att.holiday, '#60a5fa')
  if (segments.length === 0) return null
  return `conic-gradient(from 0deg, ${segments.join(', ')})`
}

function MonthView({
  year,
  month,
  holidaySet,
  groupedByDate,
  onDayClick,
}: {
  year: number
  month: number
  holidaySet: Set<string>
  groupedByDate: GroupedInstances
  onDayClick: (day: Date) => void
}) {
  const gridDays = useMemo(() => getMonthGrid(year, month), [year, month])

  const subjectColors = useMemo(() => {
    const colors: Record<string, Set<string>> = {}
    for (const [date, insts] of Object.entries(groupedByDate)) {
      const set = new Set<string>()
      for (const inst of insts) {
        if (inst.subject?.color) set.add(inst.subject.color)
      }
      colors[date] = set
    }
    return colors
  }, [groupedByDate])

  return (
    <div className="grid grid-cols-7 gap-px rounded-xl border bg-border/50 overflow-hidden">
      {DAY_NAMES.map((day) => (
        <div
          key={day}
          className="bg-muted/80 px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground"
        >
          {day}
        </div>
      ))}
      {gridDays.map((day) => {
        const ds = dateStr(day)
        const isCurrentMonth = day.getMonth() === month
        const today = isToday(day)
        const isHoliday = holidaySet.has(ds)
        const indianHoliday = isIndianHoliday(ds)
        const colors = subjectColors[ds]
        const att = getDayAttendance(ds, groupedByDate)
        const pct = attendancePct(att)
        const conic = cellConicGradient(att)

        let dayNumClass = 'text-xs font-medium leading-tight p-1'
        const dayStyle: React.CSSProperties = {}
        if (today) {
          dayNumClass += ' flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground'
        } else if (!isCurrentMonth) {
          dayNumClass += ' text-muted-foreground/40'
        } else if (isHoliday) {
          dayNumClass += ''
          dayStyle.color = 'var(--info)'
        } else if (pct >= 75) {
          dayNumClass += ''
          dayStyle.color = 'var(--success)'
        } else if (pct >= 50) {
          dayNumClass += ''
          dayStyle.color = 'var(--warning)'
        } else if (pct >= 0) {
          dayNumClass += ''
          dayStyle.color = 'var(--danger)'
        }

        return (
          <button
            key={ds}
            onClick={() => onDayClick(day)}
            aria-label={`${day.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}${isHoliday ? ', Holiday' : ''}${indianHoliday ? `, ${indianHoliday.name}` : ''}`}
            className={`relative flex min-h-[80px] flex-col items-start gap-1 bg-card p-1.5 text-left transition-colors hover:bg-muted/30 sm:min-h-[100px] sm:p-2.5 overflow-hidden ${
              !isCurrentMonth ? 'opacity-40 bg-muted/10' : ''
            } ${today ? 'ring-2 ring-inset ring-primary' : ''} ${isHoliday ? 'bg-info/5' : ''}`}
          >
            {/* Conic gradient background for mixed attendance */}
            {conic && (
              <div
                className="absolute inset-0 opacity-20"
                style={{ background: conic }}
              />
            )}

            <span className={dayNumClass} style={dayStyle}>
              {day.getDate()}
            </span>
            
            <div className="flex flex-col gap-1 w-full mt-auto relative z-[1]">
              {colors && colors.size > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Array.from(colors).map((color, i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
              {indianHoliday && (
                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 leading-tight truncate w-full bg-blue-500/10 px-1 py-0.5 rounded-sm">
                  {indianHoliday.name}
                </span>
              )}
              {isHoliday && !indianHoliday && (
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 leading-tight bg-amber-500/10 px-1 py-0.5 rounded-sm">
                  Holiday
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function WeekView({
  selDate,
  holidaySet,
  groupedByDate,
  onDayClick,
}: {
  selDate: Date
  holidaySet: Set<string>
  groupedByDate: GroupedInstances
  onDayClick: (day: Date) => void
}) {
  const weekDays = useMemo(() => getWeekDays(selDate), [selDate])

  return (
    <div className="grid min-h-[500px] grid-cols-7 gap-px rounded-xl border bg-border/50 overflow-hidden">
      {weekDays.map((day, i) => {
        const ds = dateStr(day)
        const today = isToday(day)
        const isHoliday = holidaySet.has(ds)
        const indianHoliday = isIndianHoliday(ds)
        const dayInstances = groupedByDate[ds] ?? []
        return (
          <div key={ds} className={`flex min-w-0 flex-col bg-card ${today ? 'bg-primary/5' : ''}`}>
            <button
              onClick={() => onDayClick(day)}
              className={`flex items-center justify-center gap-1.5 px-1 py-3 text-sm transition-colors hover:bg-muted/50 border-b border-border/50 ${
                today ? 'font-semibold text-primary' : 'font-medium text-muted-foreground'
              }`}
              aria-label={`${day.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}${isHoliday ? ', Holiday' : ''}${isIndianHoliday(ds) ? `, ${isIndianHoliday(ds)!.name}` : ''}`}
            >
              <span>{DAY_NAMES[i]}</span>
              <span
                className={
                  today ? 'flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm' : ''
                }
              >
                {day.getDate()}
              </span>
            </button>
            <div className="flex flex-col gap-1.5 p-1.5">
              {indianHoliday && (
                <div className="bg-blue-500/10 px-1.5 py-1 rounded border border-blue-500/20">
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 block truncate">{indianHoliday.name}</span>
                </div>
              )}
              {isHoliday && !indianHoliday && (
                <div className="bg-amber-500/10 px-1.5 py-1 rounded border border-amber-500/20">
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Holiday</span>
                </div>
              )}
              
              {dayInstances.length > 0 ? (
                dayInstances.map((inst) => {
                  const subjectColor = inst.subject?.color ?? '#888'
                  return (
                    <button
                      key={inst.id}
                      onClick={() => onDayClick(new Date(inst.date + 'T00:00:00'))}
                      className="group rounded-lg border bg-background p-2 text-left transition-all hover:border-primary/30 hover:-translate-y-0.5"
                      style={{ borderTopWidth: 3, borderTopColor: subjectColor }}
                      aria-label={`${inst.subject?.name ?? 'Unknown'} at ${formatTime(inst.startTime)}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: subjectColor }}
                        />
                        <span className="truncate text-[11px] font-bold leading-tight">
                          {inst.subject?.name ?? 'Unknown'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(inst.startTime)}
                      </span>
                    </button>
                  )
                })
              ) : (
                !isHoliday && (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/20 mt-2">
                    <span className="py-6 text-[10px] font-medium text-muted-foreground/60">No classes</span>
                  </div>
                )
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DayView({
  selDate,
  selectedDateStr,
  groupedByDate,
  holidaySet,
}: {
  selDate: Date
  selectedDateStr: string
  groupedByDate: GroupedInstances
  holidaySet: Set<string>
}) {
  const isHoliday = holidaySet.has(selectedDateStr)
  const indianHoliday = isIndianHoliday(selectedDateStr)
  const dayInstances = groupedByDate[selectedDateStr] ?? []

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Read-only view. Change attendance from the Attendance tab.</p>
      {indianHoliday && (
        <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-transparent px-4 py-3">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <span className="text-lg">🎉</span> Today is {indianHoliday.name}
          </p>
        </div>
      )}
      {isHoliday && !indianHoliday && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent px-4 py-3">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> This day is marked as a holiday
          </p>
        </div>
      )}
      
      {dayInstances.length > 0 ? (
        <div className="space-y-3">
          {dayInstances.map((instance) => {
            const subjectColor = instance.subject?.color ?? '#888'
            const currentStatus = instance.attendance?.status ?? null
            return (
              <div
                key={instance.id}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:bg-muted/30"
                style={{ borderLeftWidth: 4, borderLeftColor: subjectColor }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">
                    {instance.subject?.name ?? 'Unknown'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded-sm">
                      <Clock className="h-3 w-3" />
                      {formatTime(instance.startTime)}
                      {instance.endTime ? ` - ${formatTime(instance.endTime)}` : ''}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-medium border-dashed bg-background">
                      {CLASS_TYPE_LABELS[instance.classType]}
                    </Badge>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'min-w-[100px] shrink-0 justify-center px-3 py-1 font-semibold',
                    currentStatus === 'present' && 'border-green-500/30 bg-green-500/10 text-green-500',
                    currentStatus === 'absent' && 'border-red-500/30 bg-red-500/10 text-red-500',
                    currentStatus === 'cancelled' && 'border-amber-500/30 bg-amber-500/10 text-amber-500',
                    currentStatus === 'holiday' && 'border-sky-500/30 bg-sky-500/10 text-sky-500',
                  )}
                >
                  {currentStatus ? ATTENDANCE_LABELS[currentStatus] : 'Unmarked'}
                </Badge>
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="border border-dashed bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted shimmer">
              <CalendarDays className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">
                {isHoliday ? 'No classes (holiday)' : 'No classes on this day'}
              </p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {selDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
