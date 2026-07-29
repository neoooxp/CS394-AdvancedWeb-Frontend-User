import { useQuery } from '@tanstack/react-query';
import { fetchDriverWeeklyScheduleData } from '../api/routeApi';

export function useDriverSchedule() {
  return useQuery({
    queryKey: ['driverWeeklySchedule'],
    queryFn: fetchDriverWeeklyScheduleData,
    staleTime: 1000 * 60,
    refetchOnMount: true,
  });
}
