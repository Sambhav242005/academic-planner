import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js'
import { jwtVerify } from 'jose'
import { auth } from '@/lib/auth/auth'
import { validateApiKey } from '@/lib/mcp/auth'
import { getVerificationKey } from '@/lib/oauth/keys'
import * as tools from '@/lib/mcp/tools'
import { z } from 'zod'

type RateLimitEntry = { count: number; resetAt: number }
const MCP_RATE_LIMIT = 60
const MCP_RATE_WINDOW_MS = 60_000
const MCP_RATE_MAX_KEYS = 10_000
const mcpRateLimits = new Map<string, RateLimitEntry>()
function isMcpRateLimited(request: NextRequest): boolean {
  const identifier = request.headers.get('x-api-key') ?? request.headers.get('x-forwarded-for') ?? 'anonymous'
  const key = createHash('sha256').update(identifier).digest('hex')
  const now = Date.now()

  // Evict expired entries if map grows too large (prevents unbounded memory growth)
  if (mcpRateLimits.size > MCP_RATE_MAX_KEYS) {
    for (const [k, v] of mcpRateLimits) {
      if (v.resetAt <= now) mcpRateLimits.delete(k)
    }
  }

  const current = mcpRateLimits.get(key)
  if (current && current.resetAt > now) {
    if (current.count >= MCP_RATE_LIMIT) return true
    current.count += 1
    return false
  }
  mcpRateLimits.set(key, { count: 1, resetAt: now + MCP_RATE_WINDOW_MS })
  return false
}

async function validateOAuthToken(token: string): Promise<string | null> {
  try {
    const verificationKey = await getVerificationKey()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://planner.sambhav-surana.online'
    const { payload } = await jwtVerify(token, verificationKey, {
      issuer: baseUrl,
      audience: `${baseUrl}/api/mcp`,
    })
    return (payload.sub as string) ?? null
  } catch (err) {
    console.error('[MCP] Token validation failed:', err instanceof Error ? err.message : err)
    return null
  }
}

