import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDriverRouteData, updateStudentAttendance, updateBulkAttendance, generateRouteReport } from '../api/routeApi';

export function useDriverRoute() {
  const queryClient = useQueryClient();

  const routeQuery = useQuery({
    queryKey: ['driverRoute'],
    queryFn: fetchDriverRouteData,
    staleTime: 1000 * 30,
    refetchOnMount: true,
  });

  const attendanceMutation = useMutation({
    mutationFn: updateStudentAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverRoute'] });
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] });
    },
  });

  const bulkAttendanceMutation = useMutation({
    mutationFn: updateBulkAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverRoute'] });
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: ({ routeId }) => generateRouteReport(routeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverRoute'] });
      queryClient.invalidateQueries({ queryKey: ['driver-dashboard'] });
    },
  });

  return {
    ...routeQuery,
    markAttendance: attendanceMutation.mutate,
    isUpdatingAttendance: attendanceMutation.isPending,
    markBulkAttendance: bulkAttendanceMutation.mutate,
    isUpdatingBulkAttendance: bulkAttendanceMutation.isPending,
    completeRoute: reportMutation.mutate,
    isCompletingRoute: reportMutation.isPending,
    completeRouteError: reportMutation.error,
  };
}
