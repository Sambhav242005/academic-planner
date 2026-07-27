# AI.md — MCP Server Architecture & Tool Definitions

## Architecture Overview

The app exposes a **Model Context Protocol (MCP)** server at `POST /api/mcp` that allows external AI assistants (Claude, Cursor, ChatGPT, etc.) to read and write the user's academic data. The server uses `@modelcontextprotocol/sdk` with `WebStandardStreamableHTTPServerTransport`.

```
┌─────────────────────────────────────────────┐
│  External AI Assistant                      │
│  (Claude/Cursor/ChatGPT)                    │
│                     │                       │
│          MCP Protocol (Streamable HTTP)      │
│                     │                       │
├─────────────────────▼───────────────────────┤
│  Next.js App  │  POST /api/mcp              │
│               │                             │
│  ┌────────────▼────────────────────────┐    │
│  │  auth() — verifies NextAuth session │    │
│  │  Extracts session.user.id           │    │
│  └────────────┬────────────────────────┘    │
│               │                             │
│  ┌────────────▼────────────────────────┐    │
│  │  McpServer — tool definitions       │    │
│  │  (zod input validation)             │    │
│  └────────────┬────────────────────────┘    │
│               │                             │
│  ┌────────────▼────────────────────────┐    │
│  │  tools/*.ts — individual handlers   │    │
│  │  createAdminClient() — service role │    │
│  └────────────┬────────────────────────┘    │
│               │                             │
├───────────────▼─────────────────────────────┤
│  Supabase (Postgres + RLS bypassed)         │
└─────────────────────────────────────────────┘
```

### Transport

Uses `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`:

```typescript
const transport = new WebStandardStreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
})

const server = createServer()
await server.connect(transport)
```

This transport supports both streaming and non-streaming HTTP MCP connections, compatible with Claude Desktop, Cursor, and other MCP clients.

---

## Authentication

All MCP requests require a valid NextAuth session cookie (same-site, httpOnly). The route handler verifies the session before creating the MCP server:

```typescript
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const transport = new WebStandardStreamableHTTPServerTransport({})

  const server = createServer()
  await server.connect(transport)

  const enhancedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    duplex: 'half',
  } as RequestInit & { duplex: string })

  return transport.handleRequest(enhancedRequest, {
    authInfo: {
      token: '',
      clientId: session.user.id,
      scopes: [],
      extra: { userId: session.user.id },
    },
  })
}
```

The `userId` is extracted from `extra.authInfo.extra.userId` in each tool handler via a helper function:

```typescript
function userId(extra: RequestHandlerExtra<any, any>): string {
  return extra.authInfo?.extra?.userId as string
}
```

### Alternative Auth: API Key

Users can generate MCP API keys in Settings (`mcp_api_keys` table). These can be used for MCP authentication when session cookies are not available (e.g., external tools). The key is passed as a Bearer token in the Authorization header. The server looks up the key hash in the `mcp_api_keys` table and resolves the `userId` from the matching row.

---

## Tool Definitions

All 8 tools are defined in `src/app/api/mcp/route.ts` with `zod` input schemas and implemented in `src/lib/mcp/tools.ts`.

### 1. list_subjects

```typescript
server.registerTool('list_subjects', {
  description: 'List all subjects',
  inputSchema: z.object({}),
}, async (_args, extra) => {
  const result = await tools.listSubjects({ userId: userId(extra) })
  return { content: [{ type: 'text', text: JSON.stringify(result.subjects) }] }
})
```

**Input:** None
**Output:** `{ subjects: Subject[] }` — array of subjects with id, name, color, userId

### 2. list_subjects_with_attendance

```typescript
server.registerTool('list_subjects_with_attendance', {
  description: 'List all subjects with their attendance statistics',
  inputSchema: z.object({}),
}, async (_args, extra) => {
  const result = await tools.listSubjectsWithAttendance({ userId: userId(extra) })
  return { content: [{ type: 'text', text: JSON.stringify(result.subjects) }] }
})
```

**Input:** None
**Output:** `{ subjects: Array<{ id, name, color, total, present, percentage }> }` — per-subject attendance stats

### 3. create_task

```typescript
server.registerTool('create_task', {
  description: 'Create a new task (AI-sourced)',
  inputSchema: z.object({
    title: z.string().describe('Task title'),
    subject_id: z.string().optional().describe('Subject ID (optional)'),
    due_date: z.string().optional().describe('Due date in YYYY-MM-DD format (optional)'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority (default: medium)'),
    note: z.string().optional().describe('Optional note'),
  }),
}, async (args, extra) => {
  const result = await tools.createTask({ userId: userId(extra) }, {
    title: args.title,
    subject_id: args.subject_id,
    due_date: args.due_date,
    priority: args.priority ?? 'medium',
    note: args.note,
  })
  return { content: [{ type: 'text', text: JSON.stringify(result.task) }] }
})
```

**Input:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `title` | string | Yes | — | Task title |
| `subject_id` | string | No | null | Subject UUID |
| `due_date` | string | No | null | YYYY-MM-DD |
| `priority` | enum | No | 'medium' | low/medium/high |
| `note` | string | No | '' | Free-text note |

**Output:** `{ task: Task }` — the created task object

**Behaviour:** Sets `source = 'ai'` automatically

### 4. list_tasks

