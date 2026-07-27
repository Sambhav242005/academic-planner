import NextAuth from 'next-auth'
import Resend from 'next-auth/providers/resend'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import {
  magicLinkEmailHtml,
  magicLinkEmailText,
} from '@/lib/auth/email-template'

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
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: 'Academic Planner <noreply@sambhav-surana.online>',
      sendVerificationRequest: async (params) => {
        const { identifier: to, url } = params
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Academic Planner <noreply@sambhav-surana.online>',
            to,
            subject: 'Sign in to Academic Planner',
            html: magicLinkEmailHtml(url),
            text: magicLinkEmailText(url),
          }),
        })
        if (!res.ok) {
          const body = await res.text()
          throw new Error(`Resend email error: ${res.status} ${body}`)
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
})
