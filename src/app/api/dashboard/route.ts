import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, requireOwnedRow, requireUserIdAndDemo, toErrorResponse } from '@/lib/api/route'
import { handleDemoRequest } from '@/lib/demo/intercept'

const date = z.string().date()
const status = z.enum(['present', 'absent', 'cancelled', 'holiday']).nullable()
const updateAttendance = z.object({
  date,
  status,
  classInstanceId: z.string().uuid().optional(),
  recurringClassId: z.string().uuid().optional(),
}).refine((input) => Boolean(input.classInstanceId) !== Boolean(input.recurringClassId), {
  message: 'Provide exactly one class identifier.',
})

export async function GET(request: Request) {
  try {
    const { userId, isDemo } = await requireUserIdAndDemo()
    const demo = await handleDemoRequest(userId, 'GET', 'dashboard', request, isDemo)
    if (demo) return demo
    const today = date.parse(new URL(request.url).searchParams.get('date'))
    const dateObject = new Date(`${today}T12:00:00`)
    const dayOfWeek = (dateObject.getDay() + 6) % 7
    const supabase = createAdminClient()
    const { data: activeSemester, error: semesterError } = await supabase
      .from('semesters')
      .select('id, label')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    if (semesterError) throw semesterError

    let recurringQuery = supabase
      .from('recurring_classes')
      .select('*, subject:subjects(*)')
      .eq('user_id', userId)
      .eq('day_of_week', dayOfWeek)
    if (activeSemester) recurringQuery = recurringQuery.eq('semester_id', activeSemester.id)
    const { data: recurring, error: recurringError } = await recurringQuery.order('start_time')
    if (recurringError) throw recurringError

    let instancesQuery = supabase
      .from('class_instances')
      .select('*, subject:subjects(*), attendance:attendance_records(*)')
      .eq('user_id', userId)
      .eq('date', today)
    const recurringIds = (recurring ?? []).map((entry) => entry.id)
    if (activeSemester) {
      if (recurringIds.length > 0) {
        instancesQuery = instancesQuery.in('recurring_class_id', recurringIds)
      } else {
        // Active semester has no recurring classes — only show manually-created instances
        // (those with null recurring_class_id) to avoid stale data from other semesters
        instancesQuery = instancesQuery.is('recurring_class_id', null)
      }
    }
    let subjectsQuery = supabase
      .from('subjects')
      .select('id, name, color')
      .eq('user_id', userId)
    if (activeSemester) {
      subjectsQuery = subjectsQuery.eq('semester_id', activeSemester.id)
    }
    let subjectCountQuery = supabase
      .from('subjects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (activeSemester) {
      subjectCountQuery = subjectCountQuery.eq('semester_id', activeSemester.id)
    }
    const [{ data: instances, error: instancesError }, { data: subjects, error: subjectsError }, { count: subjectCount, error: subjectCountError }, { count: taskCount, error: taskCountError }, { count: presentCount, error: presentError }, { count: totalCount, error: totalError }] = await Promise.all([
      instancesQuery.order('start_time'),
      subjectsQuery.order('name'),
      subjectCountQuery,
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', false),
      supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'present'),
      supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['present', 'absent']),
    ])
    if (instancesError) throw instancesError
    if (subjectsError) throw subjectsError
    if (subjectCountError) throw subjectCountError
    if (taskCountError) throw taskCountError
    if (presentError) throw presentError
    if (totalError) throw totalError
    const present = presentCount ?? 0
    const total = totalCount ?? 0
    return Response.json({
      activeSemester: activeSemester ?? null,
      recurring: recurring ?? [],
      instances: (instances ?? []).map((instance) => ({
        ...instance,
        attendance: Array.isArray(instance.attendance) ? instance.attendance[0] ?? null : instance.attendance ?? null,
      })),
      subjects: subjects ?? [],
      stats: {
        subjects: subjectCount ?? 0,
        tasks: taskCount ?? 0,
        attendance: { total, present, percentage: total > 0 ? Math.round((present / total) * 100) : null },
      },
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const { userId, isDemo } = await requireUserIdAndDemo()
    const demo = await handleDemoRequest(userId, 'POST', 'dashboard', request, isDemo)
    if (demo) return demo
    const input = updateAttendance.parse(await request.json())
    const supabase = createAdminClient()
    let classInstanceId = input.classInstanceId
    if (input.recurringClassId) {
      const { data: recurring, error } = await supabase
        .from('recurring_classes')
        .select('id, subject_id, start_time, end_time, class_type')
        .eq('id', input.recurringClassId)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      if (!recurring) throw new ApiError('Not found', 404)
      const { data: instance, error: instanceError } = await supabase
        .from('class_instances')
        .upsert({
          user_id: userId,
          recurring_class_id: recurring.id,
          date: input.date,
          start_time: recurring.start_time,
          end_time: recurring.end_time,
          subject_id: recurring.subject_id,
          class_type: recurring.class_type,
        }, { onConflict: 'user_id,date,start_time,subject_id' })
        .select('id')
        .single()
      if (instanceError) throw instanceError
      classInstanceId = instance.id
    }
    if (!classInstanceId) throw new ApiError('Class instance is required.')
    await requireOwnedRow('class_instances', classInstanceId, userId)
    if (input.status === null) {
      const { error } = await supabase.from('attendance_records').delete().eq('user_id', userId).eq('class_instance_id', classInstanceId)
      if (error) throw error
    } else {
      const { error } = await supabase.from('attendance_records').upsert({ user_id: userId, class_instance_id: classInstanceId, status: input.status }, { onConflict: 'user_id,class_instance_id' })
      if (error) throw error
    }
    return Response.json({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
