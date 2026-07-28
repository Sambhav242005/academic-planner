'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
}

function OtpInput({ value, onChange, onComplete, disabled }: OtpInputProps) {
  const refs: (HTMLInputElement | null)[] = []

  function handleInput(index: number, char: string) {
    if (!/^\d$/.test(char)) return
    const next = value.slice(0, index) + char + value.slice(index, 5)
    const trimmed = next.slice(0, 6)
    onChange(trimmed)
    if (index < 5 && trimmed[index]) refs[index + 1]?.focus()
    if (trimmed.length === 6) onComplete?.(trimmed)
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1))
      }
      if (index > 0 && !value[index]) refs[index - 1]?.focus()
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleInput(i, e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          autoFocus={i === 0}
          aria-label={`Digit ${i + 1}`}
          className="w-12 h-14 text-center text-2xl font-semibold rounded-xl border border-gray-700 bg-gray-900 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all disabled:opacity-50"
        />
      ))}
    </div>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const oauthData = searchParams.get('oauth')

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleSendOtp = useCallback(async () => {
    if (!email || loading) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send code')
        return
      }

      setStep('otp')
      setCooldown(data.cooldown || 30)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [email, loading])

  const handleVerifyOtp = useCallback(async (code: string) => {
    if (!email || !code || loading) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/oauth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          otp: code,
          oauth: oauthData,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Verification failed')
        setOtp('')
        return
      }

      // Redirect back to ChatGPT with auth code
      window.location.href = data.redirect_to
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [email, oauthData, loading])

  if (!oauthData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-red-400">Invalid OAuth request</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-violet-500 mb-4">
              <span className="text-xl">&#127891;</span>
            </div>
            <h1 className="text-xl font-semibold text-white">Academic Planner</h1>
            <p className="text-sm text-gray-400 mt-1">Sign in to connect with ChatGPT</p>
          </div>

          {step === 'email' ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                  placeholder="you@example.com"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all disabled:opacity-50"
                />
              </div>
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
              <button
                onClick={handleSendOtp}
                disabled={loading || !email}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send code'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 text-center">
                Enter the 6-digit code sent to <span className="text-white">{email}</span>
              </p>
              <OtpInput
                value={otp}
                onChange={setOtp}
                onComplete={handleVerifyOtp}
                disabled={loading}
              />
              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
              {loading && (
                <p className="text-sm text-gray-400 text-center">Verifying...</p>
              )}
              <div className="flex justify-between items-center text-sm">
                <button
                  onClick={() => { setStep('email'); setOtp(''); setError('') }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Change email
                </button>
                <button
                  onClick={handleSendOtp}
                  disabled={cooldown > 0 || loading}
                  className="text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OAuthLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
