import { useQuery } from '@tanstack/react-query';
import { fetchDriverDashboardData } from '../api/dashboardApi';

/**
 * Custom hook using TanStack Query to manage driver dashboard data
 */
export function useDriverDashboard() {
  return useQuery({
    queryKey: ['driver-dashboard'],
    queryFn: fetchDriverDashboardData,
    staleTime: 1000 * 30,
    refetchOnMount: true,
  });
}
