import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMaintenanceRequests, createMaintenanceRequest } from '../api/maintenanceApi';

export function useMaintenanceRequests() {
  return useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: fetchMaintenanceRequests,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
  });
}

export function useCreateMaintenanceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMaintenanceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
    },
  });
}
