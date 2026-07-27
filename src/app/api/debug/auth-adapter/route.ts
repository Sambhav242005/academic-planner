import { NextResponse } from 'next/server'
import { createAdminClient } from '@supabase/server/core'

export async function GET() {
  if (process.env.ENABLE_INTERNAL_AUTH_ADAPTER_DEBUG !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Missing env vars',
        details: {
          hasSupabaseUrl: Boolean(url),
          hasSecretKey: Boolean(secretKey),
        },
      },
      { status: 500 }
    )
  }

  const admin = createAdminClient({
    env: {
      url,
      secretKeys: { default: secretKey },
    },
    supabaseOptions: { db: { schema: 'next_auth' } },
  })

  const { error } = await admin.from('users').select('id, email').limit(1)

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        schema: 'next_auth',
        table: 'users',
        error: 'Unable to verify the auth adapter.',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, schema: 'next_auth', table: 'users' })
}
