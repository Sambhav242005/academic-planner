'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { checkCollision } from '@/lib/utils/time'
import type { Subject, RecurringClass, ClassType, Semester } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2, Clock, AlertCircle } from 'lucide-react'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  theory: 'Theory',
  clinical: 'Clinical',
  practical: 'Practical',
  tutorial: 'Tutorial',
  exam: 'Exam',
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

function mapSemester(row: Record<string, unknown>): Semester {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    label: row.label as string,
    isActive: (row.is_active ?? row.isActive) as boolean,
    createdAt: (row.created_at ?? row.createdAt) as string,
  }
}

function mapRecurringClass(row: Record<string, unknown>): RecurringClass {
  const subject = row.subject
    ? mapSubject(row.subject as Record<string, unknown>)
    : undefined
  return {
    id: row.id as string,
    userId: row.user_id as string,
    semesterId: (row.semester_id as string) ?? null,
    subjectId: row.subject_id as string,
    subject,
    dayOfWeek: row.day_of_week as number,
    startTime: row.start_time as string,
    endTime: (row.end_time as string) ?? null,
    classType: row.class_type as ClassType,
    createdAt: row.created_at as string,
  }
}

export function TimetablePage() {
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dayOfWeek, setDayOfWeek] = useState('0')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('09:00')
  const [subjectId, setSubjectId] = useState('')
  const [classType, setClassType] = useState<ClassType>('theory')
  const [error, setError] = useState<string | null>(null)

  const { data: activeSemester } = useQuery({
    queryKey: ['active-semester'],
    queryFn: async () => {
      const response = await fetch('/api/semesters?active=true')
      if (!response.ok) throw new Error('Could not load active semester')
      const data = await response.json()
      return data ? mapSemester(data as Record<string, unknown>) : null
    },
  })

  const semesterId = activeSemester?.id ?? null

  const { data: subjects } = useQuery({
    queryKey: ['subjects', semesterId],
    queryFn: async () => {
      const query = semesterId ? `?semesterId=${encodeURIComponent(semesterId)}` : ''
      const response = await fetch(`/api/subjects${query}`)
      if (!response.ok) throw new Error('Could not load subjects')
      return ((await response.json()) as Record<string, unknown>[]).map(mapSubject)
    },
  })

  const { data: classes, isLoading, isError } = useQuery({
    queryKey: ['recurring-classes', activeSemester?.id],
    queryFn: async () => {
      const query = activeSemester?.id ? `?semesterId=${encodeURIComponent(activeSemester.id)}` : ''
      const response = await fetch(`/api/timetable${query}`)
      if (!response.ok) throw new Error('Could not load timetable')
      return ((await response.json()) as Record<string, unknown>[]).map(mapRecurringClass)
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: {
      dayOfWeek: number
      startTime: string
      endTime: string
      subjectId: string
      classType: ClassType
    }) => {
      const response = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, semesterId: activeSemester?.id ?? null }),
      })
      if (!response.ok) throw new Error('Could not create class')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-classes'] })
      setOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: {
      id: string
      dayOfWeek: number
      startTime: string
      endTime: string
      subjectId: string
      classType: ClassType
    }) => {
      const response = await fetch('/api/timetable', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!response.ok) throw new Error('Could not update class')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-classes'] })
      setOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch('/api/timetable', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) throw new Error('Could not delete class')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-classes'] })
    },
  })

  const classesByDay = DAY_LABELS.map((_, dayIndex) =>
    (classes ?? []).filter((c) => c.dayOfWeek === dayIndex)
  )

  function openAdd() {
    setEditingId(null)
    setDayOfWeek('0')
    setStartTime('08:00')
    setEndTime('09:00')
    setSubjectId(subjects?.[0]?.id ?? '')
    setClassType('theory')
    setError(null)
    setOpen(true)
  }

  function openEdit(cls: RecurringClass) {
    setEditingId(cls.id)
    setDayOfWeek(String(cls.dayOfWeek))
    setStartTime(cls.startTime.slice(0, 5))
    setEndTime(cls.endTime ? cls.endTime.slice(0, 5) : '')
    setSubjectId(cls.subjectId)
    setClassType(cls.classType)
    setError(null)
    setOpen(true)
  }

  function handleSave() {
    if (!subjectId || !startTime.trim()) return
    const collision = checkCollision(
      Number(dayOfWeek),
      startTime,
      endTime || null,
      classes ?? [],
      editingId ?? undefined
    )
    if (collision.hasCollision) {
      setError('This class overlaps with another class on the same day.')
      return
    }
    if (startTime && endTime && startTime >= endTime) {
      setError('End time must be after start time.')
      return
    }
    const payload = {
      dayOfWeek: Number(dayOfWeek),
      startTime: startTime,
      endTime: endTime,
      subjectId,
      classType,
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this recurring class?')) {
      deleteMutation.mutate(id)
    }
  }

  function timeDisplay(time: string | null): string {
    if (!time) return ''
    return time.slice(0, 5)
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const currentDayIndex = new Date().getDay()
  const adjustedCurrentDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Timetable</h1>
            {activeSemester && (
              <Badge variant="secondary" className="font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                {activeSemester.label}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Your recurring weekly class schedule
          </p>
        </div>
        <Button onClick={openAdd} aria-label="Add class">
          <Plus className="h-4 w-4" />
          Add Class
        </Button>
      </div>

      {isLoading ? (
        <div className="grid min-h-[400px] grid-cols-7 gap-4 overflow-x-auto">
          {DAY_LABELS.map((day, i) => (
            <div key={i} className="flex flex-col gap-3 min-w-[140px]">
              <Skeleton className="h-8 w-full rounded-md" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-[92px] w-full rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-destructive">Something went wrong.</p>
            <p className="text-xs text-destructive/80 mt-1 mb-4">Could not load your timetable.</p>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['recurring-classes'] })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : classes && classes.length > 0 ? (
        <div className="grid min-h-[400px] grid-cols-7 gap-4 overflow-x-auto pb-4 px-1">
          {DAY_LABELS.map((day, dayIndex) => {
            const isToday = dayIndex === adjustedCurrentDayIndex
            return (
            <div key={dayIndex} className="flex min-w-[150px] flex-col gap-3">
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
                <div className={`px-3 py-1.5 rounded-md text-center text-sm font-semibold transition-colors ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
                  {day}
                </div>
              </div>
              {classesByDay[dayIndex].length > 0 ? (
                classesByDay[dayIndex].map((cls) => {
                  const subjectColor = cls.subject?.color ?? '#888'
                  return (
                    <div
                      key={cls.id}
                      className="group relative rounded-xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30"
                      style={{ borderTopWidth: 4, borderTopColor: subjectColor }}
                    >
                      <div className="mb-2 flex items-start justify-between gap-1">
                        <p className="truncate text-sm font-semibold leading-tight">
                          {cls.subject?.name ?? 'Unknown'}
                        </p>
                        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 -mt-1 -mr-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => openEdit(cls)}
                            aria-label={`Edit class`}
                            title={`Edit class`}
                            className="h-6 w-6 hover:bg-muted"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDelete(cls.id)}
                            aria-label={`Delete class`}
                            title={`Delete class`}
                            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/30 w-fit px-1.5 py-0.5 rounded-sm">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>
                          {timeDisplay(cls.startTime)}
                          {cls.endTime ? ` - ${timeDisplay(cls.endTime)}` : ''}
                        </span>
                      </div>
                      <Badge variant="outline" className="mt-2.5 text-[10px] font-medium bg-background">
                        {CLASS_TYPE_LABELS[cls.classType]}
                      </Badge>
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed bg-muted/10">
                  <p className="px-2 py-8 text-xs text-muted-foreground/60 font-medium">Free day</p>
                </div>
              )}
            </div>
            )
          })}
        </div>
      ) : (
        <Card className="border border-dashed bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted shimmer">
              <Clock className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">No classes scheduled</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Build your weekly timetable to easily track your attendance each day.
              </p>
            </div>
            <Button onClick={openAdd} aria-label="Add your first class" className="mt-2">
              <Plus className="h-4 w-4" />
              Add Class
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Class' : 'Add Class'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="class-day">Day</Label>
                <Select value={dayOfWeek} onValueChange={(v) => v && setDayOfWeek(v)}>
                  <SelectTrigger id="class-day" className="w-full bg-background/50">
                    <SelectValue>{DAY_LABELS[Number(dayOfWeek)] ?? 'Select a day'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-subject">Subject</Label>
              <Select value={subjectId} onValueChange={(v) => v && setSubjectId(v)}>
                <SelectTrigger id="class-subject" className="w-full bg-background/50">
                  <SelectValue placeholder="Select a subject">
                    {subjects?.find((subject) => subject.id === subjectId)?.name ?? 'Select a subject'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(subjects ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class-start">Start Time</Label>
                <Input
                  id="class-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-end">End Time</Label>
                <Input
                  id="class-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-type">Type</Label>
              <Select
                value={classType}
                onValueChange={(v) => v && setClassType(v as ClassType)}
              >
                <SelectTrigger id="class-type" className="w-full bg-background/50">
                  <SelectValue>{CLASS_TYPE_LABELS[classType]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(CLASS_TYPE_LABELS) as [ClassType, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="ghost">Cancel</Button>} />
            <Button
              onClick={handleSave}
              disabled={!subjectId || !startTime.trim() || isPending}
            >
              {editingId ? 'Save Changes' : 'Add Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
