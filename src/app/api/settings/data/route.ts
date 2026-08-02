import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, requireUserIdAndDemo, toErrorResponse } from '@/lib/api/route'
import { handleDemoRequest } from '@/lib/demo/intercept'

const uuid = z.string().uuid().optional()
const date = z.string().date()
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const classType = z.enum(['theory', 'clinical', 'practical', 'tutorial', 'exam'])
const attendanceStatus = z.enum(['present', 'absent', 'cancelled', 'holiday'])
const priority = z.enum(['low', 'medium', 'high'])

const importData = z.object({
  subjects: z.array(z.object({ id: uuid, name: z.string().trim().min(1).max(60), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), semester_id: uuid, semesterId: uuid })).max(200),
  semesters: z.array(z.object({ id: uuid, label: z.string().trim().min(1).max(80), is_active: z.boolean().optional(), isActive: z.boolean().optional() })).max(50),
  recurring_classes: z.array(z.object({ id: uuid, semester_id: uuid, semesterId: uuid, subject_id: z.string().uuid(), subjectId: z.string().uuid().optional(), day_of_week: z.number().int().min(0).max(6), dayOfWeek: z.number().int().min(0).max(6).optional(), start_time: time, startTime: time.optional(), end_time: time.nullable().optional(), endTime: time.nullable().optional(), class_type: classType, classType: classType.optional() })).max(1000).default([]),
  class_instances: z.array(z.object({ id: uuid, recurring_class_id: uuid, recurringClassId: uuid, date, start_time: time, startTime: time.optional(), end_time: time.nullable().optional(), endTime: time.nullable().optional(), subject_id: z.string().uuid(), subjectId: z.string().uuid().optional(), class_type: classType, classType: classType.optional() })).max(5000).default([]),
  attendance_records: z.array(z.object({ class_instance_id: z.string().uuid(), classInstanceId: z.string().uuid().optional(), status: attendanceStatus, note: z.string().max(2000).optional() })).max(5000).default([]),
  tasks: z.array(z.object({ title: z.string().trim().min(1).max(200), subject_id: uuid, subjectId: uuid, due_date: date.nullable().optional(), dueDate: date.nullable().optional(), priority: priority.optional(), note: z.string().max(2000).optional(), completed: z.boolean().optional(), source: z.enum(['user', 'ai']).optional() })).max(2000),
  holidays: z.array(z.object({ date })).max(1000),
})

export async function GET() {
  try {
    const { userId, isDemo } = await requireUserIdAndDemo()
    const demo = await handleDemoRequest(userId, 'GET', 'settings/data', undefined, isDemo)
    if (demo) return demo
    const supabase = createAdminClient()
    const tables = ['subjects', 'recurring_classes', 'class_instances', 'attendance_records', 'tasks', 'holidays', 'semesters'] as const
    const entries = await Promise.all(tables.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*').eq('user_id', userId)
      if (error) throw error
      return [table, data ?? []] as const
    }))
    return Response.json(Object.fromEntries(entries))
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > 2_000_000) throw new ApiError('Import file is too large.', 413)
    const { userId, isDemo } = await requireUserIdAndDemo()
    const demo = await handleDemoRequest(userId, 'POST', 'settings/data', request, isDemo)
    if (demo) return demo
    const input = importData.parse(await request.json())
    const supabase = createAdminClient()
    const subjectIds = new Map<string, string>()
    const semesterIds = new Map<string, string>()
    const recurringIds = new Map<string, string>()
    const instanceIds = new Map<string, string>()

    for (const semester of input.semesters) {
      const active = semester.is_active ?? semester.isActive ?? false
      const { data, error } = await supabase.from('semesters').insert({ user_id: userId, label: semester.label, is_active: false }).select('id').single()
      if (error) throw error
      if (semester.id) semesterIds.set(semester.id, data.id)
      if (active) semesterIds.set(`active:${data.id}`, data.id)
    }
    const activeSemester = Array.from(semesterIds.entries()).find(([key]) => key.startsWith('active:'))?.[1]
    if (activeSemester) {
      const { error } = await supabase.from('semesters').update({ is_active: false }).eq('user_id', userId)
      if (error) throw error
      const { error: activateError } = await supabase.from('semesters').update({ is_active: true }).eq('id', activeSemester).eq('user_id', userId)
      if (activateError) throw activateError
    }
    for (const subject of input.subjects) {
      const { data, error } = await supabase.from('subjects').insert({
        user_id: userId,
        name: subject.name,
        color: subject.color.toLowerCase(),
        semester_id: semesterIds.get(subject.semester_id ?? subject.semesterId ?? '') ?? null,
      }).select('id').single()
      if (error) throw error
      if (subject.id) subjectIds.set(subject.id, data.id)
    }
    for (const recurring of input.recurring_classes) {
      const subjectId = subjectIds.get(recurring.subject_id ?? recurring.subjectId ?? '')
      if (!subjectId) continue
      const { data, error } = await supabase.from('recurring_classes').insert({
        user_id: userId,
        subject_id: subjectId,
        semester_id: semesterIds.get(recurring.semester_id ?? recurring.semesterId ?? '') ?? null,
        day_of_week: recurring.day_of_week ?? recurring.dayOfWeek,
        start_time: recurring.start_time ?? recurring.startTime,
        end_time: recurring.end_time ?? recurring.endTime ?? null,
        class_type: recurring.class_type ?? recurring.classType,
      }).select('id').single()
      if (error) throw error
      if (recurring.id) recurringIds.set(recurring.id, data.id)
    }
    for (const instance of input.class_instances) {
      const subjectId = subjectIds.get(instance.subject_id ?? instance.subjectId ?? '')
      if (!subjectId) continue
      const { data, error } = await supabase.from('class_instances').insert({
        user_id: userId,
        recurring_class_id: recurringIds.get(instance.recurring_class_id ?? instance.recurringClassId ?? '') ?? null,
        date: instance.date,
        start_time: instance.start_time ?? instance.startTime,
        end_time: instance.end_time ?? instance.endTime ?? null,
        subject_id: subjectId,
        class_type: instance.class_type ?? instance.classType,
      }).select('id').single()
      if (error) throw error
      if (instance.id) instanceIds.set(instance.id, data.id)
    }
    for (const attendance of input.attendance_records) {
      const instanceId = instanceIds.get(attendance.class_instance_id ?? attendance.classInstanceId ?? '')
      if (!instanceId) continue
      const { error } = await supabase.from('attendance_records').insert({ user_id: userId, class_instance_id: instanceId, status: attendance.status, note: attendance.note ?? '' })
      if (error) throw error
    }
    for (const task of input.tasks) {
      const { error } = await supabase.from('tasks').insert({
        user_id: userId,
        title: task.title,
        subject_id: subjectIds.get(task.subject_id ?? task.subjectId ?? '') ?? null,
        due_date: task.due_date ?? task.dueDate ?? null,
        priority: task.priority ?? 'medium',
        note: task.note ?? '',
        completed: task.completed ?? false,
        source: task.source ?? 'user',
      })
      if (error) throw error
    }
    for (const holiday of input.holidays) {
      const { error } = await supabase.from('holidays').upsert({ user_id: userId, date: holiday.date }, { onConflict: 'user_id,date', ignoreDuplicates: true })
      if (error) throw error
    }
    return Response.json({ imported: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
