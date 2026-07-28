'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { GraduationCap, ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'
import { OtpInput } from '@/components/auth/otp-input'

type Step = 'email' | 'otp'

export default function AuthPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send code')
        return
      }
      setStep('otp')
      setCooldown(data.cooldown ?? 30)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerify(code: string) {
    if (code.length !== 6) return
    setIsLoading(true)
    setError('')
    try {
      const result = await signIn('otp', {
        email,
        otp: code,
        redirect: false,
        callbackUrl: '/',
      })
      if (!result?.ok) {
        setError('Invalid code. Please try again.')
        setOtp('')
        return
      }
      router.push(result.url || '/')
    } catch {
      setError('Something went wrong. Please try again.')
      setOtp('')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setOtp('')
    setError('')
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to resend code')
        return
      }
      setCooldown(data.cooldown ?? 30)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm flex flex-col items-center gap-6"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-gradient">Academic Planner</h1>
        <p className="text-sm text-muted-foreground">What do I need to do right now?</p>
      </div>

      <Card className="w-full bg-card border border-border">
        <CardHeader>
          {step === 'otp' && (
            <button
              onClick={() => {
                setStep('email')
                setError('')
                setOtp('')
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
              aria-label="Change email"
            >
              <ArrowLeft className="h-4 w-4" />
              Change email
            </button>
          )}
          <CardTitle>
            {step === 'email' ? 'Sign in' : 'Check your email'}
          </CardTitle>
          <CardDescription>
            {step === 'email'
              ? 'Enter your email to sign in or create an account.'
              : `Enter the code sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Continue'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <OtpInput
                value={otp}
                onChange={setOtp}
                onComplete={handleVerify}
                disabled={isLoading}
              />
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <div className="flex justify-center">
                <button
                  onClick={handleResend}
                  disabled={cooldown > 0 || isLoading}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
