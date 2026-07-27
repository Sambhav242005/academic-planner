# API.md — Endpoints & Data Access

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Client (Browser)                                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  TanStack Query → authenticated Next.js routes  │    │
│  │  (server-scoped Supabase admin access)           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  NextAuth.js → /api/auth/[...nextauth]          │    │
│  │  (Magic link sign-in via Resend)                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  MCP Client → POST /api/mcp                     │    │
│  │  (AI assistant access, session-authenticated)    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 1. NextAuth Routes

### `POST /api/auth/[...nextauth]`

The login and signup forms call this endpoint with `redirect: false`, so the
browser remains on the email-sent confirmation UI instead of rendering an
internal `/api` response page. The email link still uses NextAuth's protected
callback route internally before redirecting to `/`.

Handles authentication via NextAuth.js v5 with the Supabase adapter and Resend magic link provider.

**Handler file:** `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from '@/lib/auth/auth'
export const { GET, POST } = handlers
```

**Configuration** (`src/lib/auth/auth.ts`):

```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: 'noreply@academic-planner.app',
    }),
  ],
  pages: { signIn: '/login' },
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id
      return session
    },
  },
})
```

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/signin` | POST | Initiate magic link sign-in (sends email via Resend) |
| `/api/auth/callback` | GET | Handle magic link callback (verify token, create session) |
| `/api/auth/signout` | POST | Sign out (destroy session) |
| `/api/auth/session` | GET | Get current session data |
| `/api/auth/csrf` | GET | Get CSRF token |

### Session Helper: `auth()`

Server component function to get the current session:

```typescript
import { auth } from '@/lib/auth/auth'

const session = await auth()
if (!session?.user) redirect('/login')
// session.user.id is available
```

### Client Hook: `useSession()`

```typescript
'use client'
import { useSession } from 'next-auth/react'

const { data: session } = useSession()
// session.user.id, session.user.name, session.user.email
```

---

## 2. MCP Endpoint

### `POST /api/mcp`

Model Context Protocol server endpoint for AI assistants. Accepts MCP protocol messages via `WebStandardStreamableHTTPServerTransport`.

**Handler file:** `src/app/api/mcp/route.ts`

### Authentication

The endpoint verifies a valid NextAuth session before processing requests:

- **Request:** POST with MCP JSON-RPC message in body
- **Headers:** Session cookie (`next-auth.session-token`) required
- **Response (unauthenticated):** HTTP 401 `{ error: 'Unauthorized' }`
- **Response (authenticated):** MCP JSON-RPC response stream

### Tool Signatures

All tools return MCP content blocks with `type: 'text'` and JSON-serialized data.

#### list_subjects

```
Input:  {}
Output: { content: [{ type: 'text', text: JSON.stringify(subjects) }] }
```

Returns all subjects for the authenticated user.

#### list_subjects_with_attendance

```
Input:  {}
Output: { content: [{ type: 'text', text: JSON.stringify(subjects_with_stats) }] }
```

Returns subjects with computed attendance statistics (total classes, present count, percentage).

#### create_task

```
Input:  { title: string, subject_id?: string, due_date?: string, priority?: 'low'|'medium'|'high', note?: string }
Output: { content: [{ type: 'text', text: JSON.stringify(task) }] }
```

Creates a new task with `source: 'ai'`. Returns the created task object.

#### list_tasks

```
Input:  { completed?: boolean, priority?: 'low'|'medium'|'high' }
Output: { content: [{ type: 'text', text: JSON.stringify(tasks) }] }
```

Lists tasks with optional filters. Includes subject relation.

#### update_task

```
Input:  { task_id: string, title?: string, completed?: boolean, priority?: 'low'|'medium'|'high', due_date?: string|null, note?: string }
Output: { content: [{ type: 'text', text: JSON.stringify(task) }] }
```

Updates an existing task. Returns the updated task object.

#### delete_task

```
Input:  { task_id: string }
Output: { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }] }
```

Deletes a task by ID.

#### get_today_classes

```
Input:  {}
Output: { content: [{ type: 'text', text: JSON.stringify(classes) }] }
```

Returns today's recurring classes and one-off class instances, each with subject and attendance data.

#### get_attendance_stats

```
Input:  { subject_id?: string }
Output: { content: [{ type: 'text', text: JSON.stringify(stats) }] }
```

Returns attendance statistics (total, present, absent, cancelled, holiday, percentage). Optionally filtered by subject.

### Tool Implementation Location

All tool implementations live in `src/lib/mcp/tools.ts` as standalone async functions accepting `McpContext` (`{ userId: string }`).

---

## 3. Server-only Supabase Access

Client components call authenticated route handlers through TanStack Query. Route handlers derive the user ID from NextAuth and scope every admin-client query to that user.

### Historical browser client (removed)

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

No browser database client is shipped by the application. The example above is retained only as historical context and must not be reintroduced.

### Common Query Pattern

```typescript
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

const supabase = createClient()

const { data, isLoading } = useQuery({
  queryKey: ['subjects'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },
})
```

### Common Mutation Pattern

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: async (values) => {
    const { error } = await supabase
      .from('subjects')
      .insert({ user_id: session.user.id, ...values })
    if (error) throw error
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['subjects'] })
  },
})
```

### Server Client

```typescript
// src/lib/supabase/server.ts
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll(cookiesToSet) { ... } } }
  )
}
```

Used in server components. Reads cookies for session management.

### Admin Client

```typescript
// src/lib/supabase/admin.ts
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

Used by authenticated application route handlers and MCP tools. It bypasses RLS, so every query must explicitly scope ownership:
```typescript
.eq('user_id', ctx.userId)
```

---

## 4. MCP Authentication Flow

### Via Session Cookie

```
1. External AI assistant sends POST to /api/mcp with session cookie
2. Server calls auth() → extracts session.user.id
3. Creates MCP server, passes userId via authInfo.extra
4. Each tool handler receives userId and scopes queries to it
```

### Via MCP API Key

```
1. User generates MCP API key in Settings
2. External AI assistant sends the key in the x-api-key header
3. Server looks up key_hash in mcp_api_keys table
4. Resolves userId from matching row
5. Same query scoping as session path
```

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# NextAuth
AUTH_SECRET=...
AUTH_RESEND_KEY=re_...

# Resend
RESEND_API_KEY=re_...
```

All variables are defined in `.env.local` for development and configured as Vercel environment variables for production.
