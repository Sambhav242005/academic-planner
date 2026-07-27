import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, requireOwnedRow, requireUserId, toErrorResponse } from '@/lib/api/route'

const date = z.string().date()
const statusInput = z.object({
  classInstanceId: z.string().uuid(),
  status: z.enum(['present', 'absent', 'cancelled', 'holiday']),
})

export async function GET(request: Request) {
  try {
    const userId = await requireUserId()
    const selectedDate = date.parse(new URL(request.url).searchParams.get('date'))
    const supabase = createAdminClient()
    const { data: activeSemester, error: semesterError } = await supabase
      .from('semesters')
      .select('id, label')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    if (semesterError) throw semesterError

    let query = supabase
      .from('class_instances')
      .select('*, subject:subjects(*), attendance:attendance_records(*)')
      .eq('user_id', userId)
      .eq('date', selectedDate)
    if (activeSemester) {
      const { data: recurring, error } = await supabase
        .from('recurring_classes')
        .select('id')
        .eq('user_id', userId)
        .eq('semester_id', activeSemester.id)
      if (error) throw error
      const ids = (recurring ?? []).map((entry) => entry.id)
      if (ids.length === 0) return Response.json({ activeSemester, instances: [] })
      query = query.in('recurring_class_id', ids)
    }
    const { data, error } = await query.order('start_time')
    if (error) throw error
    return Response.json({ activeSemester: activeSemester ?? null, instances: data ?? [] })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId()
    const input = statusInput.parse(await request.json())
    await requireOwnedRow('class_instances', input.classInstanceId, userId)
    const { error } = await createAdminClient()
      .from('attendance_records')
      .upsert({ user_id: userId, class_instance_id: input.classInstanceId, status: input.status }, { onConflict: 'user_id,class_instance_id' })
    if (error) throw error
    return Response.json({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
