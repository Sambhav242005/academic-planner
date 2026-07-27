'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import {
  Download,
  Upload,
  LogOut,
  Plus,
  Trash2,
  Check,
  Copy,
  User,
  Target,
  BookOpen,
  Database,
  Shield,
  Pencil,
} from 'lucide-react'



export function SettingsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [college, setCollege] = useState('')
  const [targetPct, setTargetPct] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)

  const [newSemesterLabel, setNewSemesterLabel] = useState('')
  const [semesterDialogOpen, setSemesterDialogOpen] = useState(false)
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null)
  const [editingSemesterLabel, setEditingSemesterLabel] = useState('')

  const [generatedKey, setGeneratedKey] = useState('')
  const [keyDialogOpen, setKeyDialogOpen] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null
      const res = await fetch('/api/profile')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session?.user?.id,
  })

  useEffect(() => {
    if (profile && !profileLoaded) {
      setDisplayName(profile.displayName ?? '')
      setCollege(profile.college ?? '')
      setTargetPct(String(profile.defaultTarget ?? 75))
      setProfileLoaded(true)
    }
  }, [profile, profileLoaded])

  const MAX_PROFILE_NAME = 50
  const MAX_COLLEGE = 100

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error('Not authenticated')
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim().slice(0, MAX_PROFILE_NAME) || null,
          college: college.trim().slice(0, MAX_COLLEGE) || null,
          defaultTarget: parseInt(targetPct) || 75,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save profile')
    },
    onSuccess: () => {
      queryClient.setQueryData(['profile', session?.user?.id], (current: typeof profile) => ({
        ...current,
        displayName: displayName.trim().slice(0, MAX_PROFILE_NAME) || null,
        college: college.trim().slice(0, MAX_COLLEGE) || null,
        defaultTarget: parseInt(targetPct, 10) || 75,
      }))
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const { data: semesters, isLoading: semestersLoading } = useQuery({
    queryKey: ['semesters'],
    queryFn: async () => {
      const res = await fetch('/api/semesters')
      if (!res.ok) return []
      return res.json()
    },
  })

  const addSemesterMutation = useMutation({
    mutationFn: async (label: string) => {
      const res = await fetch('/api/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Failed to add semester')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] })
      setSemesterDialogOpen(false)
      setNewSemesterLabel('')
    },
  })

  const setActiveSemesterMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/semesters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: true }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Failed to set active semester')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] })
      queryClient.invalidateQueries({ queryKey: ['active-semester'] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
      queryClient.invalidateQueries({ queryKey: ['recurring-classes'] })
      setDeletedActiveMsg('')
    },
  })

  const updateSemesterMutation = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const res = await fetch('/api/semesters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, label }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Failed to update semester')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] })
      queryClient.invalidateQueries({ queryKey: ['active-semester'] })
      setEditingSemesterId(null)
      setEditingSemesterLabel('')
    },
  })

  const [deletedActiveMsg, setDeletedActiveMsg] = useState('')

  const { data: activeSemester } = useQuery({
    queryKey: ['active-semester'],
    queryFn: async () => {
      const res = await fetch('/api/semesters?active=true')
      if (!res.ok) return null
      return res.json()
    },
  })

  const deleteSemesterMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/semesters', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Failed to delete semester')
      }
    },
    onSuccess: (_data, deletedId) => {
      const wasActive = activeSemester?.id === deletedId
      queryClient.invalidateQueries({ queryKey: ['semesters'] })
      queryClient.invalidateQueries({ queryKey: ['active-semester'] })
      if (wasActive) {
        setDeletedActiveMsg('Active semester was deleted. Choose another as active below.')
        setTimeout(() => setDeletedActiveMsg(''), 6000)
      }
    },
  })

  const { data: mcpKeys, isLoading: mcpKeysLoading } = useQuery({
    queryKey: ['mcp-keys'],
    queryFn: async () => {
      const response = await fetch('/api/settings/mcp-key')
      if (!response.ok) throw new Error('Could not load API keys')
      return response.json() as Promise<Array<{ id: string; name: string; keyPrefix: string }>>
    },
  })

  const generateKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/mcp-key', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to generate key')
      }
      return res.json() as Promise<{ key: string; prefix: string }>
    },
    onSuccess: (data) => {
      setGeneratedKey(data.key)
      queryClient.invalidateQueries({ queryKey: ['mcp-keys'] })
    },
  })

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch('/api/settings/mcp-key', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: id }),
      })
      if (!response.ok) throw new Error('Could not delete API key')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-keys'] })
    },
  })

  async function handleExport() {
    const response = await fetch('/api/settings/data')
    if (!response.ok) {
      setImportError('Could not export your data.')
      return
    }
    const data = await response.json()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'academic-planner-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(file: File) {
    setImportError('')
    setImporting(true)

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!data || typeof data !== 'object') {
        setImportError('Invalid import file: not an object')
        setImporting(false)
        return
      }
      if (!Array.isArray(data.subjects)) {
        setImportError('Invalid import file: missing subjects array')
        setImporting(false)
        return
      }
      if (!Array.isArray(data.tasks)) {
        setImportError('Invalid import file: missing tasks array')
        setImporting(false)
        return
      }
      if (!Array.isArray(data.holidays)) {
        setImportError('Invalid import file: missing holidays array')
        setImporting(false)
        return
      }
      if (!Array.isArray(data.semesters)) {
        setImportError('Invalid import file: missing semesters array')
        setImporting(false)
        return
      }
      for (const s of data.subjects) {
        if (!s.name || !s.color) {
          setImportError('Invalid subject: missing name or color')
          setImporting(false)
          return
        }
      }

      const response = await fetch('/api/settings/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Import failed')

      queryClient.invalidateQueries()
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setImportError('Invalid file or import failed.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and preferences</p>
      </div>

      <Card className="card-accent-purple overflow-hidden">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Profile
            </CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="college">College</Label>
                <Input
                  id="college"
                  placeholder="Your college"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Current Semester</Label>
                <p className="text-sm text-muted-foreground rounded-lg border p-3 bg-muted/50">
                  {activeSemester?.label ?? 'No semester active — set one in Semester Management below'}
                </p>
              </div>
              <Button
                onClick={() => updateProfileMutation.mutate()}
                disabled={updateProfileMutation.isPending}
                aria-label="Save profile"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              {updateProfileMutation.isSuccess && (
                <p className="text-xs text-green-600 dark:text-green-400">Profile saved.</p>
              )}
              {updateProfileMutation.isError && (
                <p className="text-xs text-destructive">Failed to save profile.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card className="card-accent-green overflow-hidden">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              Attendance Target
            </CardTitle>
          <CardDescription>Default attendance percentage target</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target-pct">Target Percentage ({targetPct || '75'}%)</Label>
            <input
              id="target-pct"
              type="range"
              min="50"
              max="100"
              value={targetPct || '75'}
              onChange={(e) => setTargetPct(e.target.value)}
              className="w-full"
              aria-label="Target percentage slider"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          <Button
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending}
            aria-label="Save target percentage"
          >
            Save
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card className="card-accent-orange overflow-hidden">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-500" />
              Semester Management
            </CardTitle>
          <CardDescription>Add and manage your semesters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deletedActiveMsg && (
            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
              {deletedActiveMsg}
            </p>
          )}
          {semestersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : semesters && semesters.length > 0 ? (
            <div className="space-y-2">
              {semesters.map((s: { id: string; label: string; isActive: boolean }) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {editingSemesterId === s.id ? (
                      <Input
                        aria-label="Semester name"
                        value={editingSemesterLabel}
                        onChange={(e) => setEditingSemesterLabel(e.target.value)}
                        maxLength={80}
                        className="h-7 max-w-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editingSemesterLabel.trim()) {
                            updateSemesterMutation.mutate({ id: s.id, label: editingSemesterLabel.trim() })
                          }
                          if (e.key === 'Escape') setEditingSemesterId(null)
                        }}
                      />
                    ) : (
                      <span className="truncate text-sm font-medium">{s.label}</span>
                    )}
                    {s.isActive && (
                      <Badge variant="default" className="text-[10px]">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {editingSemesterId === s.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => updateSemesterMutation.mutate({ id: s.id, label: editingSemesterLabel.trim() })}
                          disabled={!editingSemesterLabel.trim() || updateSemesterMutation.isPending}
                          aria-label="Save semester name"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditingSemesterId(null)} aria-label="Cancel semester edit">
                          ×
                        </Button>
                      </>
                    ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingSemesterId(s.id)
                            setEditingSemesterLabel(s.label)
                          }}
                          aria-label={`Edit ${s.label}`}
                          title={`Edit ${s.label}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    {!s.isActive && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setActiveSemesterMutation.mutate(s.id)}
                        disabled={setActiveSemesterMutation.isPending}
                        aria-label="Set as active semester"
                        title="Set as active"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => deleteSemesterMutation.mutate(s.id)}
                      disabled={deleteSemesterMutation.isPending}
                      aria-label="Delete semester"
                      title="Delete semester"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No semesters yet.</p>
          )}

          <Dialog open={semesterDialogOpen} onOpenChange={setSemesterDialogOpen}>
            <DialogTrigger render={<Button variant="outline" aria-label="Add semester"><Plus className="h-4 w-4" /> Add Semester</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Semester</DialogTitle>
                <DialogDescription>Enter a label for this semester.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="semester-label">Label</Label>
                  <Input
                    id="semester-label"
                    placeholder="e.g. Semester 5"
                    value={newSemesterLabel}
                    onChange={(e) => setNewSemesterLabel(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => {
                    if (newSemesterLabel.trim()) {
                      addSemesterMutation.mutate(newSemesterLabel.trim())
                    }
                  }}
                  disabled={!newSemesterLabel.trim() || addSemesterMutation.isPending}
                  aria-label="Create semester"
                >
                  {addSemesterMutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Separator />

      <Card className="card-accent-cyan overflow-hidden">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-500" />
              Data
            </CardTitle>
          <CardDescription>Export or import your data</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExport} aria-label="Export data">
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            aria-label="Import data"
          >
            <Upload className="h-4 w-4" />
            {importing ? 'Importing...' : 'Import JSON'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImport(file)
            }}
            aria-hidden="true"
          />
          {importError && <p className="w-full text-xs text-destructive">{importError}</p>}
        </CardContent>
      </Card>

      <Separator />

      <Card className="card-accent-pink overflow-hidden">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-pink-500" />
              MCP API Keys
            </CardTitle>
          <CardDescription>Manage API keys for MCP access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mcpKeysLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : mcpKeys && mcpKeys.length > 0 ? (
            <div className="space-y-2">
              {mcpKeys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{k.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{k.keyPrefix}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteKeyMutation.mutate(k.id)}
                    disabled={deleteKeyMutation.isPending}
                    aria-label={`Delete key ${k.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          )}

          <Dialog
            open={keyDialogOpen && !generatedKey}
            onOpenChange={(open) => {
              setKeyDialogOpen(open)
              if (!open) {
                setGeneratedKey('')
              }
            }}
          >
            <DialogTrigger render={<Button variant="outline" aria-label="Generate API key"><Plus className="h-4 w-4" /> Generate Key</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate API Key</DialogTitle>
                <DialogDescription>
                  Copy this key now. You won&apos;t be able to see it again.
                </DialogDescription>
              </DialogHeader>
              <Button
                onClick={() => generateKeyMutation.mutate()}
                disabled={generateKeyMutation.isPending}
                aria-label="Generate key"
              >
                {generateKeyMutation.isPending ? 'Generating...' : 'Generate'}
              </Button>
            </DialogContent>
          </Dialog>

          {generatedKey && (
            <Dialog open={!!generatedKey} onOpenChange={(open) => {
              if (!open) {
                setGeneratedKey('')
                setKeyCopied(false)
              }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Your API Key</DialogTitle>
                  <DialogDescription>
                    Copy this key now. You won&apos;t be able to see it again.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
                    <code className="flex-1 break-all text-xs font-mono">{generatedKey}</code>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(generatedKey)
                        setKeyCopied(true)
                        setTimeout(() => setKeyCopied(false), 2000)
                      }}
                      aria-label="Copy API key"
                    >
                      {keyCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <Button
                    onClick={() => {
                      setGeneratedKey('')
                      setKeyCopied(false)
                    }}
                    aria-label="Close key dialog"
                  >
                    Done
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card className="card-accent-red overflow-hidden">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-destructive" />
              Account
            </CardTitle>
          <CardDescription>Manage your session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sign Out</p>
              <p className="text-xs text-muted-foreground">
                Signed in as {session?.user?.email ?? session?.user?.name ?? 'Unknown'}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => signOut()}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">Toggle between dark and light mode</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
