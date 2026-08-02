'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ClassInstance } from '@/types'
import { BarChart3, TrendingUp, TrendingDown, Minus, Award, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const RING_SIZE = 120
const RING_RADIUS = 48
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function getRingColor(pct: number): string {
  if (pct >= 75) return 'var(--success)'
  if (pct >= 50) return 'var(--warning)'
  return 'var(--danger)'
}

function getDateRange(period: string) {
  const now = new Date()
  const year = now.getFullYear()

  if (period === 'week') {
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - diff)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { start: monday, end: sunday }
  }

  if (period === 'month') {
    return {
      start: new Date(year, now.getMonth(), 1),
      end: new Date(year, now.getMonth() + 1, 0),
    }
  }

  if (period === 'semester') {
    if (now.getMonth() >= 5) {
      return {
        start: new Date(year, 5, 1),
        end: new Date(year + 1, 4, 31),
      }
    }
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 4, 31),
    }
  }

  return null
}

function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}

function computeStats(instances: ClassInstance[]) {
  let total = 0
  let present = 0
  let absent = 0
  let cancelled = 0
  let holiday = 0

  const subjectMap = new Map<string, {
    subjectId: string
    subjectName: string
    subjectColor: string
    total: number
    present: number
    absent: number
    cancelled: number
    holiday: number
  }>()

  for (const ci of instances) {
    const att = Array.isArray(ci.attendance) ? ci.attendance[0] : ci.attendance
    const sub = ci.subject
    const subId = sub?.id ?? 'unknown'

    total++

    if (att) {
      if (att.status === 'present') present++
      else if (att.status === 'absent') absent++
      else if (att.status === 'cancelled') cancelled++
      else if (att.status === 'holiday') holiday++
    }

    if (!subjectMap.has(subId)) {
      subjectMap.set(subId, {
        subjectId: subId,
        subjectName: sub?.name ?? 'Unknown',
        subjectColor: sub?.color ?? '#888',
        total: 0,
        present: 0,
        absent: 0,
        cancelled: 0,
        holiday: 0,
      })
    }

    const s = subjectMap.get(subId)!
    s.total++
    if (att) {
      if (att.status === 'present') s.present++
      else if (att.status === 'absent') s.absent++
      else if (att.status === 'cancelled') s.cancelled++
      else if (att.status === 'holiday') s.holiday++
    }
  }

  const effectiveTotal = total - cancelled - holiday
  const percentage = effectiveTotal > 0 ? Math.round((present / effectiveTotal) * 100) : 0

  const subjects = Array.from(subjectMap.values()).map((s) => {
    const eff = s.total - s.cancelled - s.holiday
    return {
      ...s,
      percentage: eff > 0 ? Math.round((s.present / eff) * 100) : 0,
    }
  })

  // Sort by attendance (lowest first to highlight needs attention)
  subjects.sort((a, b) => a.percentage - b.percentage)

  return {
    total,
    present,
    absent,
    cancelled,
    holiday,
    percentage,
    subjects,
  }
}

