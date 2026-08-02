import { api } from './client';
import type { Subject, Semester } from '../types';

export const subjectsApi = {
  list: (semesterId?: string) =>
    api.get<Subject[]>('/api/subjects', semesterId ? { semesterId } : undefined),

  create: (data: { name: string; color: string; semesterId: string }) =>
    api.post<Subject>('/api/subjects', data),

  update: (id: string, data: Partial<Pick<Subject, 'name' | 'color'>>) =>
    api.patch<Subject>(`/api/subjects/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/subjects/${id}`),
};

export const semestersApi = {
  list: () => api.get<Semester[]>('/api/semesters'),

  getActive: () => api.get<Semester>('/api/semesters', { active: 'true' }),

  create: (data: { label: string; isActive?: boolean }) =>
    api.post<Semester>('/api/semesters', data),

  update: (id: string, data: Partial<Pick<Semester, 'label' | 'isActive'>>) =>
    api.patch<Semester>(`/api/semesters/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/semesters/${id}`),
};
