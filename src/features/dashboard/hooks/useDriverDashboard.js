import { useQuery } from '@tanstack/react-query';
import { fetchDriverDashboardData } from '../api/dashboardApi';

/**
 * Custom hook using TanStack Query to manage driver dashboard data
 */
export function useDriverDashboard() {
  return useQuery({
    queryKey: ['driver-dashboard'],
    queryFn: fetchDriverDashboardData,
    staleTime: 0, // Real-time API query refetch
    refetchOnMount: true,
  });
}
