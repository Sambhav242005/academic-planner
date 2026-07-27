'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { ClassInstance } from '@/types'
import { BarChart3 } from 'lucide-react'

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Attendance breakdown across periods</p>
        </div>
        <div className="page-desc-pill mt-1">
          <BarChart3 className="h-3 w-3" />
          Live
        </div>
      </div>

      <Tabs value={period} onValueChange={(v: string) => setPeriod(v)}>
        <TabsList>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="semester">This Semester</TabsTrigger>
          <TabsTrigger value="overall">Overall</TabsTrigger>
        </TabsList>

        {['week', 'month', 'semester', 'overall'].map((p) => (
          <TabsContent key={p} value={p}>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : isError ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-sm text-destructive">Failed to load analytics data.</p>
                </CardContent>
              </Card>
            ) : !data || data.total === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-8">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No attendance data for this period.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Attendance</CardTitle>
                    <CardDescription>
                      {data.present} present / {data.total - data.cancelled - data.holiday} effective
                      {data.cancelled + data.holiday > 0 && (
                        <span className="text-muted-foreground">
                          {' '}({data.cancelled} cancelled, {data.holiday} holiday excluded)
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Attendance</span>
                      <span className="text-sm text-muted-foreground">{data.percentage}%</span>
                    </div>
                    <Progress value={data.percentage} className="w-full h-2 [&>div]:progress-gradient" />

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border p-3 border-l-[3px] border-l-(--success) bg-(--success)/5">
                    <p className="text-xs text-muted-foreground">Present</p>
                    <p className="text-xl font-semibold text-(--success)">{data.present}</p>
                  </div>
                  <div className="rounded-lg border p-3 border-l-[3px] border-l-destructive bg-destructive/5">
                    <p className="text-xs text-muted-foreground">Absent</p>
                    <p className="text-xl font-semibold text-destructive">{data.absent}</p>
                  </div>
                  <div className="rounded-lg border p-3 border-l-[3px] border-l-(--warning) bg-(--warning)/5">
                    <p className="text-xs text-muted-foreground">Cancelled</p>
                    <p className="text-xl font-semibold text-(--warning)">{data.cancelled}</p>
                  </div>
                  <div className="rounded-lg border p-3 border-l-[3px] border-l-muted-foreground/30 bg-muted/20">
                    <p className="text-xs text-muted-foreground">Holiday</p>
                    <p className="text-xl font-semibold text-muted-foreground">{data.holiday}</p>
                  </div>
                </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Per-Subject Breakdown</CardTitle>
                    <CardDescription>Attendance split by subject</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.subjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No subjects with classes in this period.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Present</TableHead>
                            <TableHead className="text-right">Absent</TableHead>
                            <TableHead className="text-right">%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.subjects.map((s) => (
                            <TableRow key={s.subjectId}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-3 w-3 rounded-full shrink-0"
                                    style={{ backgroundColor: s.subjectColor }}
                                  />
                                  <span className="font-medium">{s.subjectName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{s.total}</TableCell>
                              <TableCell className="text-right">{s.present}</TableCell>
                              <TableCell className="text-right">{s.absent}</TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  variant={s.percentage >= 75 ? 'default' : s.percentage >= 50 ? 'secondary' : 'destructive'}
                                >
                                  {s.percentage}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
