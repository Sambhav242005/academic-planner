import type { Subject, Semester, RecurringClass, Task, Profile, Holiday } from '@/types'

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
export const DEMO_EMAIL = 'user@academic-planner.dev'

const demoUserIds = new Set<string>([DEMO_USER_ID])

export function isDemoUser(userId: string): boolean {
  return demoUserIds.has(userId)
}

export function registerDemoUser(userId: string): void {
  demoUserIds.add(userId)
}

export const DEMO_PROFILE: Profile = {
  id: DEMO_USER_ID,
  displayName: 'Demo Student',
  college: 'AIIMS Delhi',
  semester: 7,
  defaultTarget: 75,
  createdAt: '2025-06-01T00:00:00Z',
  updatedAt: '2025-06-01T00:00:00Z',
}

export const DEMO_SEMESTER: Semester = {
  id: 'a1000000-0000-0000-0000-000000000001',
  userId: DEMO_USER_ID,
  label: 'Semester 7',
  isActive: true,
  startDate: '2026-07-01',
  endDate: '2026-11-30',
  createdAt: '2026-06-01T00:00:00Z',
}

export const DEMO_SUBJECTS: Subject[] = [
  { id: 'b1000000-0000-0000-0000-000000000001', userId: DEMO_USER_ID, name: 'General Medicine', color: '#3b82f6', semesterId: DEMO_SEMESTER.id, createdAt: '2025-06-01T00:00:00Z' },
  { id: 'b1000000-0000-0000-0000-000000000002', userId: DEMO_USER_ID, name: 'Surgery', color: '#ef4444', semesterId: DEMO_SEMESTER.id, createdAt: '2025-06-01T00:00:00Z' },
  { id: 'b1000000-0000-0000-0000-000000000003', userId: DEMO_USER_ID, name: 'Pediatrics', color: '#f59e0b', semesterId: DEMO_SEMESTER.id, createdAt: '2025-06-01T00:00:00Z' },
  { id: 'b1000000-0000-0000-0000-000000000004', userId: DEMO_USER_ID, name: 'ENT', color: '#10b981', semesterId: DEMO_SEMESTER.id, createdAt: '2025-06-01T00:00:00Z' },
  { id: 'b1000000-0000-0000-0000-000000000005', userId: DEMO_USER_ID, name: 'Ophthalmology', color: '#8b5cf6', semesterId: DEMO_SEMESTER.id, createdAt: '2025-06-01T00:00:00Z' },
  { id: 'b1000000-0000-0000-0000-000000000006', userId: DEMO_USER_ID, name: 'PSM', color: '#f97316', semesterId: DEMO_SEMESTER.id, createdAt: '2025-06-01T00:00:00Z' },
]

const S = Object.fromEntries(DEMO_SUBJECTS.map(s => [s.name, s.id]))

