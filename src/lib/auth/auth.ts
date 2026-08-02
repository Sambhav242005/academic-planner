import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import type { Adapter } from '@auth/core/adapters'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOtp } from '@/lib/auth/otp'
import { DEMO_USER_ID, DEMO_EMAIL, registerDemoUser } from '@/lib/demo/seed'

// Lazy adapter wrapper: SupabaseAdapter() immediately destructures url/secret,
// so we can't call it at build time. This wrapper defers creation until the
// first adapter method is actually invoked at runtime.
function lazySupabaseAdapter(): Adapter {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('Missing Supabase env vars: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY are required at runtime.')
  }
  return SupabaseAdapter({ url: supabaseUrl, secret: supabaseSecretKey })
}

let _adapter: Adapter | null = null

function getAdapter(): Adapter {
  if (!_adapter) _adapter = lazySupabaseAdapter()
  return _adapter
}

// Proxy the adapter so method calls are forwarded lazily.
// This lets NextAuth() import safely at build time — the real adapter
// is only created when a method is first called at runtime.
const adapterProxy = new Proxy({} as Adapter, {
  get(_target, prop, receiver) {
    const adapter = getAdapter()
    const value = Reflect.get(adapter, prop, receiver)
    if (typeof value === 'function') {
      return value.bind(adapter)
    }
    return value
  },
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: adapterProxy,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      id: 'otp',
      name: 'OTP',
      credentials: {
        email: { label: 'Email', type: 'email' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        const { email, otp } = credentials as { email: string; otp: string }
        if (!email || !otp) return null

        const normalizedEmail = email.toLowerCase().trim()
        const client = createAdminClient()

        // Demo user: skip OTP verification (only in development or when ENABLE_DEMO is set)
        if (normalizedEmail === DEMO_EMAIL && (process.env.NODE_ENV === 'development' || process.env.ENABLE_DEMO === 'true')) {
          const { data: existing } = await client
            .schema('next_auth')
            .from('users')
            .select('id, email, name, image')
            .eq('email', normalizedEmail)
            .maybeSingle()

          const demoId = existing?.id ?? DEMO_USER_ID
          registerDemoUser(demoId)

          if (existing) {
            return { id: demoId, email: existing.email, name: existing.name, image: existing.image }
          }

          const { data: newUser } = await client
            .schema('next_auth')
            .from('users')
            .insert({
              id: DEMO_USER_ID,
              email: normalizedEmail,
              emailVerified: new Date().toISOString(),
            })
            .select('id, email')
            .single()

          if (!newUser) return null
          registerDemoUser(newUser.id)
          return { id: newUser.id, email: newUser.email }
        }

        const { data: record } = await client
          .schema('next_auth')
          .from('otps')
          .select('*')
          .eq('identifier', normalizedEmail)
          .maybeSingle()

        if (!record) return null

        if (new Date() > new Date(record.expires)) {
          await client.schema('next_auth').from('otps').delete().eq('identifier', normalizedEmail)
          return null
        }

        if (record.attempts >= 5) return null

        const valid = verifyOtp(otp, record.otp_hash)
        if (!valid) {
          await client
            .schema('next_auth')
            .from('otps')
            .update({ attempts: (record.attempts ?? 0) + 1 })
            .eq('identifier', normalizedEmail)
          return null
        }

        await client.schema('next_auth').from('otps').delete().eq('identifier', normalizedEmail)

        const { data: user } = await client
          .schema('next_auth')
          .from('users')
          .select('id, email, name, image')
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (user) {
          return { id: user.id, email: user.email, name: user.name, image: user.image }
        }

        const { data: newUser } = await client
          .schema('next_auth')
          .from('users')
          .insert({ email: normalizedEmail, emailVerified: new Date().toISOString() })
          .select('id, email')
          .single()

        if (!newUser) return null
        return { id: newUser.id, email: newUser.email }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.demo = user.email === DEMO_EMAIL
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.demo = token.demo as boolean
      }
      return session
    },
  },
})
