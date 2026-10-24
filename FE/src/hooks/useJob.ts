import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { jobApi, jobsListApi } from '@/apis/job';
import { useCrudResource } from '@/hooks/crud';
import {
  type FlightAllocationInput,
  type JobDetail,
  type JobFilter,
  JobFilterEnum,
  type JobSummary,
  type TripLoad,
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
    mutationFn: ({ vehicleId, tripVehicleId }: { vehicleId: string; tripVehicleId?: string }) =>
      jobApi.changeLoadPlanVehicle(jobId, vehicleId, tripVehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
  });
};

/** Adds a trailer to the convoy (US-F3-10). The route, load plans and sign-off reopen. */
export const useAddTrailer = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => jobApi.addTrailer(jobId, vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/** Takes a trailer out of the convoy. The route, load plans and sign-off reopen. */
export const useRemoveTrailer = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripVehicleId: string) => jobApi.removeTrailer(jobId, tripVehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/**
 * Applies a move to the cached trip load so the tile settles before the server answers. The
 * stalls can be on any trailer. Rule issues on the touched stalls are dropped until the server's
 * answer recomputes them.
 */
const applyMove = (load: TripLoad, move: MoveHorse): TripLoad => {
  const allStalls = load.vehicles.flatMap((v) => v.stalls);
  const horse =
    load.unassignedHorses.find((h) => h.id === move.horseId) ??
    allStalls.find((s) => s.horse?.id === move.horseId)?.horse;
  if (!horse) return load;
  const occupant = allStalls.find((s) => s.stallId === move.toStallId)?.horse ?? null;
  // A horse dropped from the list sends the occupant back to the list; from a stall, they swap.
  const occupantGoesTo = occupant && move.fromStallId ? move.fromStallId : null;
  const vehicles = load.vehicles.map((v) => ({
    ...v,
    stalls: v.stalls.map((s) => {
      if (s.stallId === move.toStallId) return { ...s, horse, issue: null };
      if (s.stallId === move.fromStallId)
        return { ...s, horse: occupantGoesTo ? occupant : null, issue: null };
      return s;
    }),
  }));
  const unassignedHorses = load.unassignedHorses.filter((h) => h.id !== move.horseId);
  if (!move.toStallId) unassignedHorses.push(horse);
  if (occupant && !occupantGoesTo) unassignedHorses.push(occupant);
  return { ...load, vehicles, unassignedHorses };
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
    mutationFn: (acceptedWarnings: string[] = []) =>
      jobApi.confirmLoadPlan(jobId, acceptedWarnings),
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
    mutationFn: ({
      crew,
      tripVehicleId,
    }: {
      crew: { userId: string; crewRole: string }[];
      tripVehicleId?: string;
    }) => jobApi.assignCrew(jobId, crew, tripVehicleId),
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

/** Approved jobs that could share this job's trailer (US-F3-13). */
export const useShareSuggestions = (jobId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['job', jobId, 'share-suggestions'],
    queryFn: () => jobApi.getShareSuggestions(jobId),
    enabled: Boolean(jobId) && enabled,
  });
};

/** Puts another job on this job's trip; both jobs' plans reopen. */
export const useShareTrip = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      otherJobId,
      acceptedWarnings,
    }: {
      otherJobId: string;
      acceptedWarnings: string[];
    }) => jobApi.shareTrip(jobId, otherJobId, acceptedWarnings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/** Takes a job off this job's trip onto a trip of its own. */
export const useTakeOffTrip = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (otherJobId: string) => jobApi.takeOffTrip(jobId, otherJobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/** Sets a job's consignment on the trip's flight; the job pages of every job on the trip refetch. */
export const useUpdateFlightAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      flightId,
      input,
    }: {
      jobId: string;
      flightId: string;
      input: FlightAllocationInput;
    }) => jobApi.updateFlightAllocation(jobId, flightId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job'] }),
  });
};
