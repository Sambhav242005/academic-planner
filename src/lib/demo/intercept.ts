import { DEMO_USER_ID } from './seed'
import * as store from './store'

export function isDemoUser(userId: string): boolean {
  return userId === DEMO_USER_ID
}

export function ensureDemoInit(): void {
  if (!store.isInitialized()) {
    store.initDemoInstances()
  }
}

// Convert camelCase store objects to snake_case (matching Supabase column names)
function snk(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) { out[k] = v; continue }
    if (k === 'userId') out['user_id'] = v
    else if (k === 'semesterId') out['semester_id'] = v
    else if (k === 'subjectId') out['subject_id'] = v
    else if (k === 'dayOfWeek') out['day_of_week'] = v
    else if (k === 'startTime') out['start_time'] = v
    else if (k === 'endTime') out['end_time'] = v
    else if (k === 'classType') out['class_type'] = v
    else if (k === 'classInstanceId') out['class_instance_id'] = v
    else if (k === 'markedAt') out['marked_at'] = v
    else if (k === 'dueDate') out['due_date'] = v
    else if (k === 'createdAt') out['created_at'] = v
    else if (k === 'updatedAt') out['updated_at'] = v
    else if (k === 'isActive') out['is_active'] = v
    else if (k === 'startDate') out['start_date'] = v
    else if (k === 'endDate') out['end_date'] = v
    else if (k === 'displayName') out['display_name'] = v
    else if (k === 'defaultTarget') out['default_target'] = v
    else if (k === 'lastUsedAt') out['last_used_at'] = v
    else if (k === 'keyPrefix') out['key_prefix'] = v
    else if (k === 'keyHash') out['key_hash'] = v
    else if (k === 'recurringClassId') out['recurring_class_id'] = v
    else if (k === 'subject' && typeof v === 'object' && v !== null) out['subject'] = snk(v as Record<string, unknown>)
    else if (k === 'attendance' && typeof v === 'object' && v !== null) out['attendance'] = snk(v as Record<string, unknown>)
    else out[k] = v
  }
  return out
}

function snkArr(arr: Record<string, unknown>[]): Record<string, unknown>[] {
  return arr.map(snk)
}

export async function handleDemoRequest(
  userId: string,
  method: string,
  endpoint: string,
  request?: Request,
  isDemo?: boolean,
): Promise<Response | null> {
  if (!isDemo) return null
  ensureDemoInit()

  switch (endpoint) {
    case 'profile':
      return handleProfile(method, request)
    case 'subjects':
      return handleSubjects(method, request)
    case 'semesters':
      return handleSemesters(method, request)
    case 'timetable':
      return handleTimetable(method, request)
    case 'tasks':
      return handleTasks(method, request)
    case 'attendance':
      return handleAttendance(method, request)
    case 'attendance/generate-instances':
      return handleGenerateInstances()
    case 'dashboard':
      return handleDashboard(method, request)
    case 'analytics':
      return handleAnalytics(request)
    case 'calendar':
      return handleCalendar(request)
    case 'settings/data':
      return handleSettingsData(method, request)
    case 'settings/mcp-key':
      return handleMcpKey(method)
    default:
      return null
  }
}

