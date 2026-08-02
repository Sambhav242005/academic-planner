import { api } from './client';
import type { RecurringClass, ClassType } from '../types';

export const timetableApi = {
  list: (semesterId?: string) =>
    api.get<RecurringClass[]>('/api/timetable', semesterId ? { semesterId } : undefined),

  create: (data: {
    subjectId: string;
    dayOfWeek: number;
    startTime: string;
    endTime?: string;
    classType: ClassType;
    semesterId?: string;
  }) => api.post<RecurringClass>('/api/timetable', data),

  update: (id: string, data: Partial<Omit<RecurringClass, 'id'>>) =>
    api.patch<RecurringClass>(`/api/timetable/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/timetable/${id}`),
};
