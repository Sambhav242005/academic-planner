import { api } from './client';
import type { ClassInstance, AttendanceRecord, AttendanceStatus } from '../types';

export const attendanceApi = {
  getForDate: (date: string) =>
    api.get<{ classInstances: (ClassInstance & { attendance: AttendanceRecord | null })[] }>(
      '/api/attendance',
      { date }
    ),

  mark: (data: {
    classInstanceId: string;
    status: AttendanceStatus;
    note?: string;
  }) => api.post<AttendanceRecord>('/api/attendance', data),
};
