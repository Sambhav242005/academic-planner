import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOtp, hashOtp, sendOtpEmail } from '@/lib/auth/otp'

// In-memory rate limiters (process-local, resets on restart)
// Primary: per-email daily limit — protects Resend quota and prevents email floods.
// Secondary: per-IP short window — requires trusted reverse proxy to set x-forwarded-for.
//   If your proxy doesn't overwrite this header, attackers can bypass IP limits
//   by spoofing the header. The email-based limit is the real protection.

// Per-email: max 10 OTPs per email per day
const DAILY_LIMIT = 10
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000
const dailyLimits = new Map<string, { count: number; resetAt: number }>()

// Per-IP: max 10 requests per IP per 10 minutes (requires trusted proxy)
const IP_LIMIT = 10
const IP_WINDOW_MS = 10 * 60 * 1000
const ipLimits = new Map<string, { count: number; resetAt: number }>()

const MAX_KEYS = 5_000

function evictExpired(map: Map<string, { count: number; resetAt: number }>, now: number) {
  if (map.size > MAX_KEYS) {
    for (const [k, v] of map) {
      if (v.resetAt <= now) map.delete(k)
    }
  }
}

function isDailyLimited(email: string): boolean {
  const now = Date.now()
  evictExpired(dailyLimits, now)
  const entry = dailyLimits.get(email)
  if (entry && entry.resetAt > now) {
    if (entry.count >= DAILY_LIMIT) return true
    entry.count += 1
    return false
  }
  dailyLimits.set(email, { count: 1, resetAt: now + DAILY_WINDOW_MS })
  return false
}

function isIpLimited(ip: string): boolean {
  const now = Date.now()
  evictExpired(ipLimits, now)
  const entry = ipLimits.get(ip)
  if (entry && entry.resetAt > now) {
    if (entry.count >= IP_LIMIT) return true
    entry.count += 1
    return false
  }
  ipLimits.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS })
  return false
}

// Requires reverse proxy to overwrite x-forwarded-for with the true client IP.
// Without a trusted proxy, this header is spoofable and IP limits are bypassable.
function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email: string | undefined = body?.email

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  // IP-based rate limit
  const ip = getClientIp(req)
  if (isIpLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  // Daily per-email limit
  if (isDailyLimited(normalizedEmail)) {
    return NextResponse.json({ error: 'Daily limit reached. Please try again tomorrow.' }, { status: 429 })
  }

  const client = createAdminClient()

  // Demo user: skip OTP entirely — any code will work on verify (only in dev or when ENABLE_DEMO is set)
  if (normalizedEmail === 'user@academic-planner.dev' && (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEMO === 'true')) {
    return NextResponse.json({ ok: true, cooldown: 0, demo: true })
  }

  const { data: existing } = await client
    .schema('next_auth')
    .from('otps')
    .select('created_at')
    .eq('identifier', normalizedEmail)
    .maybeSingle()

  if (existing?.created_at) {
    const elapsed = (Date.now() - new Date(existing.created_at).getTime()) / 1000
    if (elapsed < 30) {
      return NextResponse.json(
        { error: 'Please wait before requesting a new code', cooldown: Math.ceil(30 - elapsed) },
        { status: 429 },
      )
    }
  }

  const otp = generateOtp()
  const otpHash = hashOtp(otp)
  const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const { error: upsertError } = await client
    .schema('next_auth')
    .from('otps')
    .upsert(
      {
        identifier: normalizedEmail,
        otp_hash: otpHash,
        expires,
        attempts: 0,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'identifier' },
    )

  if (upsertError) {
    return NextResponse.json({ error: 'Failed to store code' }, { status: 500 })
  }

  try {
    await sendOtpEmail(normalizedEmail, otp)
  } catch {
    await client.schema('next_auth').from('otps').delete().eq('identifier', normalizedEmail)
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cooldown: 30 })
}
