import { auth } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ZodError } from 'zod'

export async function requireUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new ApiError('Unauthorized', 401)
  }
  return session.user.id
}

export class ApiError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
  }
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof ZodError) {
    return Response.json({ error: 'Invalid request data.' }, { status: 400 })
  }
  console.error('Unhandled API error', error)
  return Response.json({ error: 'Unable to complete this request.' }, { status: 500 })
}

export async function requireOwnedRow(
  table: 'subjects' | 'semesters' | 'recurring_classes' | 'class_instances' | 'tasks' | 'attendance_records' | 'holidays',
  id: string,
  userId: string,
): Promise<void> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) {
    throw new ApiError('Not found', 404)
  }
}

export async function requireOwnedOptionalReference(
  table: 'subjects' | 'semesters' | 'recurring_classes',
  id: string | null | undefined,
  userId: string,
): Promise<void> {
  if (id) await requireOwnedRow(table, id, userId)
}
