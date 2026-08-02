import {
  DEMO_SEMESTER,
  DEMO_SUBJECTS,
  DEMO_RECURRING_CLASSES,
  DEMO_TASKS,
  DEMO_PROFILE,
  DEMO_HOLIDAYS,
  DEMO_USER_ID,
} from './seed'
import type {
  Semester,
  Subject,
  RecurringClass,
  ClassInstance,
  AttendanceRecord,
  Task,
  Profile,
  Holiday,
} from '@/types'

let semesters: Semester[] = [{ ...DEMO_SEMESTER }]
let subjects: Subject[] = DEMO_SUBJECTS.map(s => ({ ...s }))
let recurringClasses: RecurringClass[] = DEMO_RECURRING_CLASSES.map(rc => ({ ...rc }))
let classInstances: ClassInstance[] = []
let attendanceRecords: AttendanceRecord[] = []
let tasks: Task[] = DEMO_TASKS.map(t => ({ ...t }))
let holidays: Holiday[] = DEMO_HOLIDAYS.map(h => ({ ...h }))
let profile: Profile | null = { ...DEMO_PROFILE }
let nextId = 1
let initialized = false

function uid(): string {
  return `d${(nextId++).toString(16).padStart(8, '0')}-0000-0000-0000-000000000000`
}

// --- Getters ---
export function getSemesters(): Semester[] {
  return semesters.map(s => ({ ...s }))
}

export function getActiveSemester(): Semester | null {
  return semesters.find(s => s.isActive) ?? null
}

export function getSubjects(semesterId?: string | null): Subject[] {
  return subjects
    .filter(s => !semesterId || s.semesterId === semesterId)
    .map(s => ({ ...s }))
}

export function getSubject(id: string): Subject | null {
  return subjects.find(s => s.id === id) ?? null
}

export function getRecurringClasses(semesterId?: string | null): RecurringClass[] {
  return recurringClasses
    .filter(rc => !semesterId || rc.semesterId === semesterId)
    .map(rc => ({ ...rc }))
}

export function getClassInstances(params: {
  date?: string
  startDate?: string
  endDate?: string
  recurringClassIds?: string[]
}): ClassInstance[] {
  let result = classInstances
  if (params.date) result = result.filter(i => i.date === params.date)
  if (params.startDate) result = result.filter(i => i.date >= params.startDate!)
  if (params.endDate) result = result.filter(i => i.date <= params.endDate!)
  if (params.recurringClassIds?.length) {
    result = result.filter(i =>
      i.recurringClassId && params.recurringClassIds!.includes(i.recurringClassId)
    )
  }
  return result.map(i => ({ ...i }))
}

export function getAttendanceRecords(classInstanceIds?: string[]): AttendanceRecord[] {
  let result = attendanceRecords
  if (classInstanceIds?.length) {
    result = result.filter(r => classInstanceIds.includes(r.classInstanceId))
  }
  return result.map(r => ({ ...r }))
}

export function getTasks(params?: { completed?: boolean; priority?: string }): Task[] {
  let result = tasks
  if (params?.completed !== undefined) result = result.filter(t => t.completed === params.completed)
  if (params?.priority) result = result.filter(t => t.priority === params.priority)
  return result.map(t => ({ ...t }))
}

export function getTask(id: string): Task | null {
  return tasks.find(t => t.id === id) ?? null
}

export function getHolidays(start?: string, end?: string): Holiday[] {
  let result = holidays
  if (start) result = result.filter(h => h.date >= start)
  if (end) result = result.filter(h => h.date <= end)
  return result.map(h => ({ ...h }))
}

export function getProfile(): Profile | null {
  return profile ? { ...profile } : null
}

export function isInitialized(): boolean {
  return initialized
}

// --- Mutations ---
export function createSemester(data: { label: string; startDate?: string | null; endDate?: string | null; isActive?: boolean }): Semester {
  if (data.isActive) semesters = semesters.map(s => ({ ...s, isActive: false }))
  const s: Semester = {
    id: uid(),
    userId: DEMO_USER_ID,
    label: data.label,
    isActive: data.isActive ?? false,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    createdAt: new Date().toISOString(),
  }
  semesters = [...semesters, s]
  return s
}

export function updateSemester(id: string, changes: Partial<Semester>): Semester | null {
  const idx = semesters.findIndex(s => s.id === id)
  if (idx === -1) return null
  if (changes.isActive) semesters = semesters.map(s => ({ ...s, isActive: false }))
  semesters[idx] = { ...semesters[idx], ...changes }
  return semesters[idx]
}

export function deleteSemester(id: string): boolean {
  const before = semesters.length
  semesters = semesters.filter(s => s.id !== id)
  return semesters.length < before
}

export function createSubject(data: { name: string; color: string; semesterId?: string | null }): Subject {
  const s: Subject = {
    id: uid(),
    userId: DEMO_USER_ID,
    name: data.name,
    color: data.color,
    semesterId: data.semesterId ?? null,
    createdAt: new Date().toISOString(),
  }
  subjects = [...subjects, s]
  return s
}

export function updateSubject(id: string, changes: Partial<Subject>): Subject | null {
  const idx = subjects.findIndex(s => s.id === id)
  if (idx === -1) return null
  subjects[idx] = { ...subjects[idx], ...changes }
  return subjects[idx]
}

export function deleteSubject(id: string): boolean {
  const before = subjects.length
  subjects = subjects.filter(s => s.id !== id)
  return subjects.length < before
}

