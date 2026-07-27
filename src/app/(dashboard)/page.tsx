'use client'

import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Calendar, CheckSquare, Clock } from 'lucide-react'
import { motion } from 'motion/react'
import { isIndianHoliday } from '@/lib/utils/indian-holidays'
import { cn } from '@/lib/utils'
import { getLocalDateKey } from '@/lib/utils/dates'
import type { AttendanceStatus } from '@/types'

const RING_SIZE = 128
const RING_RADIUS = 54
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

function AttendanceActions({
  classItem,
  currentStatus,
  onChange,
  disabled,
}: {
  classItem: AttendanceClassItem
  currentStatus: AttendanceStatus | null
  onChange: (classItem: AttendanceClassItem, status: AttendanceStatus) => void
  disabled: boolean
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5" role="group" aria-label="Set attendance status">
      {ATTENDANCE_ACTIONS.map((action) => (
        <Button
          key={action.status}
          type="button"
          variant="ghost"
          size="icon-xs"
          className={cn(
            'h-6 w-6 rounded-md text-sm leading-none opacity-70 hover:opacity-100',
            action.className,
            currentStatus === action.status && 'bg-muted opacity-100 ring-1 ring-current'
          )}
          onClick={() => onChange(classItem, action.status)}
          disabled={disabled}
          aria-label={`Mark ${action.label}`}
          aria-pressed={currentStatus === action.status}
          title={action.label}
        >
          {action.symbol}
        </Button>
      ))}
    </div>
  )
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['class-instances'] })
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
  const ringPct = stats?.attendance.percentage ?? null
  const ringColor = getRingColor(ringPct, targetPct)
  const ringOffset = ringPct === null
    ? RING_CIRCUMFERENCE
    : RING_CIRCUMFERENCE - (ringPct / 100) * RING_CIRCUMFERENCE

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile?.displayName
            ? <><span className="text-muted-foreground font-normal">Hey,</span> <span className="text-gradient">{profile.displayName.split(' ')[0]}</span></>
            : session?.user?.name
              ? <><span className="text-muted-foreground font-normal">Hey,</span> <span className="text-gradient">{session.user.name.split(' ')[0]}</span></>
              : <span className="text-gradient">Hey there</span>}
        </h1>
        <p className="text-sm text-muted-foreground">
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Overall Attendance</p>
          <div className="flex items-center gap-5">
            <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="shrink-0">
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="var(--surface-2)"
                strokeWidth={10}
              />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={ringColor}
                strokeWidth={10}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
              <text
                x="50%"
                y="45%"
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--foreground)"
                fontSize="1.4rem"
                fontWeight="700"
              >
                {ringPct === null ? '—' : `${ringPct}%`}
              </text>
              <text
                x="50%"
                y="66%"
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--text-2)"
                fontSize="0.7rem"
                fontWeight="500"
              >
                attendance
              </text>
            </svg>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--success)' }} />
                <span className="text-muted-foreground">Present: <strong className="text-foreground">{stats ? stats.attendance.present : '—'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--danger)' }} />
                <span className="text-muted-foreground">Absent: <strong className="text-foreground">{stats ? stats.attendance.total - stats.attendance.present : '—'}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--warning)' }} />
                <span className="text-muted-foreground">Total: <strong className="text-foreground">{stats ? stats.attendance.total : '—'}</strong></span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today&apos;s Classes</p>
            <span className="text-[10px] text-muted-foreground">Choose a status</span>
          </div>
          {markAttendanceMutation.isError && (
            <p className="mb-2 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
              Attendance could not be saved. Please try again.
            </p>
          )}
          {todayClasses ? (
            scheduledRecurring.length === 0 && scheduledInstances.length === 0? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground/30 mb-2" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">No classes today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduledRecurring.map((rc) => (
                  <div
                    key={rc.id}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 card-hover"
                    style={{ borderLeftWidth: 3, borderLeftColor: rc.subject?.color ?? 'transparent' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {rc.subject?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {rc.startTime?.slice(0, 5)}
                        {rc.endTime ? ` - ${rc.endTime.slice(0, 5)}` : ''}
                      </p>
                    </div>
                    <AttendanceActions
                      classItem={rc}
                      currentStatus={null}
                      onChange={markAttendance}
                      disabled={markAttendanceMutation.isPending}
                    />
                  </div>
                  ))}
                {scheduledInstances.map((ci) => (
                  <div
                    key={ci.id}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 card-hover"
                    style={{ borderLeftWidth: 3, borderLeftColor: ci.subject?.color ?? 'transparent' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {ci.subject?.name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ci.startTime?.slice(0, 5)}
                        {ci.endTime ? ` - ${ci.endTime.slice(0, 5)}` : ''}
                      </p>
                    </div>
                    <AttendanceActions
                      classItem={ci}
                      currentStatus={ci.attendance?.status ?? null}
                      onChange={markAttendance}
                      disabled={markAttendanceMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          )}
        </Card>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Overview</p>
        <motion.div
          className="grid gap-3 grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {[
            { title: 'Subjects', icon: BookOpen, value: stats?.subjects },
            { title: 'Tasks', icon: CheckSquare, value: stats?.tasks },
            {
              title: 'Classes',
              icon: Calendar,
              value: todayClasses ? scheduledRecurring.length + scheduledInstances.length : null,
            },
          ].map((card) => (
            <motion.div
              key={card.title}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
            >
              <Card className="p-4 card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <card.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">{card.title}</span>
                </div>
                <div className="text-xl font-bold">
                  {card.value ?? <Skeleton className="h-6 w-10" />}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Subjects</p>
        {dashboardSubjects && dashboardSubjects.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {dashboardSubjects.map((subject) => (
              <Card
                key={subject.id}
                className="border-l-2 p-3"
                style={{ borderLeftColor: subject.color }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium">
                    {subject.name}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : dashboardSubjects ? (
          <Card className="border-dashed p-4 text-sm text-muted-foreground">
            Add subjects to see their quick-access colour cards here.
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 rounded-xl" />)}
          </div>
        )}
      </div>
    </div>
  )
}
