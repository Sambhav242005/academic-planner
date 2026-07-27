'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GraduationCap } from 'lucide-react'

export function OnboardingModal({
  open,
  onComplete,
}: {
  open: boolean
  onComplete?: () => void
}) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const [displayName, setDisplayName] = useState('')
  const [college, setCollege] = useState('')
  const [semesterName, setSemesterName] = useState('Semester 1')
  const [error, setError] = useState('')

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error('Not authenticated')

      const profileRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          college: college.trim() || null,
          semester: 1,
        }),
      })
      const profileData = await profileRes.json()
      if (!profileRes.ok) throw new Error(profileData.error || 'Failed to save profile')

      const semesterRes = await fetch('/api/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: semesterName.trim() || 'Semester 1' }),
      })
      const semesterData = await semesterRes.json()
      if (!semesterRes.ok) throw new Error(semesterData.error || 'Failed to create semester')

      const activateRes = await fetch('/api/semesters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: semesterData.id, isActive: true }),
      })
      if (!activateRes.ok) {
        const actData = await activateRes.json()
        throw new Error(actData.error || 'Failed to activate semester')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', session?.user?.id] })
      queryClient.invalidateQueries({ queryKey: ['active-semester'] })
      queryClient.invalidateQueries({ queryKey: ['semesters'] })
      onComplete?.()
    },
    onError: (err) => {
      setError(err.message || 'Something went wrong. Please try again.')
    },
  })

  const handleSave = () => {
    setError('')
    if (!displayName.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!college.trim()) {
      setError('Please enter your college name.')
      return
    }
    if (!semesterName.trim()) {
      setError('Please enter a name for your semester.')
      return
    }
    saveMutation.mutate()
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle>Welcome to Academic Planner</DialogTitle>
          </div>
          <DialogDescription>
            Let&apos;s set up your profile so you can start tracking classes and attendance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="onb-name">Display Name</Label>
            <Input
              id="onb-name"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="onb-college">College</Label>
            <Input
              id="onb-college"
              placeholder="e.g. AIIMS Delhi"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="onb-semester-name">First Semester</Label>
            <Input
              id="onb-semester-name"
              placeholder="e.g. Semester 1"
              value={semesterName}
              onChange={(e) => setSemesterName(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              You can add more semesters later in Settings.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Get Started'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
