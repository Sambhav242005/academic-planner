import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, requireUserId, toErrorResponse } from '@/lib/api/route'

const date = z.string().date()

export async function GET(request: Request) {
  try {
    const userId = await requireUserId()
    const params = new URL(request.url).searchParams
    const start = date.parse(params.get('start'))
    const end = date.parse(params.get('end'))
    if (end < start) throw new ApiError('Invalid date range.')
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
      .gte('date', start)
      .lte('date', end)
    if (activeSemester) {
      const { data: recurring, error } = await supabase
        .from('recurring_classes')
        .select('id')
        .eq('user_id', userId)
        .eq('semester_id', activeSemester.id)
      if (error) throw error
      const ids = (recurring ?? []).map((entry) => entry.id)
      if (ids.length === 0) {
        const { data: holidays, error: holidaysError } = await supabase
          .from('holidays')
          .select('*')
          .eq('user_id', userId)
          .gte('date', start)
          .lte('date', end)
        if (holidaysError) throw holidaysError
        return Response.json({ activeSemester, instances: [], holidays: holidays ?? [] })
      }
      query = query.in('recurring_class_id', ids)
    }
    const [{ data: instances, error: instancesError }, { data: holidays, error: holidaysError }] = await Promise.all([
      query.order('date').order('start_time'),
      supabase.from('holidays').select('*').eq('user_id', userId).gte('date', start).lte('date', end),
    ])
    if (instancesError) throw instancesError
    if (holidaysError) throw holidaysError
    return Response.json({ activeSemester: activeSemester ?? null, instances: instances ?? [], holidays: holidays ?? [] })
  } catch (error) {
    return toErrorResponse(error)
  }
}