export const DEMO_RECURRING_CLASSES: RecurringClass[] = [
  // Monday
  { id: 'c1000000-0000-0000-0000-000000000001', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['General Medicine'], dayOfWeek: 0, startTime: '08:00', endTime: '09:00', classType: 'theory', createdAt: '2025-06-01T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000002', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['Surgery'], dayOfWeek: 0, startTime: '09:00', endTime: '10:00', classType: 'theory', createdAt: '2025-06-01T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000003', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['Pediatrics'], dayOfWeek: 0, startTime: '10:00', endTime: '11:00', classType: 'theory', createdAt: '2025-06-01T00:00:00Z' },
  // Tuesday
  { id: 'c1000000-0000-0000-0000-000000000004', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['ENT'], dayOfWeek: 1, startTime: '08:00', endTime: '09:00', classType: 'theory', createdAt: '2025-06-01T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000005', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['Ophthalmology'], dayOfWeek: 1, startTime: '09:00', endTime: '10:00', classType: 'theory', createdAt: '2025-06-01T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000006', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['PSM'], dayOfWeek: 1, startTime: '10:00', endTime: '11:00', classType: 'theory', createdAt: '2025-06-01T00:00:00Z' },
  // Wednesday
  { id: 'c1000000-0000-0000-0000-000000000007', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['General Medicine'], dayOfWeek: 2, startTime: '08:00', endTime: '09:00', classType: 'theory', createdAt: '2025-06-01T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-000000000008', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['Surgery'], dayOfWeek: 2, startTime: '09:00', endTime: '10:00', classType: 'clinical', createdAt: '2025-06-01T00:00:00Z' },
  // Thursday
  { id: 'c1000000-0000-0000-0000-000000000009', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['Pediatrics'], dayOfWeek: 3, startTime: '08:00', endTime: '09:00', classType: 'theory', createdAt: '2025-06-01T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-00000000000a', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['PSM'], dayOfWeek: 3, startTime: '09:00', endTime: '10:00', classType: 'practical', createdAt: '2025-06-01T00:00:00Z' },
  // Friday
  { id: 'c1000000-0000-0000-0000-00000000000b', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['General Medicine'], dayOfWeek: 4, startTime: '08:00', endTime: '09:00', classType: 'clinical', createdAt: '2025-06-01T00:00:00Z' },
  // Saturday
  { id: 'c1000000-0000-0000-0000-00000000000c', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['Surgery'], dayOfWeek: 5, startTime: '09:00', endTime: '10:00', classType: 'clinical', createdAt: '2025-06-01T00:00:00Z' },
  { id: 'c1000000-0000-0000-0000-00000000000d', userId: DEMO_USER_ID, semesterId: DEMO_SEMESTER.id, subjectId: S['ENT'], dayOfWeek: 5, startTime: '10:00', endTime: '11:00', classType: 'theory', createdAt: '2025-06-01T00:00:00Z' },
]

export const DEMO_TASKS: Task[] = [
  { id: 'd1000000-0000-0000-0000-000000000001', userId: DEMO_USER_ID, title: "Read Harrison's Chapter 4 — Cardiology", subjectId: S['General Medicine'], dueDate: '2026-08-05', priority: 'high', note: 'Focus on ECG interpretation section', completed: false, source: 'user', createdAt: '2026-07-28T00:00:00Z' },
  { id: 'd1000000-0000-0000-0000-000000000002', userId: DEMO_USER_ID, title: 'Complete Surgery case presentation notes', subjectId: S['Surgery'], dueDate: '2026-08-03', priority: 'high', note: 'Appendicitis case — include differential diagnosis', completed: false, source: 'user', createdAt: '2026-07-25T00:00:00Z' },
  { id: 'd1000000-0000-0000-0000-000000000003', userId: DEMO_USER_ID, title: 'Practice pediatric growth charts', subjectId: S['Pediatrics'], dueDate: '2026-08-07', priority: 'medium', note: '', completed: false, source: 'user', createdAt: '2026-07-26T00:00:00Z' },
  { id: 'd1000000-0000-0000-0000-000000000004', userId: DEMO_USER_ID, title: 'ENT OSCE preparation — otoscopy & audiometry', subjectId: S['ENT'], dueDate: '2026-08-10', priority: 'medium', note: "Review last year's OSCE checklist", completed: false, source: 'ai', createdAt: '2026-07-27T00:00:00Z' },
  { id: 'd1000000-0000-0000-0000-000000000005', userId: DEMO_USER_ID, title: 'Write PSM assignment on immunization schedule', subjectId: S['PSM'], dueDate: '2026-08-02', priority: 'low', note: 'Cover Universal Immunization Programme', completed: true, source: 'user', createdAt: '2026-07-20T00:00:00Z' },
  { id: 'd1000000-0000-0000-0000-000000000006', userId: DEMO_USER_ID, title: 'Revise ophthalmology fundoscopy', subjectId: S['Ophthalmology'], dueDate: null, priority: 'low', note: '', completed: false, source: 'user', createdAt: '2026-07-29T00:00:00Z' },
]

export const DEMO_HOLIDAYS: Holiday[] = [
  { id: 'e1000000-0000-0000-0000-000000000001', userId: DEMO_USER_ID, date: '2026-08-15' },
  { id: 'e1000000-0000-0000-0000-000000000002', userId: DEMO_USER_ID, date: '2026-10-02' },
]
