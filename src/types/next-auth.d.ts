import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      demo?: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    demo?: boolean
  }
}
