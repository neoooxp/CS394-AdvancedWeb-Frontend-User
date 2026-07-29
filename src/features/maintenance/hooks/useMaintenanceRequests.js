import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMaintenanceRequests, createMaintenanceRequest } from '../api/maintenanceApi';

export function useMaintenanceRequests() {
  const query = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: fetchMaintenanceRequests,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
  });
  return {
    ...query,
    data: query.data?.data ?? [],
    pagination: query.data
      ? { currentPage: query.data.currentPage, lastPage: query.data.lastPage, total: query.data.total }
      : null,
  };
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
