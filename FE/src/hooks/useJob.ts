import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { jobApi, jobsListApi } from '@/apis/job';
import { useCrudResource } from '@/hooks/crud';
import {
  type JobDetail,
  type JobFilter,
  JobFilterEnum,
  type JobSummary,
  type LoadPlan,
  type MoveHorse,
} from '@/interfaces';

/** The Jobs list's paging, sort and search (as Users & roles); `filter` is the active tab. */
export const useJobList = (filter: JobFilter) => {
  const extra = useMemo(() => (filter === JobFilterEnum.ALL ? undefined : { filter }), [filter]);
  return useCrudResource<JobSummary, never>('jobs', jobsListApi, undefined, extra);
};

export const useJobDetail = (jobId: string, options?: { refetchInterval?: number | false }) => {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobApi.getDetail(jobId),
    enabled: Boolean(jobId),
    refetchInterval: options?.refetchInterval,
  });
};

export const useLoadPlan = (jobId: string) => {
  return useQuery({
    queryKey: ['job', jobId, 'load-plan'],
    queryFn: () => jobApi.getLoadPlan(jobId),
    enabled: Boolean(jobId),
  });
};

export const useCreateLoadPlan = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId?: string) => jobApi.createLoadPlan(jobId, vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId, 'load-plan'] });
    },
  });
};

export const useChangeLoadPlanVehicle = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => jobApi.changeLoadPlanVehicle(jobId, vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId, 'load-plan'] });
    },
  });
};

/**
 * Applies a move to the cached plan so the tile settles before the server answers. Rule issues
 * on the touched stalls are dropped until the server's answer recomputes them.
 */
const applyMove = (plan: LoadPlan, move: MoveHorse): LoadPlan => {
  const horse =
    plan.unassignedHorses.find((h) => h.id === move.horseId) ??
    plan.stalls.find((s) => s.horse?.id === move.horseId)?.horse;
  if (!horse) return plan;
  const occupant = plan.stalls.find((s) => s.stallId === move.toStallId)?.horse ?? null;
  // A horse dropped from the list sends the occupant back to the list; from a stall, they swap.
  const occupantGoesTo = occupant && move.fromStallId ? move.fromStallId : null;
  const stalls = plan.stalls.map((s) => {
    if (s.stallId === move.toStallId) return { ...s, horse, issue: null };
    if (s.stallId === move.fromStallId)
      return { ...s, horse: occupantGoesTo ? occupant : null, issue: null };
    return s;
  });
  const unassignedHorses = plan.unassignedHorses.filter((h) => h.id !== move.horseId);
  if (!move.toStallId) unassignedHorses.push(horse);
  if (occupant && !occupantGoesTo) unassignedHorses.push(occupant);
  return { ...plan, stalls, unassignedHorses };
};

export const useMoveHorse = (jobId: string) => {
  const queryClient = useQueryClient();
  const jobKey = ['job', jobId];
  return useMutation({
    mutationFn: (move: MoveHorse) => jobApi.moveHorse(jobId, move),
    onMutate: async (move) => {
      // A poll landing now would overwrite the optimistic plan with the old one.
      await queryClient.cancelQueries({ queryKey: jobKey });
      const previous = queryClient.getQueryData<JobDetail>(jobKey);
      if (previous?.loadPlan) {
        queryClient.setQueryData<JobDetail>(jobKey, {
          ...previous,
          loadPlan: applyMove(previous.loadPlan, move),
        });
      }
      return { previous };
    },
    onError: (_error, _move, context) => {
      if (context?.previous) queryClient.setQueryData(jobKey, context.previous);
    },
    onSuccess: (loadPlan) => {
      queryClient.setQueryData<JobDetail>(jobKey, (job) => (job ? { ...job, loadPlan } : job));
    },
    // Success or refusal, refetch: a 409 means the plan changed under us.
    onSettled: () => queryClient.invalidateQueries({ queryKey: jobKey }),
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
