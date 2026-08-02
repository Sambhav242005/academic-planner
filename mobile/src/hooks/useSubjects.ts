import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsApi, semestersApi } from '../api';
import { useAppStore } from '../stores/app-store';

export function useSubjects() {
  const activeSemesterId = useAppStore((s) => s.activeSemesterId);

  return useQuery({
    queryKey: ['subjects', activeSemesterId],
    queryFn: () => subjectsApi.list(activeSemesterId || undefined),
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: subjectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; color: string }> }) =>
      subjectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: subjectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

export function useSemesters() {
  return useQuery({
    queryKey: ['semesters'],
    queryFn: () => semestersApi.list(),
  });
}

export function useActiveSemester() {
  return useQuery({
    queryKey: ['active-semester'],
    queryFn: () => semestersApi.getActive(),
  });
}

export function useCreateSemester() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: semestersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['semesters'] });
      queryClient.invalidateQueries({ queryKey: ['active-semester'] });
    },
  });
}
