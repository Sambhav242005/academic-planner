import { api } from './client';
import type { Task, TaskPriority } from '../types';

export const tasksApi = {
  list: (filters?: { completed?: boolean; priority?: TaskPriority }) =>
    api.get<Task[]>('/api/tasks', filters as Record<string, string>),

  create: (data: {
    title: string;
    subjectId?: string;
    dueDate?: string;
    priority?: TaskPriority;
    note?: string;
  }) => api.post<Task>('/api/tasks', data),

  update: (id: string, data: Partial<Omit<Task, 'id'>>) =>
    api.patch<Task>(`/api/tasks/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/api/tasks/${id}`),
};
