import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, requireOwnedOptionalReference, requireUserId, toErrorResponse } from '@/lib/api/route'

const classType = z.enum(['theory', 'clinical', 'practical', 'tutorial', 'exam'])
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time')
const classInput = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: time,
  endTime: time.nullable(),
  subjectId: z.string().uuid(),
  classType,
  semesterId: z.string().uuid().nullable().optional(),
})
const updateInput = classInput.omit({ semesterId: true }).extend({ id: z.string().uuid() })
const deleteInput = z.object({ id: z.string().uuid() })

export async function GET(request: Request) {
  try {
    const userId = await requireUserId()
    const semesterId = new URL(request.url).searchParams.get('semesterId')
    const supabase = createAdminClient()
    let query = supabase
      .from('recurring_classes')
      .select('*, subject:subjects(*)')
      .eq('user_id', userId)
    if (semesterId) {
      await requireOwnedOptionalReference('semesters', semesterId, userId)
      query = query.eq('semester_id', semesterId)
    }
    const { data, error } = await query.order('day_of_week').order('start_time')
    if (error) throw error
    return Response.json(data ?? [])
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId()
    const input = classInput.parse(await request.json())
    await requireOwnedOptionalReference('subjects', input.subjectId, userId)
    await requireOwnedOptionalReference('semesters', input.semesterId, userId)
    if (input.endTime && input.endTime <= input.startTime) throw new ApiError('End time must be after start time')
    const { data, error } = await createAdminClient()
      .from('recurring_classes')
      .insert({
        user_id: userId,
        semester_id: input.semesterId ?? null,
        day_of_week: input.dayOfWeek,
        start_time: input.startTime,
        end_time: input.endTime,
        subject_id: input.subjectId,
        class_type: input.classType,
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
    const input = updateInput.parse(await request.json())
    await requireOwnedOptionalReference('subjects', input.subjectId, userId)
    if (input.endTime && input.endTime <= input.startTime) throw new ApiError('End time must be after start time')
    const { data, error } = await createAdminClient()
      .from('recurring_classes')
      .update({
        day_of_week: input.dayOfWeek,
        start_time: input.startTime,
        end_time: input.endTime,
        subject_id: input.subjectId,
        class_type: input.classType,
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
      .from('recurring_classes')
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
