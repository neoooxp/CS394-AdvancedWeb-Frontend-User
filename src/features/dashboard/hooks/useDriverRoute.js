import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDriverRouteData, updateStudentAttendance } from '../api/routeApi';

export function useDriverRoute() {
  const queryClient = useQueryClient();

  const routeQuery = useQuery({
    queryKey: ['driverRoute'],
    queryFn: fetchDriverRouteData,
    staleTime: 0, // Always fetch fresh route data
    refetchOnMount: true,
  });

  const attendanceMutation = useMutation({
    mutationFn: updateStudentAttendance,
    onSuccess: () => {
      // Invalidate route query to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['driverRoute'] });
      queryClient.invalidateQueries({ queryKey: ['driverDashboard'] });
    },
  });

  return {
    ...routeQuery,
    markAttendance: attendanceMutation.mutate,
    isUpdatingAttendance: attendanceMutation.isPending,
  };
}