export function AnalyticsPage() {
  const [period, setPeriod] = useState('week')
  const dateRange = getDateRange(period)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const params = dateRange
        ? `?start=${encodeURIComponent(formatDate(dateRange.start))}&end=${encodeURIComponent(formatDate(dateRange.end))}`
        : ''
      const response = await fetch(`/api/analytics${params}`)
      if (!response.ok) throw new Error('Could not load analytics')
      return computeStats(await response.json())
    },
  })

  const ringOffset = data
    ? RING_CIRCUMFERENCE - (data.percentage / 100) * RING_CIRCUMFERENCE
    : RING_CIRCUMFERENCE

  const bestSubject = data?.subjects.length
    ? [...data.subjects].sort((a, b) => b.percentage - a.percentage)[0]
    : null
  const worstSubject = data?.subjects.length
    ? data.subjects.find(s => s.percentage < 75) ?? null
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Attendance breakdown across periods</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* Period Tabs */}
      <Tabs value={period} onValueChange={(v: string) => setPeriod(v)}>
        <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
          <TabsList className="min-w-0 sm:min-w-full w-max sm:w-auto bg-muted/50 p-1">
            <TabsTrigger value="week" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">This Week</TabsTrigger>
            <TabsTrigger value="month" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">This Month</TabsTrigger>
            <TabsTrigger value="semester" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Semester</TabsTrigger>
            <TabsTrigger value="overall" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Overall</TabsTrigger>
          </TabsList>
        </div>

        {['week', 'month', 'semester', 'overall'].map((p) => (
          <TabsContent key={p} value={p}>
            {isLoading ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Skeleton className="h-[200px] rounded-xl" />
                  <Skeleton className="h-[200px] rounded-xl" />
                </div>
                <Skeleton className="h-[300px] rounded-xl" />
              </div>
            ) : isError ? (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="flex flex-col items-center gap-2 py-8">
                  <BarChart3 className="h-8 w-8 text-destructive" />
                  <p className="text-sm font-medium text-destructive">Failed to load analytics data.</p>
                </CardContent>
              </Card>
            ) : !data || data.total === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-12">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                    <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold">No data yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Start marking attendance to see analytics.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Top Stats Row */}
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Ring Chart */}
                  <Card className="p-5 card-shadow">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Overall Attendance</p>
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
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
                            stroke={getRingColor(data.percentage)}
                            strokeWidth={10}
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
                            fontSize="1.4rem"
                            fontWeight="700"
                          >
                            {data.percentage}%
                          </text>
                          <text
                            x="50%"
                            y="64%"
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="var(--text-2)"
                            fontSize="0.65rem"
                            fontWeight="500"
                          >
                            overall
                          </text>
                        </svg>
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-muted-foreground">{data.present} present</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          <span className="text-muted-foreground">{data.absent} absent</span>
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Quick Stats */}
                  <Card className="p-5 card-shadow">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Quick Stats</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Present</span>
                        </div>
                        <span className="text-lg font-bold text-green-500">{data.present}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium">Absent</span>
                        </div>
                        <span className="text-lg font-bold text-red-500">{data.absent}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2">
                          <Minus className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Cancelled</span>
                        </div>
                        <span className="text-lg font-bold text-muted-foreground">{data.cancelled}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Highlights */}
                  <Card className="p-5 card-shadow">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Highlights</p>
                    <div className="space-y-3">
                      {bestSubject && bestSubject.percentage > 0 && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                            <Award className="h-4 w-4 text-green-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Best Subject</p>
                            <p className="text-sm font-semibold truncate">{bestSubject.subjectName}</p>
                            <p className="text-xs text-muted-foreground">{bestSubject.percentage}% attendance</p>
                          </div>
                        </div>
                      )}
                      {worstSubject && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Needs Attention</p>
                            <p className="text-sm font-semibold truncate">{worstSubject.subjectName}</p>
                            <p className="text-xs text-muted-foreground">{worstSubject.percentage}% attendance</p>
                          </div>
                        </div>
                      )}
                      {!bestSubject && !worstSubject && (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground">No subject data yet</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Per-Subject Breakdown */}
                <Card className="card-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-semibold">Per-Subject Breakdown</p>
                        <p className="text-xs text-muted-foreground">Attendance split by subject</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{data.subjects.length} subjects</span>
                    </div>

                    {data.subjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No subjects with classes in this period.</p>
                    ) : (
                      <div className="space-y-3">
                        {data.subjects.map((s) => {
                          const eff = s.total - s.cancelled - s.holiday
                          return (
                            <div
                              key={s.subjectId}
                              className="flex items-center gap-4 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                            >
                              <div
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: s.subjectColor }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-sm font-semibold truncate">{s.subjectName}</p>
                                  <span className={cn(
                                    "text-xs font-bold px-2 py-0.5 rounded-full",
                                    s.percentage >= 75 ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                                    s.percentage >= 50 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                                    "bg-red-500/10 text-red-600 dark:text-red-400"
                                  )}>
                                    {s.percentage}%
                                  </span>
                                </div>
                                {/* Progress bar */}
                                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${s.percentage}%`,
                                      backgroundColor: s.subjectColor,
                                    }}
                                  />
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                  <span>{s.present}/{eff} classes</span>
                                  {s.absent > 0 && <span className="text-red-500">{s.absent} absent</span>}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
