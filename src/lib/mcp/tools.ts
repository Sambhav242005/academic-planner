import { createAdminClient } from '@/lib/supabase/admin'

export interface McpContext {
  userId: string
}

export async function listSubjects(ctx: McpContext) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', ctx.userId)
  return { subjects: data ?? [] }
}

const MAX_TITLE = 200
const MAX_NOTE = 2000

export async function createTask(
  ctx: McpContext,
  params: { title: string; subject_id?: string; due_date?: string; priority?: string; note?: string }
) {
  const title = params.title.trim().slice(0, MAX_TITLE)
  if (!title) throw new Error('Title is required')
  const note = (params.note ?? '').trim().slice(0, MAX_NOTE)
  const validPriorities = ['low', 'medium', 'high']
  const priority = validPriorities.includes(params.priority ?? '') ? params.priority! : 'medium'

  const supabase = createAdminClient()
  if (params.subject_id) {
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', params.subject_id)
      .eq('user_id', ctx.userId)
      .maybeSingle()
    if (subjectError || !subject) throw new Error('Subject not found')
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: ctx.userId,
      title,
      subject_id: params.subject_id ?? null,
      due_date: params.due_date ?? null,
      priority,
      note,
      source: 'ai',
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return { task: data }
}

export async function listTasks(ctx: McpContext, params?: { completed?: boolean; priority?: string }) {
  const supabase = createAdminClient()
  let query = supabase
    .from('tasks')
    .select('*, subject:subjects(*)')
    .eq('user_id', ctx.userId)

  if (params?.completed !== undefined) {
    query = query.eq('completed', params.completed)
  }
  if (params?.priority) {
    query = query.eq('priority', params.priority)
  }

  const { data } = await query.order('created_at', { ascending: false })
  return { tasks: data ?? [] }
}

export async function updateTask(
  ctx: McpContext,
  params: { task_id: string; title?: string; completed?: boolean; priority?: string; due_date?: string | null; note?: string }
) {
  const supabase = createAdminClient()
  const updates: Record<string, unknown> = {}
  if (params.title !== undefined) {
    const title = params.title.trim().slice(0, MAX_TITLE)
    if (!title) throw new Error('Title is required')
    updates.title = title
  }
  if (params.completed !== undefined) updates.completed = params.completed
  if (params.priority !== undefined) {
    const validPriorities = ['low', 'medium', 'high']
    updates.priority = validPriorities.includes(params.priority) ? params.priority : 'medium'
  }
  if (params.due_date !== undefined) updates.due_date = params.due_date
  if (params.note !== undefined) updates.note = params.note.trim().slice(0, MAX_NOTE)

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', params.task_id)
    .eq('user_id', ctx.userId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return { task: data }
}

export async function deleteTask(ctx: McpContext, params: { task_id: string }) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', params.task_id)
    .eq('user_id', ctx.userId)
  if (error) throw new Error(error.message)
  return { deleted: true }
}

export async function getTodayClasses(ctx: McpContext) {
  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const dayOfWeek = new Date().getDay()
  const isoDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const { data: recurring } = await supabase
    .from('recurring_classes')
    .select('*, subject:subjects(*)')
    .eq('user_id', ctx.userId)
    .eq('day_of_week', isoDay)

  const { data: instances } = await supabase
    .from('class_instances')
    .select('*, subject:subjects(*), attendance:attendance_records(*)')
    .eq('user_id', ctx.userId)
    .eq('date', today)

  return { classes: [...(recurring ?? []), ...(instances ?? [])] }
}

export async function getAttendanceStats(ctx: McpContext, params?: { subject_id?: string }) {
  const supabase = createAdminClient()
  let classIds: string[] | undefined

  if (params?.subject_id) {
    const { data: ids } = await supabase
      .from('class_instances')
      .select('id')
      .eq('user_id', ctx.userId)
      .eq('subject_id', params.subject_id)
    classIds = (ids ?? []).map(i => i.id)
  }

  let query = supabase
    .from('attendance_records')
    .select('status')
    .eq('user_id', ctx.userId)

  if (classIds) {
    query = query.in('class_instance_id', classIds)
  }

  const { data } = await query
  const records = data ?? []
  const total = records.length
  const present = records.filter(r => r.status === 'present').length
  const absent = records.filter(r => r.status === 'absent').length
  const cancelled = records.filter(r => r.status === 'cancelled').length
  const holiday = records.filter(r => r.status === 'holiday').length
  const effectiveTotal = present + absent
  const percentage = effectiveTotal > 0 ? Math.round((present / effectiveTotal) * 100) : 0

  return {
    total,
    present,
    absent,
    cancelled,
    holiday,
    percentage,
  }
}

export async function listSubjectsWithAttendance(ctx: McpContext) {
  const supabase = createAdminClient()
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', ctx.userId)

  if (!subjects) return { subjects: [] }

  const result = []
  for (const subject of subjects) {
    const { data: ids } = await supabase
      .from('class_instances')
      .select('id')
      .eq('user_id', ctx.userId)
      .eq('subject_id', subject.id)
    const classIds = (ids ?? []).map(i => i.id)

    let records: { status: string }[] = []
    if (classIds.length > 0) {
      const { data } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('user_id', ctx.userId)
        .in('class_instance_id', classIds)
      records = data ?? []
    }

    const present = records.filter(x => x.status === 'present').length
    const absent = records.filter(x => x.status === 'absent').length
    const effectiveTotal = present + absent
    result.push({
      id: subject.id,
      name: subject.name,
      color: subject.color,
      total: records.length,
      present,
      percentage: effectiveTotal > 0 ? Math.round((present / effectiveTotal) * 100) : 0,
    })
  }

  return { subjects: result }
}
