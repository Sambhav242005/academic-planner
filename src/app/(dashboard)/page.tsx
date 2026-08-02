'use client'

import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Calendar, CheckSquare, Clock, TrendingUp } from 'lucide-react'
import { motion } from 'motion/react'
import { isIndianHoliday } from '@/lib/utils/indian-holidays'
import { cn } from '@/lib/utils'
import { getLocalDateKey } from '@/lib/utils/dates'
import type { AttendanceStatus } from '@/types'
import { AttendanceActions } from '@/components/shared/attendance-actions'

const RING_SIZE = 140
const RING_RADIUS = 58
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function getRingColor(pct: number | null, target: number): string {
  if (pct === null) return 'var(--text-3)'
  if (pct >= target) return 'var(--success)'
  if (pct >= target - 15) return 'var(--warning)'
  return 'var(--danger)'
}

type AttendanceClassItem = {
  id: string
  recurring_class_id?: string | null
  date?: string | null
  start_time?: string
  startTime?: string
  end_time?: string | null
  endTime?: string | null
  subject_id?: string
  subjectId?: string
  class_type?: string
  classType?: string
}

type DashboardClassItem = AttendanceClassItem & {
  subject?: { id: string; name: string; color: string }
  attendance?: { status: AttendanceStatus } | null
}

type DashboardData = {
  activeSemester: { id: string; label: string } | null
  recurring: DashboardClassItem[]
  instances: DashboardClassItem[]
  subjects: { id: string; name: string; color: string }[]
  stats: {
    subjects: number
    tasks: number
    attendance: { total: number; present: number; percentage: number | null }
  }
}

function matchesRecurringClass(recurring: AttendanceClassItem, instance: AttendanceClassItem): boolean {
  if (instance.recurring_class_id && instance.recurring_class_id === recurring.id) return true

  const recurringSubject = recurring.subject_id ?? recurring.subjectId
  const instanceSubject = instance.subject_id ?? instance.subjectId
  const recurringStart = recurring.start_time ?? recurring.startTime
  const instanceStart = instance.start_time ?? instance.startTime

  return Boolean(
    recurringSubject && instanceSubject && recurringSubject === instanceSubject &&
    recurringStart && instanceStart && recurringStart.slice(0, 5) === instanceStart.slice(0, 5)
  )
}

