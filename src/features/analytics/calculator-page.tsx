'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Calculator, AlertCircle, CheckCircle2 } from 'lucide-react'

function calculateSafeToMiss(total: number, present: number, targetDecimal: number) {
  if (total <= 0 || present > total) return null

  const currentPct = (present / total) * 100
  const effectiveTotal = total

  if (currentPct >= targetDecimal * 100) {
    const safeMiss = Math.floor((present - targetDecimal * effectiveTotal) / targetDecimal)
    return { type: 'safe-to-miss' as const, value: Math.max(0, safeMiss), currentPct }
  }

  const needed = Math.ceil((targetDecimal * effectiveTotal - present) / (1 - targetDecimal))
  return { type: 'needed' as const, value: Math.max(0, needed), currentPct }
}

export function CalculatorPage() {

  const [totalStr, setTotalStr] = useState('')
  const [presentStr, setPresentStr] = useState('')
  const [targetStr, setTargetStr] = useState('')

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await fetch('/api/profile')
      if (!response.ok) throw new Error('Could not load profile')
      return response.json()
    },
  })

  const defaultTarget = profile?.defaultTarget ?? 75
  const total = Math.max(0, parseInt(totalStr) || 0)
  const present = Math.max(0, parseInt(presentStr) || 0)
  const targetInput = targetStr ? Math.max(50, Math.min(100, parseInt(targetStr) || defaultTarget)) : defaultTarget
  const targetDecimal = targetInput / 100

  const result = calculateSafeToMiss(total, present, targetDecimal)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance Calculator</h1>
        <p className="text-sm text-muted-foreground">How many classes can you miss?</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Numbers</CardTitle>
            <CardDescription>Enter your current attendance figures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="total-classes">Total Classes So Far</Label>
              <Input
                id="total-classes"
                type="number"
                min="0"
                placeholder="e.g. 80"
                value={totalStr}
                onChange={(e) => setTotalStr(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="present-classes">Classes Attended</Label>
              <Input
                id="present-classes"
                type="number"
                min="0"
                placeholder="e.g. 60"
                value={presentStr}
                onChange={(e) => setPresentStr(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-percentage">Target Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="target-percentage"
                  type="number"
                  min="50"
                  max="100"
                  placeholder={String(defaultTarget)}
                  value={targetStr}
                  onChange={(e) => setTargetStr(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Default from profile: {defaultTarget}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>Based on your current attendance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile === null ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : !totalStr || !presentStr ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Calculator className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Enter your numbers to see the result.
                </p>
              </div>
            ) : present > total ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive">
                  Attended classes cannot exceed total classes.
                </p>
              </div>
            ) : total === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Total classes must be greater than zero.
                </p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Current Attendance</p>
                  <p className="text-4xl font-bold tabular-nums">{result.currentPct.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">
                    {present} / {total} classes
                  </p>
                </div>

                {result.type === 'safe-to-miss' ? (
                  <div className="rounded-lg border border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent p-5 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
                    <p className="mt-3 text-xl font-bold text-green-600 dark:text-green-400">
                      You can miss {result.value} more class{result.value !== 1 ? 'es' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      and still stay at or above {Math.round(targetDecimal * 100)}%
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-5 text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
                    <p className="mt-3 text-xl font-bold text-amber-600 dark:text-amber-400">
                      You need to attend {result.value} more class{result.value !== 1 ? 'es' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      in a row to reach {Math.round(targetDecimal * 100)}%
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
