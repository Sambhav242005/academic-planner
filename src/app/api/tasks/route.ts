import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, requireOwnedOptionalReference, requireUserId, toErrorResponse } from '@/lib/api/route'

const priority = z.enum(['low', 'medium', 'high'])
const taskInput = z.object({
  title: z.string().trim().min(1).max(200),
  subjectId: z.string().uuid().nullable(),
  dueDate: z.string().date().nullable(),
  priority,
  note: z.string().max(2000),
})
const updateInput = taskInput.extend({ id: z.string().uuid() })
const completionInput = z.object({ id: z.string().uuid(), completed: z.boolean() })
const deleteInput = z.object({ id: z.string().uuid() })

export async function GET() {
  try {
    const userId = await requireUserId()
    const { data, error } = await createAdminClient()
      .from('tasks')
      .select('*, subject:subjects(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return Response.json(data ?? [])
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId()
    const input = taskInput.parse(await request.json())
    await requireOwnedOptionalReference('subjects', input.subjectId, userId)
    const { data, error } = await createAdminClient()
      .from('tasks')
      .insert({
        user_id: userId,
        title: input.title,
        subject_id: input.subjectId,
        due_date: input.dueDate,
        priority: input.priority,
        note: input.note,
        source: 'user',
      })
      .select('*, subject:subjects(*)')
      .single()
    if (error) throw error
    return Response.json(data, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId()
    const body = await request.json()
    const completion = completionInput.safeParse(body)
    if (completion.success && Object.keys(body).length === 2) {
      const { data, error } = await createAdminClient()
        .from('tasks')
        .update({ completed: completion.data.completed })
        .eq('id', completion.data.id)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new ApiError('Not found', 404)
      return Response.json({ ok: true })
    }

    const input = updateInput.parse(body)
    await requireOwnedOptionalReference('subjects', input.subjectId, userId)
    const { data, error } = await createAdminClient()
      .from('tasks')
      .update({
        title: input.title,
        subject_id: input.subjectId,
        due_date: input.dueDate,
        priority: input.priority,
        note: input.note,
      })
      .eq('id', input.id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError('Not found', 404)
    return Response.json({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId()
    const { id } = deleteInput.parse(await request.json())
    const { data, error } = await createAdminClient()
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError('Not found', 404)
    return Response.json({ deleted: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
