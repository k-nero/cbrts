import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { jobApi } from '@/apis/job';
import type { JobListParams } from '@/interfaces';

export const useJobs = (params?: JobListParams) => {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => jobApi.list(params),
  });
};

export const useJobDetail = (jobId: string) => {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobApi.getDetail(jobId),
    enabled: Boolean(jobId),
  });
};

export const useLoadPlan = (jobId: string) => {
  return useQuery({
    queryKey: ['job', jobId, 'load-plan'],
    queryFn: () => jobApi.getLoadPlan(jobId),
    enabled: Boolean(jobId),
  });
};

export const useAssignStall = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      vehicleStallId,
      horseId,
    }: {
      vehicleStallId: string;
      horseId?: string | null;
    }) => jobApi.assignStall(jobId, vehicleStallId, horseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId, 'load-plan'] });
    },
  });
};

export const useAutoArrange = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => jobApi.autoArrange(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId, 'load-plan'] });
    },
  });
};

export const useConfirmLoadPlan = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => jobApi.confirmLoadPlan(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId, 'load-plan'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

export const useRoutePlans = (jobId: string) => {
  return useQuery({
    queryKey: ['job', jobId, 'route-plans'],
    queryFn: () => jobApi.getRoutePlans(jobId),
    enabled: Boolean(jobId),
  });
};

export const useConfirmRoutePlan = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, changeReason }: { planId: string; changeReason?: string }) =>
      jobApi.confirmRoutePlan(jobId, planId, changeReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId, 'route-plans'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

export const useAssignCrew = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (crew: { userId: string; crewRole: string }[]) => jobApi.assignCrew(jobId, crew),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
  });
};

export const useSignOffTripPlan = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => jobApi.signOff(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};