function createServer() {
  const server = new McpServer({
    name: 'academic-planner-mcp',
    version: '1.0.0',
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function userId(extra: RequestHandlerExtra<any, any>): string {
    return extra.authInfo?.extra?.userId as string
  }

  server.registerTool('list_semesters', {
    title: 'List Semesters',
    description: 'Returns all semesters for the authenticated user. Each semester has an id, label, and whether it is active.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false },
  }, async (_args, extra) => {
    const result = await tools.listSemesters({ userId: userId(extra) })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.semesters) }] }
  })

  server.registerTool('create_semester', {
    title: 'Create Semester',
    description: 'Creates a new semester. If is_active is true, all other semesters are deactivated.',
    inputSchema: z.object({
      label: z.string().min(1).max(50).describe('Semester label (e.g. "Sem VII")'),
      is_active: z.boolean().optional().describe('Mark as active semester (default: false)'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async (args, extra) => {
    const result = await tools.createSemester({ userId: userId(extra) }, {
      label: args.label,
      is_active: args.is_active,
    })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.semester) }] }
  })

  server.registerTool('list_subjects', {
    title: 'List Subjects',
    description: 'Returns all academic subjects for the authenticated user. Each subject includes an id, name, and color code. Use this to discover available subjects before creating tasks or checking attendance.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false },
  }, async (_args, extra) => {
    const result = await tools.listSubjects({ userId: userId(extra) })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.subjects) }] }
  })

  server.registerTool('create_subject', {
    title: 'Create Subject',
    description: 'Creates a new academic subject. Each subject has a name, color code (hex like "#3b82f6"), and must belong to an existing semester.',
    inputSchema: z.object({
      name: z.string().min(1).max(100).describe('Subject name'),
      color: z.string().min(1).max(20).describe('Color code (hex like "#3b82f6")'),
      semester_id: z.string().describe('Semester ID (must be an existing semester)'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async (args, extra) => {
    const result = await tools.createSubject({ userId: userId(extra) }, {
      name: args.name,
      color: args.color,
      semester_id: args.semester_id,
    })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.subject) }] }
  })

  server.registerTool('list_recurring_classes', {
    title: 'List Recurring Classes',
    description: 'Returns all recurring class entries in the timetable, ordered by day and time. Each entry includes subject name, day of week, time, and class type.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false },
  }, async (_args, extra) => {
    const result = await tools.listRecurringClasses({ userId: userId(extra) })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.recurring_classes) }] }
  })

  server.registerTool('create_recurring_class', {
    title: 'Create Recurring Class',
    description: 'Creates a recurring class slot in the timetable. day_of_week: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday. start_time/end_time in HH:MM format (24h). class_type: theory, clinical, practical, tutorial, or exam.',
    inputSchema: z.object({
      subject_id: z.string().describe('Subject ID for this class'),
      day_of_week: z.number().min(0).max(6).describe('Day of week (0=Mon, 6=Sun)'),
      start_time: z.string().describe('Start time in HH:MM format (24h)'),
      end_time: z.string().optional().describe('End time in HH:MM format (24h, optional)'),
      class_type: z.enum(['theory', 'clinical', 'practical', 'tutorial', 'exam']).optional().describe('Class type (default: theory)'),
      semester_id: z.string().optional().describe('Semester ID (optional)'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async (args, extra) => {
    const result = await tools.createRecurringClass({ userId: userId(extra) }, {
      subject_id: args.subject_id,
      day_of_week: args.day_of_week,
      start_time: args.start_time,
      end_time: args.end_time,
      class_type: args.class_type,
      semester_id: args.semester_id,
    })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.recurring_class) }] }
  })

  server.registerTool('list_subjects_with_attendance', {
    title: 'List Subjects with Attendance',
    description: 'Returns all subjects with per-subject attendance statistics: total classes, present count, and attendance percentage. Use this to see which subjects need attention.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false },
  }, async (_args, extra) => {
    const result = await tools.listSubjectsWithAttendance({ userId: userId(extra) })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.subjects) }] }
  })

  server.registerTool('create_task', {
    title: 'Create Task',
    description: 'Creates a new task for the authenticated user. Tasks can be linked to a subject, have a due date, priority level (low/medium/high), and a note. Tasks created by AI are marked with source "ai".',
    inputSchema: z.object({
      title: z.string().min(1).max(200).describe('Task title'),
      subject_id: z.string().optional().describe('Subject ID to link the task to (optional)'),
      due_date: z.string().max(10).optional().describe('Due date in YYYY-MM-DD format (optional)'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority level (default: medium)'),
      note: z.string().max(2000).optional().describe('Additional note for the task'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async (args, extra) => {
    const result = await tools.createTask({ userId: userId(extra) }, {
      title: args.title,
      subject_id: args.subject_id,
      due_date: args.due_date,
      priority: args.priority ?? 'medium',
      note: args.note,
    })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.task) }] }
  })

  server.registerTool('list_tasks', {
    title: 'List Tasks',
    description: 'Returns all tasks for the authenticated user with optional filters. Filter by completion status or priority. Each task includes title, subject, due date, priority, and source.',
    inputSchema: z.object({
      completed: z.boolean().optional().describe('Filter by completion status (true=completed, false=active)'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Filter by priority level'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  }, async (args, extra) => {
    const result = await tools.listTasks({ userId: userId(extra) }, {
      completed: args.completed,
      priority: args.priority,
    })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.tasks) }] }
  })

  server.registerTool('update_task', {
    title: 'Update Task',
    description: 'Updates an existing task. Only provided fields are changed. Pass null for due_date to clear it. Returns the updated task.',
    inputSchema: z.object({
      task_id: z.string().describe('Task ID to update'),
      title: z.string().min(1).max(200).optional().describe('New title'),
      completed: z.boolean().optional().describe('Set completion status'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('New priority level'),
      due_date: z.string().max(10).nullable().optional().describe('New due date (YYYY-MM-DD) or null to clear'),
      note: z.string().max(2000).optional().describe('New note'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false },
  }, async (args, extra) => {
    const result = await tools.updateTask({ userId: userId(extra) }, {
      task_id: args.task_id,
      title: args.title,
      completed: args.completed,
      priority: args.priority,
      due_date: args.due_date,
      note: args.note,
    })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.task) }] }
  })

  server.registerTool('delete_task', {
    title: 'Delete Task',
    description: 'Permanently deletes a task. This action cannot be undone.',
    inputSchema: z.object({
      task_id: z.string().describe('Task ID to delete'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async (args, extra) => {
    const result = await tools.deleteTask({ userId: userId(extra) }, { task_id: args.task_id })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
  })

  server.registerTool('get_today_classes', {
    title: "Today's Classes",
    description: "Returns today's class schedule for the authenticated user, including subject name, time, class type, and attendance status (present/absent/cancelled/holiday). Use this to understand what classes the user has today.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false },
  }, async (_args, extra) => {
    const result = await tools.getTodayClasses({ userId: userId(extra) })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.classes) }] }
  })

  server.registerTool('get_attendance_stats', {
    title: 'Attendance Statistics',
    description: 'Returns attendance statistics: total classes, present/absent/cancelled/holiday counts, and overall percentage. Optionally filter by a specific subject using its ID.',
    inputSchema: z.object({
      subject_id: z.string().optional().describe('Subject ID to filter by (omit for overall stats)'),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false },
  }, async (args, extra) => {
    const result = await tools.getAttendanceStats({ userId: userId(extra) }, { subject_id: args.subject_id })
    return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
  })

  return server
}

export async function POST(request: NextRequest) {
  if (isMcpRateLimited(request)) {
    return Response.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  let userId: string | null = null

  // Try OAuth Bearer token first (ChatGPT)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    userId = await validateOAuthToken(token)
  }

  // Try API key
  if (!userId) {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey) {
      userId = await validateApiKey(apiKey)
    }
  }

  // Try session cookie
  if (!userId) {
    const session = await auth()
    userId = session?.user?.id ?? null
  }

  if (!userId) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://planner.sambhav-surana.online'
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Provide a Bearer token, x-api-key header, or sign in via the app.' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", error="invalid_token", error_description="Authentication required"`,
        },
      }
    )
  }

  // Pre-parse body to avoid stream consumption issues in Next.js App Router.
  // The WebStandardStreamableHTTPServerTransport calls req.json() internally,
  // but Next.js's ReadableStream body can only be consumed once.
  let parsedBody: unknown
  try {
    parsedBody = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error: Invalid JSON' }, id: null }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  console.log('[MCP] Request:', { method: request.method })

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  transport.onerror = (err) => {
    console.error('[MCP] Transport error:', err.message)
  }

  const server = createServer()
  await server.connect(transport)

  const response = await transport.handleRequest(request, {
    parsedBody,
    authInfo: {
      token: '',
      clientId: userId,
      scopes: [],
      extra: { userId },
    },
  })

  console.log('[MCP] Response:', { status: response.status })

  return response
}

export async function GET() {
  // MCP Streamable HTTP spec: GET establishes an SSE stream for server-initiated messages.
  // In stateless mode we don't support SSE streams, so return 405 per the SDK example.
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null }),
    { status: 405, headers: { Allow: 'POST', 'Content-Type': 'application/json' } }
  )
}
