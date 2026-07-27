export interface Profile {
  id: string
  displayName: string | null
  college: string | null
  semester: number | null
  defaultTarget: number
  createdAt: string
  updatedAt: string
}

export interface Subject {
  id: string
  userId: string
  name: string
  color: string
  semesterId: string | null
  createdAt: string
}

export interface RecurringClass {
  id: string
  userId: string
  semesterId: string | null
  subjectId: string
  subject?: Subject
  dayOfWeek: number
  startTime: string
  endTime: string | null
  classType: ClassType
  createdAt: string
}

export interface ClassInstance {
  id: string
  userId: string
  recurringClassId: string | null
  date: string
  startTime: string
  endTime: string | null
  subjectId: string
  subject?: Subject
  classType: ClassType
  attendance?: AttendanceRecord
}

export interface AttendanceRecord {
  id: string
  userId: string
  classInstanceId: string
  status: AttendanceStatus
  note: string
  markedAt: string
}

export interface Task {
  id: string
  userId: string
  title: string
  subjectId: string | null
  subject?: Subject
  dueDate: string | null
  priority: TaskPriority
  note: string
  completed: boolean
  source: TaskSource
  createdAt: string
}

export interface Holiday {
  id: string
  userId: string
  date: string
}

export interface Semester {
  id: string
  userId: string
  label: string
  isActive: boolean
  createdAt: string
}

export interface McpApiKey {
  id: string
  userId: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

export type ClassType = 'theory' | 'clinical' | 'practical' | 'tutorial' | 'exam'
export type AttendanceStatus = 'present' | 'absent' | 'cancelled' | 'holiday'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskSource = 'user' | 'ai'

export interface AttendanceStats {
  total: number
  present: number
  absent: number
  cancelled: number
  holiday: number
  percentage: number
}

export interface SubjectAttendanceStats extends AttendanceStats {
  subjectId: string
  subjectName: string
  subjectColor: string
}

export interface HolidayWithSource extends Holiday {
  name?: string
  source?: 'user' | 'indian'
}
