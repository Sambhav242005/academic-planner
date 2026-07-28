import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOtp, hashOtp, sendOtpEmail } from '@/lib/auth/otp'

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

  const client = createAdminClient()

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
