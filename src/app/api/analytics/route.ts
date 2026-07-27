import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, requireUserId, toErrorResponse } from '@/lib/api/route'

const date = z.string().date()

export async function GET(request: Request) {
  try {
    const userId = await requireUserId()
    const params = new URL(request.url).searchParams
    const startValue = params.get('start')
    const endValue = params.get('end')
    const start = startValue ? date.parse(startValue) : null
    const end = endValue ? date.parse(endValue) : null
    if (start && end && end < start) throw new ApiError('Invalid date range.')
    const supabase = createAdminClient()
    let query = supabase
      .from('class_instances')
      .select('*, subject:subjects(*), attendance:attendance_records(*)')
      .eq('user_id', userId)
    if (start) query = query.gte('date', start)
    if (end) query = query.lte('date', end)
    const { data, error } = await query.order('date', { ascending: false })
    if (error) throw error
    return Response.json(data ?? [])
  } catch (error) {
    return toErrorResponse(error)
  }
}