```typescript
server.registerTool('list_tasks', {
  description: 'List all tasks with optional filters',
  inputSchema: z.object({
    completed: z.boolean().optional().describe('Filter by completion status'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Filter by priority'),
  }),
}, async (args, extra) => {
  const result = await tools.listTasks({ userId: userId(extra) }, {
    completed: args.completed,
    priority: args.priority,
  })
  return { content: [{ type: 'text', text: JSON.stringify(result.tasks) }] }
})
```

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `completed` | boolean | No | Filter by completion status |
| `priority` | enum | No | Filter by priority level |

**Output:** `{ tasks: Task[] }` — array of tasks with subject relation

### 5. update_task

```typescript
server.registerTool('update_task', {
  description: 'Update an existing task',
  inputSchema: z.object({
    task_id: z.string().describe('Task ID to update'),
    title: z.string().optional().describe('New title'),
    completed: z.boolean().optional().describe('Completion status'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('New priority'),
    due_date: z.string().nullable().optional().describe('New due date in YYYY-MM-DD or null'),
    note: z.string().optional().describe('New note'),
  }),
}, async (args, extra) => {
  const result = await tools.updateTask({ userId: userId(extra) }, {
    task_id: args.task_id,
    title: args.title,
    completed: args.completed,
    priority: args.priority,
    due_date: args.due_date,
    note: args.note,
  })
  return { content: [{ type: 'text', text: JSON.stringify(result.task) }] }
})
```

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string | Yes | Task UUID to update |
| `title` | string | No | New title |
| `completed` | boolean | No | New completion status |
| `priority` | enum | No | New priority |
| `due_date` | string\|null | No | New due date or null to clear |
| `note` | string | No | New note |

**Output:** `{ task: Task }` — the updated task object

### 6. delete_task

```typescript
server.registerTool('delete_task', {
  description: 'Delete a task',
  inputSchema: z.object({
    task_id: z.string().describe('Task ID to delete'),
  }),
}, async (args, extra) => {
  const result = await tools.deleteTask({ userId: userId(extra) }, { task_id: args.task_id })
  return { content: [{ type: 'text', text: JSON.stringify(result) }] }
})
```

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string | Yes | Task UUID to delete |

**Output:** `{ deleted: true }`

### 7. get_today_classes

```typescript
server.registerTool('get_today_classes', {
  description: "Get today's class schedule including attendance status",
  inputSchema: z.object({}),
}, async (_args, extra) => {
  const result = await tools.getTodayClasses({ userId: userId(extra) })
  return { content: [{ type: 'text', text: JSON.stringify(result.classes) }] }
})
```

**Input:** None
**Output:** `{ classes: Array<RecurringClass & ClassInstance> }` — today's recurring classes and one-off class instances, each with subject and attendance data

### 8. get_attendance_stats

```typescript
server.registerTool('get_attendance_stats', {
  description: 'Get attendance statistics, optionally filtered by subject',
  inputSchema: z.object({
    subject_id: z.string().optional().describe('Optional subject ID to filter by'),
  }),
}, async (args, extra) => {
  const result = await tools.getAttendanceStats({ userId: userId(extra) }, { subject_id: args.subject_id })
  return { content: [{ type: 'text', text: JSON.stringify(result) }] }
})
```

**Input:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subject_id` | string | No | Filter stats to a specific subject |

**Output:**
```json
{
  "total": 50,
  "present": 40,
  "absent": 5,
  "cancelled": 3,
  "holiday": 2,
  "percentage": 89
}
```

Percentage is calculated as: `round(present / (present + absent) * 100)`

---

## Tool Implementation Pattern

All tools in `src/lib/mcp/tools.ts` follow the same pattern:

1. Accept `McpContext` (`{ userId: string }`) as first parameter
2. Create an admin Supabase client via `createAdminClient()` (service role key)
3. Query Supabase with `.eq('user_id', ctx.userId)` filter for data isolation
4. Return typed result objects
5. Throw `Error` on database failures (caught by MCP server and returned as error content)

The admin client bypasses RLS, so every query explicitly scopes to the authenticated user's ID.

---

## Security Model

| Concern | Implementation |
|---------|---------------|
| Authentication | NextAuth session cookie OR MCP API key |
| Authorization | All queries scoped to `userId` from session/key |
| Data isolation | RLS on all tables + explicit `.eq('user_id', ...)` in admin queries |
| Write path | Only tasks can be created/updated/deleted via MCP |
| Read path | Subjects, tasks, classes, attendance stats |
| Immutable data | Attendance records, class instances cannot be modified via MCP |
| Key security | Full API key shown only at creation; only hash stored |

---

## How External AI Assistants Connect

### Claude Desktop

```json
{
  "mcpServers": {
    "academic-planner": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "Cookie": "next-auth.session-token=..."
      }
    }
  }
}
```

### Cursor / Other MCP Clients

```
MCP Server URL: https://your-app.vercel.app/api/mcp
Authentication: Session cookie or Bearer token with MCP API key
```

---

## Future: DeepSeek Chat Integration

In a future phase, the app will include a chat UI that uses DeepSeek V4 Flash for natural language Q&A over the user's data. The MCP tools serve as the foundation — the chat endpoint will call the same tool implementations internally.

Current chat architecture (not yet implemented):

| Component | Purpose |
|-----------|---------|
| `/api/chat` | Streaming chat endpoint (DeepSeek V4 Flash) |
| Chat UI | Floating chat drawer with message bubbles |
| Context builder | Gathers today's classes, tasks, attendance for prompt |
| Action preview | Shows DeepSeek output before writing data |

For now, the MCP server IS the AI integration — external assistants connect to it directly.
