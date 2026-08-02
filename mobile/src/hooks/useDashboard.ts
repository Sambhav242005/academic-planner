import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, attendanceApi } from '../api';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getData(),
  });
}

export function useAttendanceForDate(date: string) {
  return useQuery({
    queryKey: ['attendance', date],
    queryFn: () => attendanceApi.getForDate(date),
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: attendanceApi.mark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
