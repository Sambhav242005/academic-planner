import { createAdminClient } from '@/lib/supabase/admin'
import { isDemoUser } from '@/lib/demo/seed'
import * as demoStore from '@/lib/demo/store'
import { ensureDemoInit } from '@/lib/demo/intercept'

export interface McpContext {
  userId: string
}

export async function listSubjects(ctx: McpContext) {
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    return { subjects: demoStore.getSubjects() }
  }
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', ctx.userId)
  return { subjects: data ?? [] }
}

export async function createSubject(
  ctx: McpContext,
  params: { name: string; color: string; semester_id: string }
) {
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    const subject = demoStore.createSubject({ name: params.name, color: params.color, semesterId: params.semester_id })
    return { subject }
  }
  const name = params.name.trim()
  if (!name) throw new Error('Subject name is required')
  const color = params.color.trim()
  if (!color) throw new Error('Color is required')
  if (!/^#[0-9a-fA-F]{3,8}$/.test(color)) throw new Error('Color must be a valid hex code like "#3b82f6"')
  if (!params.semester_id) throw new Error('semester_id is required')

  const supabase = createAdminClient()

  // Validate semester exists and belongs to user
  const { data: semester, error: semError } = await supabase
    .from('semesters')
    .select('id, label')
    .eq('id', params.semester_id)
    .eq('user_id', ctx.userId)
    .maybeSingle()
  if (semError || !semester) {
    const { data: available } = await supabase
      .from('semesters')
      .select('id, label, is_active')
      .eq('user_id', ctx.userId)
    const list = (available ?? []).map(s => `${s.label} (${s.id})${s.is_active ? ' [active]' : ''}`).join(', ')
    throw new Error(
      `Semester not found with id "${params.semester_id}". ` +
      `Available semesters: ${list || '(none - create a semester first)'}`
    )
  }

  // Check for duplicate name within same semester
  const { data: existing } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('user_id', ctx.userId)
    .eq('semester_id', params.semester_id)
    .ilike('name', name)
    .maybeSingle()
  if (existing) throw new Error(`Subject "${existing.name}" already exists in semester "${semester.label}" (id: ${existing.id}). Use update instead.`)

  const { data, error } = await supabase
    .from('subjects')
    .insert({
      user_id: ctx.userId,
      name,
      color,
      semester_id: params.semester_id,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return { subject: data }
}

export async function listSemesters(ctx: McpContext) {
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    return { semesters: demoStore.getSemesters() }
  }
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('semesters')
    .select('*')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
  return { semesters: data ?? [] }
}

export async function createSemester(
  ctx: McpContext,
  params: { label: string; is_active?: boolean }
) {
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    const semester = demoStore.createSemester({ label: params.label, isActive: params.is_active })
    return { semester }
  }
  const label = params.label.trim()
  if (!label) throw new Error('Semester label is required')

  const supabase = createAdminClient()

  // Check for duplicate label
  const { data: existing } = await supabase
    .from('semesters')
    .select('id, label')
    .eq('user_id', ctx.userId)
    .ilike('label', label)
    .maybeSingle()
  if (existing) throw new Error(`Semester "${existing.label}" already exists (id: ${existing.id})`)

  // If marking as active, deactivate all others first
  if (params.is_active) {
    await supabase
      .from('semesters')
      .update({ is_active: false })
      .eq('user_id', ctx.userId)
      .eq('is_active', true)
  }

  const { data, error } = await supabase
    .from('semesters')
    .insert({
      user_id: ctx.userId,
      label,
      is_active: params.is_active ?? false,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return { semester: data }
}

export async function listRecurringClasses(ctx: McpContext) {
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    return { recurring_classes: demoStore.getRecurringClasses() }
  }
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('recurring_classes')
    .select('*, subject:subjects(*)')
    .eq('user_id', ctx.userId)
    .order('day_of_week')
    .order('start_time')
  return { recurring_classes: data ?? [] }
}

function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export async function createRecurringClass(
  ctx: McpContext,
  params: { subject_id: string; day_of_week: number; start_time: string; end_time?: string; class_type?: string; semester_id?: string }
) {
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    const rc = demoStore.createRecurringClass({
      subjectId: params.subject_id,
      dayOfWeek: params.day_of_week,
      startTime: params.start_time,
      endTime: params.end_time ?? null,
      classType: params.class_type ?? 'theory',
      semesterId: params.semester_id ?? null,
    })
    return { recurring_class: rc }
  }
  const validClassTypes = ['theory', 'clinical', 'practical', 'tutorial', 'exam']
  const classType = validClassTypes.includes(params.class_type ?? '') ? params.class_type! : 'theory'
  if (params.day_of_week < 0 || params.day_of_week > 6) throw new Error('day_of_week must be 0 (Mon) to 6 (Sun)')
  if (!isValidTime(params.start_time)) throw new Error('start_time must be HH:MM in 24h format (e.g. "08:15")')
  if (params.end_time && !isValidTime(params.end_time)) throw new Error('end_time must be HH:MM in 24h format (e.g. "09:15")')
  if (params.end_time && timeToMinutes(params.end_time) <= timeToMinutes(params.start_time)) {
    throw new Error('end_time must be after start_time')
  }

  const supabase = createAdminClient()

  // Validate semester_id belongs to user if provided
  if (params.semester_id) {
    const { data: semester, error: semError } = await supabase
      .from('semesters')
      .select('id')
      .eq('id', params.semester_id)
      .eq('user_id', ctx.userId)
      .maybeSingle()
    if (semError || !semester) {
      throw new Error(`Semester not found with id "${params.semester_id}" or does not belong to you.`)
    }
  }

  // Verify subject belongs to user
  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('id', params.subject_id)
    .eq('user_id', ctx.userId)
    .maybeSingle()
  if (subjectError || !subject) {
    // List available subjects so the model knows what's valid
    const { data: available } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('user_id', ctx.userId)
    const list = (available ?? []).map(s => `${s.name} (${s.id})`).join(', ')
    throw new Error(
      `Subject not found with id "${params.subject_id}". ` +
      `Available subjects: ${list || '(none)'}`
    )
  }

  // Check for scheduling conflict (same day, overlapping time)
  const { data: existing } = await supabase
    .from('recurring_classes')
    .select('id, subject_id, start_time, end_time, subject:subjects(name)')
    .eq('user_id', ctx.userId)
    .eq('day_of_week', params.day_of_week)

  const newStart = timeToMinutes(params.start_time)
  const newEnd = params.end_time ? timeToMinutes(params.end_time) : newStart + 60

  for (const cls of existing ?? []) {
    const existStart = timeToMinutes(cls.start_time)
    const existEnd = cls.end_time ? timeToMinutes(cls.end_time) : existStart + 60
    // Overlap if new starts before existing ends AND new ends after existing starts
    if (newStart < existEnd && newEnd > existStart) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clsName = (cls.subject as any)?.name ?? 'Unknown'
      throw new Error(
        `Scheduling conflict: ${clsName} is already at ${cls.start_time}-${cls.end_time ?? '?'} on day ${params.day_of_week}. ` +
        `Cannot add ${subject.name} at ${params.start_time}-${params.end_time ?? '?'}.`
      )
    }
  }

  const { data, error } = await supabase
    .from('recurring_classes')
    .insert({
      user_id: ctx.userId,
      subject_id: params.subject_id,
      day_of_week: params.day_of_week,
      start_time: params.start_time,
      end_time: params.end_time ?? null,
      class_type: classType,
      semester_id: params.semester_id ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return { recurring_class: data }
}

const MAX_TITLE = 200
const MAX_NOTE = 2000

export async function createTask(
  ctx: McpContext,
  params: { title: string; subject_id?: string; due_date?: string; priority?: string; note?: string }
) {
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    const task = demoStore.createTask({
      title: params.title,
      subjectId: params.subject_id ?? null,
      dueDate: params.due_date ?? null,
      priority: params.priority ?? 'medium',
      note: params.note ?? '',
      source: 'ai',
    })
    return { task }
  }
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
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    return { tasks: demoStore.getTasks(params) }
  }
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
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    const changes: Record<string, unknown> = {}
    if (params.title !== undefined) changes.title = params.title.trim().slice(0, MAX_TITLE)
    if (params.completed !== undefined) changes.completed = params.completed
    if (params.priority !== undefined) changes.priority = params.priority
    if (params.due_date !== undefined) changes.due_date = params.due_date
    if (params.note !== undefined) changes.note = params.note.trim().slice(0, MAX_NOTE)
    const task = demoStore.updateTask(params.task_id, changes)
    if (!task) throw new Error('Task not found')
    return { task }
  }
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
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    demoStore.deleteTask(params.task_id)
    return { deleted: true }
  }
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
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    const today = new Date().toISOString().split('T')[0]
    const dayOfWeek = new Date().getDay()
    const isoDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const activeSemester = demoStore.getActiveSemester()
    const recurring = demoStore.getRecurringClasses(activeSemester?.id).filter(rc => rc.dayOfWeek === isoDay)
    const instances = demoStore.getClassInstances({ date: today })
    const allRecords = demoStore.getAttendanceRecords()
    const enriched = instances.map(inst => ({
      ...inst,
      subject: demoStore.getSubject(inst.subjectId),
      attendance: allRecords.find(r => r.classInstanceId === inst.id) ?? null,
    }))
    return { classes: [...recurring.map(rc => ({ ...rc, subject: demoStore.getSubject(rc.subjectId) })), ...enriched] }
  }
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
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    let classIds: string[] | undefined
    if (params?.subject_id) {
      const instances = demoStore.getClassInstances({}).filter(i => i.subjectId === params.subject_id)
      classIds = instances.map(i => i.id)
    }
    const records = demoStore.getAttendanceRecords(classIds)
    const total = records.length
    const present = records.filter(r => r.status === 'present').length
    const absent = records.filter(r => r.status === 'absent').length
    const cancelled = records.filter(r => r.status === 'cancelled').length
    const holiday = records.filter(r => r.status === 'holiday').length
    const effectiveTotal = present + absent
    const percentage = effectiveTotal > 0 ? Math.round((present / effectiveTotal) * 100) : 0
    return { total, present, absent, cancelled, holiday, percentage }
  }
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
  if (isDemoUser(ctx.userId)) {
    ensureDemoInit()
    const subjects = demoStore.getSubjects()
    const allInstances = demoStore.getClassInstances({})
    const allRecords = demoStore.getAttendanceRecords()
    const result = subjects.map(subject => {
      const subjectInstances = allInstances.filter(i => i.subjectId === subject.id)
      const classIds = subjectInstances.map(i => i.id)
      const records = allRecords.filter(r => classIds.includes(r.classInstanceId))
      const present = records.filter(x => x.status === 'present').length
      const absent = records.filter(x => x.status === 'absent').length
      const effectiveTotal = present + absent
      return {
        id: subject.id,
        name: subject.name,
        color: subject.color,
        total: records.length,
        present,
        percentage: effectiveTotal > 0 ? Math.round((present / effectiveTotal) * 100) : 0,
      }
    })
    return { subjects: result }
  }
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