async function handleProfile(method: string, request?: Request): Promise<Response> {
  if (method === 'GET') {
    // Profile returns camelCase (matching Supabase route mapping)
    const profile = store.getProfile()
    return Response.json(profile)
  }
  if (method === 'PUT' && request) {
    const body = await request.json()
    store.updateProfile({
      displayName: body.displayName?.trim().slice(0, 50) || null,
      college: body.college?.trim().slice(0, 100) || null,
      semester: body.semester ?? null,
      defaultTarget: body.defaultTarget != null
        ? Math.min(100, Math.max(0, body.defaultTarget))
        : undefined,
    })
    return Response.json({ ok: true })
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}

async function handleSubjects(method: string, request?: Request): Promise<Response> {
  switch (method) {
    case 'GET': {
      const url = request ? new URL(request.url) : null
      const semesterId = url?.searchParams.get('semesterId')
      return Response.json(snkArr(store.getSubjects(semesterId) as unknown as Record<string, unknown>[]))
    }
    case 'POST': {
      const body = await request!.json()
      const subject = store.createSubject({
        name: body.name,
        color: body.color?.toLowerCase() ?? '#6b7280',
        semesterId: body.semester_id ?? body.semesterId ?? null,
      })
      return Response.json(snk(subject as unknown as Record<string, unknown>), { status: 201 })
    }
    case 'PATCH': {
      const body = await request!.json()
      const { id, ...changes } = body
      if (changes.color) changes.color = changes.color.toLowerCase()
      const updated = store.updateSubject(id, changes)
      if (!updated) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json(snk(updated as unknown as Record<string, unknown>))
    }
    case 'DELETE': {
      const body = await request!.json()
      const deleted = store.deleteSubject(body.id)
      if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json({ deleted: true })
    }
    default:
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

async function handleSemesters(method: string, request?: Request): Promise<Response> {
  switch (method) {
    case 'GET': {
      const url = request ? new URL(request.url) : null
      const activeOnly = url?.searchParams.get('active') === 'true'
      if (activeOnly) {
        const s = store.getActiveSemester()
        return Response.json(s ? snk(s as unknown as Record<string, unknown>) : null)
      }
      return Response.json(snkArr(store.getSemesters() as unknown as Record<string, unknown>[]))
    }
    case 'POST': {
      const body = await request!.json()
      if (!body.label?.trim()) {
        return Response.json({ error: 'Label is required' }, { status: 400 })
      }
      const semester = store.createSemester({
        label: body.label.trim(),
        startDate: body.start_date ?? body.startDate ?? null,
        endDate: body.end_date ?? body.endDate ?? null,
        isActive: body.is_active ?? body.isActive ?? false,
      })
      return Response.json(snk(semester as unknown as Record<string, unknown>), { status: 201 })
    }
    case 'PATCH': {
      const body = await request!.json()
      const { id, is_active, label, start_date, end_date, isActive, startDate, endDate } = body
      if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
      const updated = store.updateSemester(id, {
        ...(isActive !== undefined && { isActive }),
        ...(is_active !== undefined && { isActive: is_active }),
        ...(label !== undefined && { label: label.trim().slice(0, 80) }),
        ...(startDate !== undefined && { startDate: startDate || null }),
        ...(start_date !== undefined && { startDate: start_date || null }),
        ...(endDate !== undefined && { endDate: endDate || null }),
        ...(end_date !== undefined && { endDate: end_date || null }),
      })
      if (!updated) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json({ ok: true })
    }
    case 'DELETE': {
      const body = await request!.json()
      if (!body.id) return Response.json({ error: 'id is required' }, { status: 400 })
      store.deleteSemester(body.id)
      return Response.json({ ok: true })
    }
    default:
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

async function handleTimetable(method: string, request?: Request): Promise<Response> {
  switch (method) {
    case 'GET': {
      const url = request ? new URL(request.url) : null
      const semesterId = url?.searchParams.get('semesterId')
      const recurringClasses = store.getRecurringClasses(semesterId)
      // Enrich with subject data
      const enriched = recurringClasses.map(rc => {
        const subject = store.getSubject(rc.subjectId)
        return { ...rc, subject: subject ? { id: subject.id, name: subject.name, color: subject.color } : null }
      })
      return Response.json(snkArr(enriched as unknown as Record<string, unknown>[]))
    }
    case 'POST': {
      const body = await request!.json()
      const rc = store.createRecurringClass({
        subjectId: body.subject_id ?? body.subjectId,
        dayOfWeek: body.day_of_week ?? body.dayOfWeek,
        startTime: body.start_time ?? body.startTime,
        endTime: body.end_time ?? body.endTime ?? null,
        classType: body.class_type ?? body.classType ?? 'theory',
        semesterId: body.semester_id ?? body.semesterId ?? null,
      })
      return Response.json(snk(rc as unknown as Record<string, unknown>), { status: 201 })
    }
    case 'PATCH': {
      const body = await request!.json()
      const { id, ...changes } = body
      const updated = store.updateRecurringClass(id, changes)
      if (!updated) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json({ ok: true })
    }
    case 'DELETE': {
      const body = await request!.json()
      const deleted = store.deleteRecurringClass(body.id)
      if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json({ deleted: true })
    }
    default:
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

async function handleTasks(method: string, request?: Request): Promise<Response> {
  switch (method) {
    case 'GET':
      return Response.json(snkArr(store.getTasks() as unknown as Record<string, unknown>[]))
    case 'POST': {
      const body = await request!.json()
      const task = store.createTask({
        title: body.title,
        subjectId: body.subject_id ?? body.subjectId ?? null,
        dueDate: body.due_date ?? body.dueDate ?? null,
        priority: body.priority ?? 'medium',
        note: body.note ?? '',
        source: body.source ?? 'user',
      })
      return Response.json(snk(task as unknown as Record<string, unknown>), { status: 201 })
    }
    case 'PATCH': {
      const body = await request!.json()
      const { id, completed, ...changes } = body
      if (completed !== undefined && Object.keys(changes).length === 0) {
        const updated = store.updateTask(id, { completed })
        if (!updated) return Response.json({ error: 'Not found' }, { status: 404 })
        return Response.json({ ok: true })
      }
      const updated = store.updateTask(body.id, changes)
      if (!updated) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json({ ok: true })
    }
    case 'DELETE': {
      const body = await request!.json()
      const deleted = store.deleteTask(body.id)
      if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json({ deleted: true })
    }
    default:
      return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

async function handleAttendance(method: string, request?: Request): Promise<Response> {
  if (method === 'GET' && request) {
    const url = new URL(request.url)
    const selectedDate = url.searchParams.get('date')
    if (!selectedDate) return Response.json({ error: 'date required' }, { status: 400 })

    const activeSemester = store.getActiveSemester()
    const recurring = store.getRecurringClasses(activeSemester?.id)
    const recurringIds = recurring.map(rc => rc.id)
    const instances = store.getClassInstances({ date: selectedDate, recurringClassIds: recurringIds })
    const allRecords = store.getAttendanceRecords()

    const enriched = instances.map(inst => ({
      ...inst,
      subject: store.getSubject(inst.subjectId),
      attendance: allRecords.find(r => r.classInstanceId === inst.id) ?? null,
    }))

    return Response.json({
      activeSemester: activeSemester ? snk(activeSemester as unknown as Record<string, unknown>) : null,
      instances: snkArr(enriched as unknown as Record<string, unknown>[]),
    })
  }

  if (method === 'POST' && request) {
    const body = await request.json()
    store.upsertAttendance({
      classInstanceId: body.classInstanceId ?? body.class_instance_id,
      status: body.status,
    })
    return Response.json({ ok: true })
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}

function handleGenerateInstances(): Response {
  const semester = store.getActiveSemester()
  if (!semester) return Response.json({ error: 'No active semester' }, { status: 400 })

  store.initDemoInstances()

  const allInstances = store.getClassInstances({})
  const allRecords = store.getAttendanceRecords()
  return Response.json({
    instancesGenerated: allInstances.length,
    absentDefaulted: allRecords.filter(r => r.status === 'absent').length,
  })
}

async function handleDashboard(method: string, request?: Request): Promise<Response> {
  if (method === 'POST' && request) {
    const body = await request.json()
    const { date, status, classInstanceId, recurringClassId } = body

    let resolvedInstanceId = classInstanceId as string | undefined

    if (!resolvedInstanceId && recurringClassId) {
      const rc = store.getRecurringClasses().find(r => r.id === recurringClassId)
      if (rc) {
        const ci = store.upsertClassInstance({
          recurringClassId: rc.id,
          date: date,
          startTime: rc.startTime,
          endTime: rc.endTime,
          subjectId: rc.subjectId,
          classType: rc.classType,
        })
        resolvedInstanceId = ci.id
      }
    }

    if (resolvedInstanceId) {
      if (status === null) {
        store.deleteAttendance(resolvedInstanceId)
      } else {
        store.upsertAttendance({ classInstanceId: resolvedInstanceId, status })
      }
    }

    return Response.json({ ok: true })
  }

  const url = request ? new URL(request.url) : null
  const today = url?.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
  const dateObj = new Date(`${today}T12:00:00`)
  const dayOfWeek = (dateObj.getDay() + 6) % 7

  const activeSemester = store.getActiveSemester()
  const recurring = store.getRecurringClasses(activeSemester?.id).filter(rc => rc.dayOfWeek === dayOfWeek)
  const recurringIds = recurring.map(rc => rc.id)
  const instances = store.getClassInstances({ date: today, recurringClassIds: recurringIds })
  const subjects = store.getSubjects(activeSemester?.id)
  const allRecords = store.getAttendanceRecords()

  const flatInstances = instances.map(inst => ({
    ...inst,
    subject: store.getSubject(inst.subjectId),
    attendance: allRecords.find(r => r.classInstanceId === inst.id) ?? null,
  }))

  const present = allRecords.filter(r => r.status === 'present').length
  const total = allRecords.filter(r => ['present', 'absent'].includes(r.status)).length

  return Response.json({
    activeSemester: activeSemester ? { id: activeSemester.id, label: activeSemester.label } : null,
    recurring: snkArr(recurring.map(rc => ({ ...rc, subject: store.getSubject(rc.subjectId) })) as unknown as Record<string, unknown>[]),
    instances: snkArr(flatInstances as unknown as Record<string, unknown>[]),
    subjects: subjects.map(s => ({ id: s.id, name: s.name, color: s.color })),
    stats: {
      subjects: subjects.length,
      tasks: store.getTasks({ completed: false }).length,
      attendance: {
        total,
        present,
        percentage: total > 0 ? Math.round((present / total) * 100) : null,
      },
    },
  })
}

function handleAnalytics(request?: Request): Response {
  const url = request ? new URL(request.url) : null
  const start = url?.searchParams.get('start')
  const end = url?.searchParams.get('end')

  const instances = store.getClassInstances({
    ...(start && { startDate: start }),
    ...(end && { endDate: end }),
  })

  const allRecords = store.getAttendanceRecords()

  const enriched = instances.map(inst => ({
    ...inst,
    subject: store.getSubject(inst.subjectId),
    attendance: allRecords.find(r => r.classInstanceId === inst.id) ?? null,
  }))

  return Response.json(snkArr(enriched as unknown as Record<string, unknown>[]))
}

function handleCalendar(request?: Request): Response {
  const url = request ? new URL(request.url) : null
  const start = url?.searchParams.get('start')
  const end = url?.searchParams.get('end')
  if (!start || !end) return Response.json({ error: 'start and end required' }, { status: 400 })

  const activeSemester = store.getActiveSemester()
  const recurring = store.getRecurringClasses(activeSemester?.id)
  const recurringIds = recurring.map(rc => rc.id)
  const instances = store.getClassInstances({ startDate: start, endDate: end, recurringClassIds: recurringIds })
  const holidayList = store.getHolidays(start, end)
  const allRecords = store.getAttendanceRecords()

  const enriched = instances.map(inst => ({
    ...inst,
    subject: store.getSubject(inst.subjectId),
    attendance: allRecords.find(r => r.classInstanceId === inst.id) ?? null,
  }))

  return Response.json({
    activeSemester: activeSemester ? { id: activeSemester.id, label: activeSemester.label } : null,
    instances: snkArr(enriched as unknown as Record<string, unknown>[]),
    holidays: holidayList,
  })
}

async function handleSettingsData(method: string, request?: Request): Promise<Response> {
  if (method === 'GET') {
    return Response.json({
      subjects: snkArr(store.getSubjects() as unknown as Record<string, unknown>[]),
      recurring_classes: snkArr(store.getRecurringClasses() as unknown as Record<string, unknown>[]),
      class_instances: snkArr(store.getClassInstances({}) as unknown as Record<string, unknown>[]),
      attendance_records: snkArr(store.getAttendanceRecords() as unknown as Record<string, unknown>[]),
      tasks: snkArr(store.getTasks() as unknown as Record<string, unknown>[]),
      holidays: snkArr(store.getHolidays() as unknown as Record<string, unknown>[]),
      semesters: snkArr(store.getSemesters() as unknown as Record<string, unknown>[]),
    })
  }
  if (method === 'POST' && request) {
    await request.json()
    return Response.json({ imported: true })
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}

function handleMcpKey(method: string): Response {
  if (method === 'GET') {
    return Response.json([])
  }
  if (method === 'POST') {
    const raw = 'dp_demo_' + Math.random().toString(36).slice(2)
    return Response.json({ key: raw, prefix: raw.slice(0, 8) + '...' })
  }
  if (method === 'DELETE') {
    return Response.json({ deleted: true })
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}
