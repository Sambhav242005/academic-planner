'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Subject } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { ColorPicker } from '@/features/subjects/color-picker'
import { Plus, Pencil, Trash2, BookOpen, AlertCircle } from 'lucide-react'

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

export function SubjectsPage() {
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')

  const { data: activeSemester } = useQuery({
    queryKey: ['active-semester'],
    queryFn: async () => {
      const res = await fetch('/api/semesters?active=true')
      if (!res.ok) return null
      return res.json() as Promise<{ id: string; label: string } | null>
    },
  })

  const semesterId = activeSemester?.id ?? null

  const { data: subjects, isLoading, isError } = useQuery({
    queryKey: ['subjects', semesterId],
    queryFn: async () => {
      const query = semesterId ? `?semesterId=${encodeURIComponent(semesterId)}` : ''
      const response = await fetch(`/api/subjects${query}`)
      if (!response.ok) throw new Error('Could not load subjects')
      return ((await response.json()) as Record<string, unknown>[]).map(mapSubject)
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: { name: string; color: string; semesterId: string | null }) => {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!response.ok) throw new Error('Could not create subject')
      return response.json() as Promise<{ id: string }>
    },
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: ['subjects'] })
      const previous = queryClient.getQueryData(['subjects'])
      const newSubject = { id: `temp-${Date.now()}`, name: values.name, color: values.color }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(['subjects'], (old: any[]) => [...(old ?? []), newSubject])
      return { previous }
    },
    onError: (_err, _values, context) => {
      if (context?.previous) queryClient.setQueryData(['subjects'], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: { id: string; name: string; color: string }) => {
      const response = await fetch('/api/subjects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!response.ok) throw new Error('Could not update subject')
    },
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: ['subjects'] })
      const previous = queryClient.getQueryData(['subjects'])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(['subjects'], (old: any[]) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old ?? []).map((s: any) => (s.id === values.id ? { ...s, name: values.name, color: values.color } : s))
      )
      return { previous }
    },
    onError: (_err, _values, context) => {
      if (context?.previous) queryClient.setQueryData(['subjects'], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch('/api/subjects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) throw new Error('Could not delete subject')
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['subjects'] })
      const previous = queryClient.getQueryData(['subjects'])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(['subjects'], (old: any[]) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old ?? []).filter((s: any) => s.id !== id)
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['subjects'], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })

  function openAdd() {
    setEditingId(null)
    setName('')
    setColor('#3b82f6')
    setOpen(true)
  }

  function openEdit(subject: Subject) {
    setEditingId(subject.id)
    setName(subject.name)
    setColor(subject.color)
    setOpen(true)
  }

  const MAX_NAME = 60

  function handleSave() {
    const trimmed = name.trim().slice(0, MAX_NAME)
    if (!trimmed) return
    if (editingId) {
      updateMutation.mutate({ id: editingId, name: trimmed, color })
    } else {
      createMutation.mutate({ name: trimmed, color, semesterId: activeSemester?.id ?? null })
    }
  }

  function handleDelete(id: string, name: string) {
    if (window.confirm(`Delete "${name}"? This will also remove all associated classes.`)) {
      deleteMutation.mutate(id)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Subjects</h1>
            <div className="flex h-6 items-center rounded-full bg-primary/10 px-2.5 text-xs font-medium text-primary">
              {subjects?.length || 0}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Manage your subjects and their colours</p>
        </div>
        <Button onClick={openAdd} aria-label="Add subject">
          <Plus className="h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="flex items-center gap-4 pt-6">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-destructive">Something went wrong.</p>
            <p className="text-xs text-destructive/80 mt-1 mb-4">Could not load your subjects.</p>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['subjects'] })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : subjects && subjects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Card key={subject.id} className="card-hover group overflow-hidden">
              <CardContent className="flex items-center gap-4 pt-6 pb-6">
                <div
                  className="h-10 w-10 shrink-0 rounded-full color-glow transition-transform group-hover:scale-110"
                  style={{ backgroundColor: subject.color, '--glow-color': subject.color } as React.CSSProperties}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{subject.name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{subject.color.toUpperCase()}</p>
                </div>
                <div className="flex shrink-0 gap-1 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(subject)}
                    aria-label={`Edit ${subject.name}`}
                    title={`Edit ${subject.name}`}
                    className="hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(subject.id, subject.name)}
                    aria-label={`Delete ${subject.name}`}
                    title={`Delete ${subject.name}`}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-dashed bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 shimmer">
              <BookOpen className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">No subjects yet</p>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Add your first subject to start building your timetable and tracking attendance.
              </p>
            </div>
            <Button onClick={openAdd} aria-label="Add your first subject" className="mt-2">
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <Label htmlFor="subject-name">Name</Label>
              <Input
                id="subject-name"
                placeholder="e.g. General Medicine"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-3">
              <Label>Subject Colour</Label>
              <div className="p-1 rounded-lg border bg-muted/30">
                <ColorPicker value={color} onChange={setColor} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost">Cancel</Button>} />
            <Button onClick={handleSave} disabled={!name.trim() || isPending}>
              {editingId ? 'Save Changes' : 'Add Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
