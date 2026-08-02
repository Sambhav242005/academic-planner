import { api } from './client';
import type { DashboardData, ClassInstance, Holiday } from '../types';

export const dashboardApi = {
  getData: () => api.get<DashboardData>('/api/dashboard'),

  markAttendance: (data: {
    classInstanceId?: string;
    recurringClassId?: string;
    status: 'present' | 'absent' | 'cancelled' | 'holiday';
  }) => api.post<void>('/api/dashboard', data),
};

export const calendarApi = {
  getData: (start: string, end: string) =>
    api.get<{ classInstances: ClassInstance[]; holidays: Holiday[] }>(
      '/api/calendar',
      { start, end }
    ),
};

export const analyticsApi = {
  getData: (start: string, end: string) =>
    api.get<{ classInstances: (ClassInstance & { attendance: { status: string } | null })[] }>(
      '/api/analytics',
      { start, end }
    ),
};

export const profileApi = {
  get: () => api.get<import('../types').Profile>('/api/profile'),

  update: (data: Partial<Pick<import('../types').Profile, 'displayName' | 'college' | 'semester' | 'defaultTarget'>>) =>
    api.patch<import('../types').Profile>('/api/profile', data),
};