const CLASS_TYPE_ICONS: Record<string, string> = {
  theory: '📖',
  clinical: '🏥',
  practical: '🔬',
  tutorial: '💬',
  exam: '📝',
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const today = getLocalDateKey()
  const dayOfWeek = new Date().getDay()

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null
      const res = await fetch('/api/profile')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session?.user?.id,
  })

  const targetPct = profile?.defaultTarget ?? 75

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-data', today, dayOfWeek],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard?date=${encodeURIComponent(today)}`)
      if (!response.ok) throw new Error('Could not load dashboard')
      return response.json() as Promise<DashboardData>
    },
    enabled: !!session?.user,
    staleTime: 30 * 1000,
  })
  const activeSemester = dashboardData?.activeSemester ?? null
  const todayClasses = dashboardData

  const markAttendanceMutation = useMutation({
    mutationFn: async ({
      classItem,
      status,
    }: {
      classItem: AttendanceClassItem
      status: AttendanceStatus | null
    }) => {
      const response = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          status,
          ...(classItem.date ? { classInstanceId: classItem.id } : { recurringClassId: classItem.id }),
        }),
      })
      if (!response.ok) throw new Error('Could not save attendance')
    },
    onMutate: async ({ classItem, status }) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard-data'] })
      const previous = queryClient.getQueryData(['dashboard-data'])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(['dashboard-data'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          instances: (old.instances ?? []).map((ci: any) =>
            ci.id === classItem.id
              ? { ...ci, attendance: [{ ...ci.attendance?.[0], status, id: ci.attendance?.[0]?.id ?? `temp-${Date.now()}` }] }
              : ci
          ),
        }
      })
      return { previous }
    },
    onError: (_err, _values, context) => {
      if (context?.previous) queryClient.setQueryData(['dashboard-data'], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
    },
  })

  function markAttendance(classItem: AttendanceClassItem, status: AttendanceStatus | null) {
    markAttendanceMutation.mutate({ classItem, status })
  }

  const stats = dashboardData?.stats
  const dashboardSubjects = dashboardData?.subjects

  const todayHoliday = isIndianHoliday(today)
  const scheduledRecurring = todayClasses?.recurring.filter(
    (rc) => !todayClasses.instances.some((ci) => matchesRecurringClass(rc, ci))
  ) ?? []
  const scheduledInstances = todayClasses?.instances.filter((ci) => !ci.attendance?.status) ?? []
  const markedInstances = todayClasses?.instances.filter((ci) => ci.attendance?.status) ?? []
  const totalClassesToday = scheduledRecurring.length + scheduledInstances.length + markedInstances.length
  const markedCount = markedInstances.length
  const ringPct = stats?.attendance.percentage ?? null
  const ringColor = getRingColor(ringPct, targetPct)
  const ringOffset = ringPct === null
    ? RING_CIRCUMFERENCE
    : RING_CIRCUMFERENCE - (ringPct / 100) * RING_CIRCUMFERENCE

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const firstName = profile?.displayName?.split(' ')[0] ?? session?.user?.name?.split(' ')[0]

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col gap-1 min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
          {firstName
            ? <><span className="text-muted-foreground font-normal">{greeting}, </span><span className="text-gradient">{firstName}</span> 👋</>
            : <span className="text-gradient">{greeting}</span>}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">
          {activeSemester
            ? `${activeSemester.label} · ${new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}`
            : new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
        </p>
      </div>

      {/* Alert banners */}
      {todayHoliday && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-blue-500/30 bg-linear-to-r from-blue-500/10 to-transparent p-4 flex items-center gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <span aria-hidden="true" className="text-lg">🎉</span>
          </div>
          <div>
            <p className="font-medium text-blue-600 dark:text-blue-400">
              Today is {todayHoliday.name}
            </p>
            <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Take a break, you&apos;ve earned it.</p>
          </div>
        </motion.div>
      )}

      {!activeSemester && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-amber-500/30 bg-linear-to-r from-amber-500/10 to-transparent p-4 flex items-center gap-3"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-amber-600 dark:text-amber-400">
              No active semester set
            </p>
            <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
              Go to Settings to create or activate a semester so we can show your classes.
            </p>
          </div>
        </motion.div>
      )}

      {/* Stat Cards */}
      <motion.div
        className="grid gap-3 grid-cols-2 lg:grid-cols-4"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        {[
          {
            title: 'Subjects',
            icon: BookOpen,
            value: stats?.subjects,
            gradient: 'stat-gradient-purple',
            iconColor: 'text-purple-600 dark:text-purple-400',
            iconBg: 'bg-purple-500/15',
          },
          {
            title: 'Tasks',
            icon: CheckSquare,
            value: stats?.tasks,
            gradient: 'stat-gradient-amber',
            iconColor: 'text-amber-600 dark:text-amber-400',
            iconBg: 'bg-amber-500/15',
          },
          {
            title: 'Classes Today',
            icon: Calendar,
            value: todayClasses ? totalClassesToday : null,
            gradient: 'stat-gradient-blue',
            iconColor: 'text-blue-600 dark:text-blue-400',
            iconBg: 'bg-blue-500/15',
            subtitle: markedCount > 0 ? `${markedCount} marked` : undefined,
          },
          {
            title: 'Attendance',
            icon: TrendingUp,
            value: ringPct !== null ? `${ringPct}%` : '—',
            gradient: 'stat-gradient-green',
            iconColor: 'text-green-600 dark:text-green-400',
            iconBg: 'bg-green-500/15',
            subtitle: ringPct !== null && ringPct >= targetPct ? 'On target' : undefined,
          },
        ].map((card) => (
          <motion.div
            key={card.title}
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          >
            <Card className={cn("p-4 card-hover card-shadow border border-border", card.gradient)}>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", card.iconBg, card.iconColor)}>
                  <card.icon className="h-4.5 w-4.5" aria-hidden="true" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{card.title}</span>
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {card.value ?? <Skeleton className="h-7 w-12" />}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 h-4">
                {card.subtitle ?? '\u00A0'}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Ring Chart + Today's Classes */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Attendance Ring */}
        <Card className="p-5 card-shadow border border-border">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overall Attendance</p>
            {targetPct && (
              <span className="text-[10px] text-muted-foreground">Target: {targetPct}%</span>
            )}
          </div>
          <div className="flex flex-col items-center">
            <div className="relative">
              <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="shrink-0">
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke="var(--surface-2)"
                  strokeWidth={12}
                />
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth={12}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
                <text
                  x="50%"
                  y="44%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--foreground)"
                  fontSize="1.6rem"
                  fontWeight="700"
                >
                  {ringPct === null ? '—' : `${ringPct}%`}
                </text>
                <text
                  x="50%"
                  y="64%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--text-2)"
                  fontSize="0.7rem"
                  fontWeight="500"
                >
                  overall
                </text>
              </svg>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--success)' }} />
                <span className="text-muted-foreground">Present: <strong className="text-foreground">{stats ? stats.attendance.present : '—'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--danger)' }} />
                <span className="text-muted-foreground">Absent: <strong className="text-foreground">{stats ? stats.attendance.total - stats.attendance.present : '—'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--surface-2)' }} />
                <span className="text-muted-foreground">Total: <strong className="text-foreground">{stats ? stats.attendance.total : '—'}</strong></span>
              </div>
            </div>
          </div>
        </Card>

        {/* Today's Classes */}
        <Card className="p-5 card-shadow border border-border">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today&apos;s Classes</p>
            {totalClassesToday > 0 && (
              <span className="text-[10px] text-muted-foreground">{markedCount}/{totalClassesToday} marked</span>
            )}
          </div>
          {markAttendanceMutation.isError && (
            <p className="mb-2 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
              Attendance could not be saved. Please try again.
            </p>
          )}
          {todayClasses ? (
            scheduledRecurring.length === 0 && scheduledInstances.length === 0 && markedInstances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 mb-3">
                  <Calendar className="h-6 w-6 text-muted-foreground/40" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No classes today</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Enjoy your day off!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {/* Unmarked recurring */}
                {scheduledRecurring.map((rc) => (
                  <div
                    key={rc.id}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 card-hover"
                    style={{ borderLeftWidth: 3, borderLeftColor: rc.subject?.color ?? 'transparent' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {rc.subject?.name ?? 'Unknown'}
                        </p>
                        <span className="text-[10px]" title={rc.classType ?? 'theory'}>
                          {CLASS_TYPE_ICONS[rc.classType ?? 'theory'] ?? '📖'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {rc.startTime?.slice(0, 5)}
                        {rc.endTime ? ` - ${rc.endTime.slice(0, 5)}` : ''}
                      </p>
                    </div>
                    <AttendanceActions
                      currentStatus={null}
                      onChange={(status) => markAttendance(rc, status)}
                      disabled={markAttendanceMutation.isPending}
                      size="sm"
                    />
                  </div>
                ))}
                {/* Unmarked instances */}
                {scheduledInstances.map((ci) => (
                  <div
                    key={ci.id}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 card-hover"
                    style={{ borderLeftWidth: 3, borderLeftColor: ci.subject?.color ?? 'transparent' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {ci.subject?.name ?? 'Unknown'}
                        </p>
                        <span className="text-[10px]" title={ci.classType ?? 'theory'}>
                          {CLASS_TYPE_ICONS[ci.classType ?? 'theory'] ?? '📖'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ci.startTime?.slice(0, 5)}
                        {ci.endTime ? ` - ${ci.endTime.slice(0, 5)}` : ''}
                      </p>
                    </div>
                    <AttendanceActions
                      currentStatus={null}
                      onChange={(status) => markAttendance(ci, status)}
                      disabled={markAttendanceMutation.isPending}
                      size="sm"
                    />
                  </div>
                ))}
                {/* Already marked */}
                {markedInstances.map((ci) => (
                  <div
                    key={ci.id}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3 opacity-70"
                    style={{ borderLeftWidth: 3, borderLeftColor: ci.subject?.color ?? 'transparent' }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate text-muted-foreground line-through">
                          {ci.subject?.name ?? 'Unknown'}
                        </p>
                        <span className="text-[10px]" title={ci.classType ?? 'theory'}>
                          {CLASS_TYPE_ICONS[ci.classType ?? 'theory'] ?? '📖'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ci.startTime?.slice(0, 5)}
                        {ci.endTime ? ` - ${ci.endTime.slice(0, 5)}` : ''}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      ci.attendance?.status === 'present' && 'badge-present',
                      ci.attendance?.status === 'absent' && 'badge-absent',
                      ci.attendance?.status === 'cancelled' && 'badge-cancelled',
                      ci.attendance?.status === 'holiday' && 'badge-holiday',
                    )}>
                      {ci.attendance?.status}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Subjects with Progress */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Subjects</p>
          {dashboardSubjects && dashboardSubjects.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{dashboardSubjects.length} subjects</span>
          )}
        </div>
        {dashboardSubjects && dashboardSubjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dashboardSubjects.map((subject) => {
              const subjectRecords = stats ? Math.round((stats.attendance.present / Math.max(stats.attendance.total, 1)) * 100) : 0
              return (
                <Card
                  key={subject.id}
                  className="p-4 card-hover card-shadow border border-border"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: subject.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm font-semibold">
                      {subject.name}
                    </span>
                  </div>
                  <div className="subject-progress-track">
                    <div
                      className="subject-progress-fill"
                      style={{
                        width: `${subjectRecords}%`,
                        backgroundColor: subject.color,
                      }}
                    />
                  </div>
                </Card>
              )
            })}
          </div>
        ) : dashboardSubjects ? (
          <Card className="border border-dashed p-4 text-sm text-muted-foreground">
            Add subjects to see them here.
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 rounded-xl" />)}
          </div>
        )}
      </div>
    </div>
  )
}
