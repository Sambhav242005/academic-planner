import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  verifyCredentials,
  createContextClient,
  createAdminClient,
} from '@supabase/server/core'
import type { SupabaseEnv } from '@supabase/server'

let cachedJwks: SupabaseEnv['jwks'] = null

async function getJwks(supabaseUrl: string): Promise<SupabaseEnv['jwks']> {
  if (cachedJwks) return cachedJwks
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
    if (!res.ok) return null
    cachedJwks = await res.json()
    return cachedJwks
  } catch {
    return null
  }
}

function resolveNextEnv(): Partial<SupabaseEnv> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const secretKey = process.env.SUPABASE_SECRET_KEY
  return {
    url: url ?? undefined,
    publishableKeys: publishableKey ? { default: publishableKey } : undefined,
    secretKeys: secretKey ? { default: secretKey } : undefined,
  }
}

export async function createClient() {
  const nextEnv = resolveNextEnv()

  if (!nextEnv.url || !nextEnv.publishableKeys?.default) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  }

  const cookieStore = await cookies()
  const ssrClient = createServerClient(
    nextEnv.url,
    nextEnv.publishableKeys.default,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
          }
        },
      },
    }
  )

  const {
    data: { session },
  } = await ssrClient.auth.getSession()
  const token = session?.access_token ?? null

  const jwks = await getJwks(nextEnv.url)
  const env = { ...nextEnv, jwks }

  const { data: auth, error } = await verifyCredentials(
    { token, apikey: null },
    { auth: 'user', env },
  )

  if (error || !auth) {
    return {
      supabase: ssrClient,
      supabaseAdmin: createAdminClient({ env }),
      userClaims: null,
      jwtClaims: null,
      authMode: 'none' as const,
    }
  }

  const supabase = createContextClient({
    auth: { token: auth.token },
    env,
  })
  const supabaseAdmin = createAdminClient({ env })

  return {
    supabase,
    supabaseAdmin,
    userClaims: auth.userClaims,
    jwtClaims: auth.jwtClaims,
    authMode: auth.authMode,
  }
}
