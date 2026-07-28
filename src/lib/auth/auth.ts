import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyOtp } from '@/lib/auth/otp'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error('Missing Supabase env vars for Auth.js adapter: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY are required.')
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: SupabaseAdapter({
    url: supabaseUrl,
    secret: supabaseSecretKey,
  }),
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
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
