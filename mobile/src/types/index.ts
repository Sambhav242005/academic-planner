export type ClassType = 'theory' | 'clinical' | 'practical' | 'tutorial' | 'exam';
export type AttendanceStatus = 'present' | 'absent' | 'cancelled' | 'holiday';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskSource = 'user' | 'ai';

export interface Semester {
  id: string;
  label: string;
  isActive: boolean;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  semesterId: string;
}

export interface RecurringClass {
  id: string;
  subjectId: string;
  semesterId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classType: ClassType;
  subject?: Subject;
}

export interface ClassInstance {
  id: string;
  recurringClassId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  classType: ClassType;
  subject?: Subject;
  attendance?: AttendanceRecord;
}

export interface AttendanceRecord {
  id: string;
  classInstanceId: string;
  status: AttendanceStatus;
  note: string | null;
  markedAt: string;
}

export interface Task {
  id: string;
  title: string;
  subjectId: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  note: string;
  completed: boolean;
  source: TaskSource;
  subject?: Subject;
}

export interface Holiday {
  id: string;
  date: string;
}

export interface Profile {
  id: string;
  displayName: string;
  college: string;
  semester: number;
  defaultTarget: number;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  cancelled: number;
  holiday: number;
  percentage: number;
}

export interface SubjectAttendanceStats extends AttendanceStats {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
}

export interface DashboardData {
  todayClasses: (RecurringClass & { subject: Subject })[];
  subjects: Subject[];
  stats: AttendanceStats;
}

export interface ApiError {
  message: string;
  status: number;
}
