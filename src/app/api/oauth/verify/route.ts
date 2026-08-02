import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAuthCode } from '@/lib/oauth/store'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, otp, oauth: oauthDataB64 } = body

  if (!email || !otp || !oauthDataB64) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Decode OAuth params
  let oauthParams: {
    clientId: string
    redirectUri: string
    codeChallenge: string
    codeChallengeMethod: string
    state?: string
    scope?: string
  }
  try {
    oauthParams = JSON.parse(Buffer.from(oauthDataB64, 'base64url').toString())
  } catch {
    return NextResponse.json({ error: 'Invalid OAuth parameters' }, { status: 400 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const supabase = createAdminClient()

  // Demo user: skip OTP verification entirely (only in dev or when ENABLE_DEMO is set)
  const isDemoUser = normalizedEmail === 'user@academic-planner.dev' && (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEMO === 'true')

  if (!isDemoUser) {
    // Look up OTP record
    const { data: record } = await supabase
      .schema('next_auth')
      .from('otps')
      .select('*')
      .eq('identifier', normalizedEmail)
      .maybeSingle()

    if (!record) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 })
    }

    if (new Date() > new Date(record.expires)) {
      await supabase.schema('next_auth').from('otps').delete().eq('identifier', normalizedEmail)
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 })
    }

    if (record.attempts >= 5) {
      return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 429 })
    }

    // Verify OTP
    const [salt, key] = record.otp_hash.split(':')
    const { scryptSync } = await import('crypto')
    const computedHash = scryptSync(otp, salt, 64).toString('hex')
    const valid = computedHash === key

    if (!valid) {
      await supabase
        .schema('next_auth')
        .from('otps')
        .update({ attempts: (record.attempts ?? 0) + 1 })
        .eq('identifier', normalizedEmail)
      return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
    }

    // Delete used OTP
    await supabase.schema('next_auth').from('otps').delete().eq('identifier', normalizedEmail)
  }

  // Find or create user
  const { data: existingUser } = await supabase
    .schema('next_auth')
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  let userId: string

  if (existingUser) {
    userId = existingUser.id
  } else {
    const { data: newUser } = await supabase
      .schema('next_auth')
      .from('users')
      .insert({ email: normalizedEmail, emailVerified: new Date().toISOString() })
      .select('id')
      .single()

    if (!newUser) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
    userId = newUser.id
  }

  // Validate OAuth params server-side — don't trust client-supplied values
  const expectedClientId = 'chatgpt-academic-planner'
  if (oauthParams.clientId !== expectedClientId) {
    return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 })
  }
  if (oauthParams.codeChallengeMethod !== 'S256') {
    return NextResponse.json({ error: 'Unsupported code challenge method' }, { status: 400 })
  }

  // Validate redirect URI — exact match only (registered redirect URIs)
  const ALLOWED_REDIRECT_URIS = ['https://chatgpt.com/connector/oauth/callback']
  if (!ALLOWED_REDIRECT_URIS.includes(oauthParams.redirectUri)) {
    return NextResponse.json({ error: 'Invalid redirect URI' }, { status: 400 })
  }

  // Create authorization code
  const authCode = await createAuthCode({
    userId,
    clientId: oauthParams.clientId,
    redirectUri: oauthParams.redirectUri,
    codeChallenge: oauthParams.codeChallenge,
    codeChallengeMethod: oauthParams.codeChallengeMethod,
    scope: oauthParams.scope,
  })

  // Build redirect URL
  const redirectUrl = new URL(oauthParams.redirectUri)
  redirectUrl.searchParams.set('code', authCode)
  if (oauthParams.state) {
    redirectUrl.searchParams.set('state', oauthParams.state)
  }

  return NextResponse.json({ redirect_to: redirectUrl.toString() })
}
