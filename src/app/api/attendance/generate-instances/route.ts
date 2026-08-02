import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUserIdAndDemo, toErrorResponse } from '@/lib/api/route'
import { handleDemoRequest } from '@/lib/demo/intercept'

const inputSchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
})

export async function POST(request: Request) {
  try {
    const { userId, isDemo } = await requireUserIdAndDemo()
    const demo = await handleDemoRequest(userId, 'POST', 'attendance/generate-instances', request, isDemo)
    if (demo) return demo
    const body = await request.json()
    const { startDate: rawStart, endDate: rawEnd } = inputSchema.parse(body)
    const supabase = createAdminClient()

    const { data: activeSemester, error: semesterError } = await supabase
      .from('semesters')
      .select('id, start_date, end_date')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    if (semesterError) throw semesterError
    if (!activeSemester) {
      return Response.json({ error: 'No active semester' }, { status: 400 })
    }

    const today = new Date().toISOString().slice(0, 10)
    const semesterStart = activeSemester.start_date ?? rawStart
    const semesterEnd = activeSemester.end_date ?? rawEnd ?? today
    if (!semesterStart) {
      return Response.json({ error: 'Semester start date is required. Set it in Settings or provide startDate.' }, { status: 400 })
    }

    const startDate = new Date(semesterStart + 'T12:00:00')
    const endDate = new Date(Math.min(new Date(semesterEnd + 'T12:00:00').getTime(), new Date(today + 'T12:00:00').getTime()))

    const { data: recurringClasses, error: recurringError } = await supabase
      .from('recurring_classes')
      .select('id, subject_id, day_of_week, start_time, end_time, class_type')
      .eq('user_id', userId)
      .eq('semester_id', activeSemester.id)
    if (recurringError) throw recurringError
    if (!recurringClasses || recurringClasses.length === 0) {
      return Response.json({ instancesGenerated: 0, absentDefaulted: 0 })
    }

    const instancesToInsert: Array<{
      user_id: string
      recurring_class_id: string
      date: string
      start_time: string
      end_time: string | null
      subject_id: string
      class_type: string
    }> = []

    const current = new Date(startDate)
    while (current <= endDate) {
      const dayOfWeek = (current.getDay() + 6) % 7
      const dateStr = current.toISOString().slice(0, 10)

      for (const rc of recurringClasses) {
        if (rc.day_of_week === dayOfWeek) {
          instancesToInsert.push({
            user_id: userId,
            recurring_class_id: rc.id,
            date: dateStr,
            start_time: rc.start_time,
            end_time: rc.end_time,
            subject_id: rc.subject_id,
            class_type: rc.class_type,
          })
        }
      }
      current.setDate(current.getDate() + 1)
    }

    if (instancesToInsert.length === 0) {
      return Response.json({ instancesGenerated: 0, absentDefaulted: 0 })
    }

    const { error: insertError } = await supabase
      .from('class_instances')
      .upsert(instancesToInsert, { onConflict: 'user_id,date,start_time,subject_id', ignoreDuplicates: true })
    if (insertError) throw insertError

    const { data: createdInstances, error: fetchError } = await supabase
      .from('class_instances')
      .select('id')
      .eq('user_id', userId)
      .in('recurring_class_id', recurringClasses.map((rc) => rc.id))
      .gte('date', semesterStart)
      .lte('date', today)
    if (fetchError) throw fetchError

    const instanceIds = (createdInstances ?? []).map((i) => i.id)

    const { data: existingRecords } = await supabase
      .from('attendance_records')
      .select('class_instance_id')
      .eq('user_id', userId)
      .in('class_instance_id', instanceIds)

    const existingSet = new Set((existingRecords ?? []).map((r) => r.class_instance_id))
    const instancesWithoutAttendance = instanceIds.filter((id) => !existingSet.has(id))

    if (instancesWithoutAttendance.length > 0) {
      const recordsToInsert = instancesWithoutAttendance.map((id) => ({
        user_id: userId,
        class_instance_id: id,
        status: 'absent' as const,
      }))
      const { error: recordError } = await supabase
        .from('attendance_records')
        .upsert(recordsToInsert, { onConflict: 'user_id,class_instance_id', ignoreDuplicates: true })
      if (recordError) throw recordError
    }

    return Response.json({
      instancesGenerated: instancesToInsert.length,
      absentDefaulted: instancesWithoutAttendance.length,
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