export function createRecurringClass(data: {
  subjectId: string
  dayOfWeek: number
  startTime: string
  endTime?: string | null
  classType?: string
  semesterId?: string | null
}): RecurringClass {
  const rc: RecurringClass = {
    id: uid(),
    userId: DEMO_USER_ID,
    semesterId: data.semesterId ?? null,
    subjectId: data.subjectId,
    dayOfWeek: data.dayOfWeek,
    startTime: data.startTime,
    endTime: data.endTime ?? null,
    classType: (data.classType as RecurringClass['classType']) ?? 'theory',
    createdAt: new Date().toISOString(),
  }
  recurringClasses = [...recurringClasses, rc]
  return rc
}

export function updateRecurringClass(id: string, changes: Partial<RecurringClass>): RecurringClass | null {
  const idx = recurringClasses.findIndex(rc => rc.id === id)
  if (idx === -1) return null
  recurringClasses[idx] = { ...recurringClasses[idx], ...changes }
  return recurringClasses[idx]
}

export function deleteRecurringClass(id: string): boolean {
  const before = recurringClasses.length
  recurringClasses = recurringClasses.filter(rc => rc.id !== id)
  return recurringClasses.length < before
}

export function upsertClassInstance(data: {
  recurringClassId?: string
  date: string
  startTime: string
  endTime?: string | null
  subjectId: string
  classType: string
}): ClassInstance {
  const existing = classInstances.find(
    i =>
      i.date === data.date &&
      i.startTime === data.startTime &&
      i.subjectId === data.subjectId
  )
  if (existing) return existing
  const ci: ClassInstance = {
    id: uid(),
    userId: DEMO_USER_ID,
    recurringClassId: data.recurringClassId ?? null,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime ?? null,
    subjectId: data.subjectId,
    classType: data.classType as ClassInstance['classType'],
  }
  classInstances = [...classInstances, ci]
  return ci
}

export function upsertAttendance(data: {
  classInstanceId: string
  status: string
}): AttendanceRecord {
  const existing = attendanceRecords.find(r => r.classInstanceId === data.classInstanceId)
  if (existing) {
    existing.status = data.status as AttendanceRecord['status']
    existing.markedAt = new Date().toISOString()
    return existing
  }
  const ar: AttendanceRecord = {
    id: uid(),
    userId: DEMO_USER_ID,
    classInstanceId: data.classInstanceId,
    status: data.status as AttendanceRecord['status'],
    note: '',
    markedAt: new Date().toISOString(),
  }
  attendanceRecords = [...attendanceRecords, ar]
  return ar
}

export function deleteAttendance(classInstanceId: string): boolean {
  const before = attendanceRecords.length
  attendanceRecords = attendanceRecords.filter(r => r.classInstanceId !== classInstanceId)
  return attendanceRecords.length < before
}

export function createTask(data: {
  title: string
  subjectId?: string | null
  dueDate?: string | null
  priority?: string
  note?: string
  source?: string
}): Task {
  const t: Task = {
    id: uid(),
    userId: DEMO_USER_ID,
    title: data.title,
    subjectId: data.subjectId ?? null,
    dueDate: data.dueDate ?? null,
    priority: (data.priority as Task['priority']) ?? 'medium',
    note: data.note ?? '',
    completed: false,
    source: (data.source as Task['source']) ?? 'user',
    createdAt: new Date().toISOString(),
  }
  tasks = [...tasks, t]
  return t
}

export function updateTask(id: string, changes: Partial<Task>): Task | null {
  const idx = tasks.findIndex(t => t.id === id)
  if (idx === -1) return null
  tasks[idx] = { ...tasks[idx], ...changes }
  return tasks[idx]
}

export function deleteTask(id: string): boolean {
  const before = tasks.length
  tasks = tasks.filter(t => t.id !== id)
  return tasks.length < before
}

export function updateProfile(data: Partial<Profile>): Profile {
  profile = {
    ...(profile ?? {
      id: DEMO_USER_ID,
      displayName: null,
      college: null,
      semester: null,
      defaultTarget: 75,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    ...data,
    updatedAt: new Date().toISOString(),
  }
  return profile
}

// --- Instance generation ---
export function initDemoInstances(): void {
  if (initialized) return
  initialized = true

  const semester = getActiveSemester()
  if (!semester?.startDate) return

  const today = new Date()
  const start = new Date(semester.startDate + 'T12:00:00')
  const end = new Date(today)
  end.setDate(end.getDate() - 1)

  const seed = [0.8, 0.5, 0.9, 0.6, 0.7, 0.3, 0.85, 0.45, 0.75, 0.65, 0.9, 0.55, 0.7, 0.8, 0.4]
  let seedIdx = 0

  const current = new Date(start)
  while (current <= end) {
    const dayOfWeek = (current.getDay() + 6) % 7
    const dateStr = current.toISOString().slice(0, 10)

    for (const rc of recurringClasses) {
      if (rc.dayOfWeek === dayOfWeek && rc.semesterId === semester.id) {
        const instance = upsertClassInstance({
          recurringClassId: rc.id,
          date: dateStr,
          startTime: rc.startTime,
          endTime: rc.endTime,
          subjectId: rc.subjectId,
          classType: rc.classType,
        })

        const rand = seed[seedIdx % seed.length]
        seedIdx++
        upsertAttendance({
          classInstanceId: instance.id,
          status: rand > 0.3 ? 'present' : 'absent',
        })
      }
    }
    current.setDate(current.getDate() + 1)
  }
}

export function resetDemoStore(): void {
  semesters = [{ ...DEMO_SEMESTER }]
  subjects = DEMO_SUBJECTS.map(s => ({ ...s }))
  recurringClasses = DEMO_RECURRING_CLASSES.map(rc => ({ ...rc }))
  classInstances = []
  attendanceRecords = []
  tasks = DEMO_TASKS.map(t => ({ ...t }))
  holidays = DEMO_HOLIDAYS.map(h => ({ ...h }))
  profile = { ...DEMO_PROFILE }
  initialized = false
}
