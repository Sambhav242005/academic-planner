'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Task, Subject, TaskPriority, TaskSource } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Plus, Trash2, Pencil, ListTodo, AlertCircle, CalendarIcon, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function priorityCustomClass(priority: TaskPriority): string {
  switch (priority) {
    case 'high': return 'bg-destructive/10 text-destructive border-destructive/20'
    case 'medium': return 'bg-primary/10 text-primary border-primary/20'
    case 'low': return 'bg-muted text-muted-foreground border-border'
  }
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

function mapTask(row: Record<string, unknown>): Task {
  const subject = row.subject
    ? mapSubject(row.subject as Record<string, unknown>)
    : undefined
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    subjectId: (row.subject_id as string) ?? null,
    subject,
    dueDate: (row.due_date as string) ?? null,
    priority: row.priority as TaskPriority,
    note: (row.note as string) ?? '',
    completed: row.completed as boolean,
    source: row.source as TaskSource,
    createdAt: row.created_at as string,
  }
}

type FilterTab = 'all' | 'active' | 'completed'

export function TasksPage() {
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [note, setNote] = useState('')

  const [filterTab, setFilterTab] = useState<FilterTab>('active')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await fetch('/api/subjects')
      if (!response.ok) throw new Error('Could not load subjects')
      return ((await response.json()) as Record<string, unknown>[]).map(mapSubject)
    },
  })

  const { data: tasks, isLoading, isError, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks')
      if (!response.ok) throw new Error('Could not load tasks')
      return ((await response.json()) as Record<string, unknown>[]).map(mapTask)
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: {
      title: string
      subjectId: string | null
      dueDate: string | null
      priority: TaskPriority
      note: string
    }) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!response.ok) throw new Error('Could not create task')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: {
      id: string
      title: string
      subjectId: string | null
      dueDate: string | null
      priority: TaskPriority
      note: string
    }) => {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!response.ok) throw new Error('Could not update task')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setOpen(false)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed }),
      })
      if (!response.ok) throw new Error('Could not update task')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) throw new Error('Could not delete task')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const filteredTasks = useMemo(() => {
    if (!tasks) return []
    let result = [...tasks]
    if (filterTab === 'active') result = result.filter((t) => !t.completed)
    if (filterTab === 'completed') result = result.filter((t) => t.completed)
    if (priorityFilter !== 'all') result = result.filter((t) => t.priority === priorityFilter)
    result.sort((a, b) => {
      // Completed items go to the bottom
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }
      if (a.dueDate && b.dueDate) {
        const cmp = a.dueDate.localeCompare(b.dueDate)
        if (cmp !== 0) return cmp
      }
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    })
    return result
  }, [tasks, filterTab, priorityFilter])

  function openAdd() {
    setEditingId(null)
    setTitle('')
    setSubjectId('no-subject')
    setDueDate('')
    setPriority('medium')
    setNote('')
    setOpen(true)
  }

  function openEdit(task: Task) {
    setEditingId(task.id)
    setTitle(task.title)
    setSubjectId(task.subjectId ?? 'no-subject')
    setDueDate(task.dueDate ?? '')
    setPriority(task.priority)
    setNote(task.note)
    setOpen(true)
  }

  const MAX_TITLE = 200
  const MAX_NOTE = 2000

  function handleSave() {
    const trimmedTitle = title.trim().slice(0, MAX_TITLE)
    if (!trimmedTitle) return
    const trimmedNote = note.trim().slice(0, MAX_NOTE)
    const payload = {
      title: trimmedTitle,
      subjectId: subjectId === 'no-subject' ? null : subjectId,
      dueDate: dueDate || null,
      priority,
      note: trimmedNote,
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleToggle(task: Task) {
    toggleMutation.mutate({ id: task.id, completed: !task.completed })
  }

  function handleDelete(id: string) {
    if (window.confirm('Delete this task?')) {
      deleteMutation.mutate(id)
    }
  }

  function formatDueDate(date: string | null): string {
    if (!date) return ''
    const d = new Date(date + 'T00:00:00')
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  function isOverdue(date: string | null): boolean {
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(date + 'T00:00:00') < today
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your to-do list</p>
        </div>
        <Button onClick={openAdd} aria-label="Add task">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-2 rounded-xl border">
        <Tabs
          value={filterTab}
          onValueChange={(v) => setFilterTab(v as FilterTab)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Done</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={priorityFilter}
          onValueChange={(v) => setPriorityFilter((v ?? 'all') as TaskPriority | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[150px] bg-background" aria-label="Filter by priority">
            <div className="flex items-center gap-2">
              <Flag className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="All priorities" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High priority</SelectItem>
            <SelectItem value="medium">Medium priority</SelectItem>
            <SelectItem value="low">Low priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-2" />
            <div className="text-center">
              <p className="font-medium text-destructive">Failed to load tasks</p>
              <p className="text-sm text-destructive/80 mt-1">
                {(error as Error)?.message ?? 'An unexpected error occurred'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
              aria-label="Retry loading tasks"
              className="mt-2"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredTasks.length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const subjectColor = task.subject?.color ?? '#888'
            const overdue = isOverdue(task.dueDate) && !task.completed
            const dueDateStyle = overdue
              ? 'text-destructive bg-destructive/10 border-destructive/20 font-medium'
              : 'text-muted-foreground bg-muted/50 border-transparent'
            return (
              <div
                key={task.id}
                className={cn(
                  "group flex items-start sm:items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:bg-muted/30",
                  task.completed ? 'opacity-60 bg-muted/20' : '',
                  overdue ? 'border-destructive/30 shadow-[0_0_0_1px_rgba(var(--destructive),0.1)]' : ''
                )}
              >
                <div className="mt-1 sm:mt-0 flex items-center justify-center">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleToggle(task)}
                    aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    className={cn(
                      "h-5 w-5 rounded-md", 
                      overdue ? "border-destructive/50 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive" : ""
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className={`text-base font-medium leading-tight ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {task.subject && (
                      <div className="flex items-center gap-1.5 bg-muted/50 px-1.5 py-0.5 rounded-sm">
                        <div
                          className="h-2 w-2 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: subjectColor }}
                        />
                        <span className="text-[11px] font-medium text-muted-foreground">{task.subject.name}</span>
                      </div>
                    )}
                    {task.source === 'ai' && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary hover:bg-primary/20">
                        🤖 AI
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 mt-1 sm:mt-0">
                  <div className="flex items-center gap-2">
                    {task.dueDate && (
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 h-5 flex items-center gap-1", dueDateStyle)}>
                        <CalendarIcon className="h-3 w-3" />
                        {formatDueDate(task.dueDate)}
                      </Badge>
                    )}
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 h-5", priorityCustomClass(task.priority))}>
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(task)}
                      aria-label={`Edit task`}
                      className="h-7 w-7 hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(task.id)}
                      aria-label={`Delete task`}
                      className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="border border-dashed bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted shimmer">
              <ListTodo className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">No tasks found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filterTab !== 'all' || priorityFilter !== 'all'
                  ? 'No tasks match your current filters.'
                  : 'Add your first task to start organizing your work.'}
              </p>
            </div>
            {filterTab === 'all' && priorityFilter === 'all' && (
              <Button onClick={openAdd} className="mt-2" aria-label="Add your first task">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Task' : 'Add Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                placeholder="What do you need to do?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-subject">Subject (Optional)</Label>
              <Select value={subjectId} onValueChange={(v) => setSubjectId(v ?? 'no-subject')}>
                <SelectTrigger id="task-subject" className="w-full bg-background/50">
                  <SelectValue placeholder="No subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-subject">No subject</SelectItem>
                  {(subjects ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full shrink-0 shadow-sm"
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
                <Label htmlFor="task-due">Due Date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => v && setPriority(v as TaskPriority)}
                >
                  <SelectTrigger id="task-priority" className="w-full bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PRIORITY_LABELS) as [TaskPriority, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <Flag className={cn("h-3.5 w-3.5", value === 'high' ? 'text-destructive' : value === 'medium' ? 'text-primary' : 'text-muted-foreground')} />
                            {label}
                          </div>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-note">Note</Label>
              <Textarea
                id="task-note"
                placeholder="Optional notes..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={2000}
                className="bg-background/50 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost">Cancel</Button>} />
            <Button onClick={handleSave} disabled={!title.trim() || isPending}>
              {editingId ? 'Save Changes' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
