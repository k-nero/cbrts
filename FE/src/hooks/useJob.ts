import { createContext, useContext, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { corridorApi, jobApi, jobsListApi, routeStopApi } from '@/apis/job';
import { useCrudResource } from '@/hooks/crud';
import { useAuthStore } from '@/stores/authStore';
import {
  type FlightAllocationInput,
  type JobDetail,
  type JobFilter,
  JobFilterEnum,
  type JobSummary,
  type TripLoad,
  type MoveHorse,
  type RouteDraftInput,
  RoleNameEnum,
} from '@/interfaces';

/** The Jobs list's paging, sort and search (as Users & roles); `filter` is the active tab. */
export const useJobList = (filter: JobFilter) => {
  const extra = useMemo(() => (filter === JobFilterEnum.ALL ? undefined : { filter }), [filter]);
  return useCrudResource<JobSummary, never>('jobs', jobsListApi, undefined, extra);
};

/**
 * The trip of the job's journey the job page plans (US-F3-16), from its `?trip=`; undefined plans
 * the job's current trip. Every job hook below reads it, so the tabs need not pass it along.
 */
export const JobTripContext = createContext<string | undefined>(undefined);

export const useJobTrip = () => useContext(JobTripContext);

/** The cache key of a job's page for one trip of its journey; `['job', id]` still matches them all. */
export const jobKey = (jobId: string, trip?: string) =>
  trip ? ['job', jobId, 'trip', trip] : ['job', jobId];

export const useJobDetail = (jobId: string, options?: { refetchInterval?: number | false }) => {
  const trip = useJobTrip();
  return useQuery({
    queryKey: jobKey(jobId, trip),
    queryFn: () => jobApi.getDetail(jobId, trip),
    enabled: Boolean(jobId),
    refetchInterval: options?.refetchInterval,
  });
};

export const useLoadPlan = (jobId: string) => {
  const trip = useJobTrip();
  return useQuery({
    queryKey: [...jobKey(jobId, trip), 'load-plan'],
    queryFn: () => jobApi.getLoadPlan(jobId, trip),
    enabled: Boolean(jobId),
  });
};

export const useCreateLoadPlan = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: (vehicleId?: string) => jobApi.createLoadPlan(jobId, vehicleId, trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId, 'load-plan'] });
    },
  });
};

export const useChangeLoadPlanVehicle = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: ({ vehicleId, tripVehicleId }: { vehicleId: string; tripVehicleId?: string }) =>
      jobApi.changeLoadPlanVehicle(jobId, vehicleId, tripVehicleId, trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
  });
};

/** Adds a trailer to the convoy (US-F3-10). The route, load plans and sign-off reopen. */
export const useAddTrailer = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: (vehicleId: string) => jobApi.addTrailer(jobId, vehicleId, trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/** Takes a trailer out of the convoy. The route, load plans and sign-off reopen. */
export const useRemoveTrailer = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: (tripVehicleId: string) => jobApi.removeTrailer(jobId, tripVehicleId, trip),
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
  const trip = useJobTrip();
  const key = jobKey(jobId, trip);
  return useMutation({
    mutationFn: (move: MoveHorse) => jobApi.moveHorse(jobId, move, trip),
    onMutate: async (move) => {
      // A poll landing now would overwrite the optimistic plan with the old one.
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<JobDetail>(key);
      if (previous?.loadPlan) {
        queryClient.setQueryData<JobDetail>(key, {
          ...previous,
          loadPlan: applyMove(previous.loadPlan, move),
        });
      }
      return { previous };
    },
    onError: (_error, _move, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (loadPlan) => {
      queryClient.setQueryData<JobDetail>(key, (job) => (job ? { ...job, loadPlan } : job));
    },
    // Success or refusal, refetch: a 409 means the plan changed under us.
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
};

export const useAutoArrange = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: () => jobApi.autoArrange(jobId, trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId, 'load-plan'] });
    },
  });
};

export const useConfirmLoadPlan = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: (acceptedWarnings: string[] = []) =>
      jobApi.confirmLoadPlan(jobId, acceptedWarnings, trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId, 'load-plan'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

export const useRoutePlans = (jobId: string) => {
  const trip = useJobTrip();
  return useQuery({
    queryKey: [...jobKey(jobId, trip), 'route-plans'],
    queryFn: () => jobApi.getRoutePlans(jobId, trip),
    enabled: Boolean(jobId),
  });
};

export const useConfirmRoutePlan = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: ({ planId, changeReason }: { planId: string; changeReason?: string }) =>
      jobApi.confirmRoutePlan(jobId, planId, changeReason, trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId, 'route-plans'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

export const useAssignCrew = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: ({
      crew,
      tripVehicleId,
    }: {
      crew: { userId: string; crewRole: string }[];
      tripVehicleId?: string;
    }) => jobApi.assignCrew(jobId, crew, tripVehicleId, false, trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
  });
};

export const useSignOffTripPlan = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: () => jobApi.signOff(jobId, trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/** Approved jobs that could share this job's trailer (US-F3-13). */
export const useShareSuggestions = (jobId: string, enabled: boolean) => {
  const trip = useJobTrip();
  return useQuery({
    queryKey: [...jobKey(jobId, trip), 'share-suggestions'],
    queryFn: () => jobApi.getShareSuggestions(jobId, trip),
    enabled: Boolean(jobId) && enabled,
    // A side panel: a refusal is shown in it, never sent to the page's error boundary.
    throwOnError: false,
  });
};

/**
 * Whether the signed-in staff member plans trips: the fleet & route coordinator or the logistics manager, the roles
 * the sharing and chain endpoints allow. Other staff see a job's trip but not the controls that change it.
 */
export const useCanPlanTrips = () => {
  const roles = useAuthStore((state) => state.roles) as string[];
  return (
    roles.includes(RoleNameEnum.FLEET_COORDINATOR) || roles.includes(RoleNameEnum.LOGISTICS_MANAGER)
  );
};

/** Puts another job on this job's trip; both jobs' plans reopen. */
export const useShareTrip = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: ({
      otherJobId,
      acceptedWarnings,
    }: {
      otherJobId: string;
      acceptedWarnings: string[];
    }) => jobApi.shareTrip(jobId, otherJobId, acceptedWarnings, trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/** Takes a job off this job's trip onto a trip of its own. */
export const useTakeOffTrip = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: (otherJobId: string) => jobApi.takeOffTrip(jobId, otherJobId, trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/** Sets a job's consignment on the trip's flight; the job pages of every job on the trip refetch. */
export const useUpdateFlightAllocation = () => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: ({
      jobId,
      flightId,
      input,
    }: {
      jobId: string;
      flightId: string;
      input: FlightAllocationInput;
    }) => jobApi.updateFlightAllocation(jobId, flightId, input, trip),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job'] }),
  });
};

/** Whether the job can close, what holds it, or how it was closed (US-F6-04). */
export const useJobClosing = (jobId: string) =>
  useQuery({
    queryKey: ['job', jobId, 'closing'],
    queryFn: () => jobApi.closing(jobId),
    enabled: Boolean(jobId),
  });

/** Closes the job; it leaves the active boards. */
export const useCloseJob = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => jobApi.close(jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/** The catalog corridors, for the next trip of a journey (US-F3-16). */
export const useCorridors = (enabled: boolean) =>
  useQuery({
    queryKey: ['corridors'],
    queryFn: corridorApi.list,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

/**
 * Continues the job's journey on a new trip from an airport or quarantine stop (US-F3-16). The
 * trip before reopens, so every view of the job refetches.
 */
export const useContinueOnTrip = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: ({ stopSeq, corridorId }: { stopSeq: number; corridorId: string }) =>
      jobApi.continueOnTrip(jobId, stopSeq, corridorId, trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/** Takes a later trip out of the job's journey (US-F3-16); it travels on the trip before again. */
export const useRemoveChainedTrip = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trip: string) => jobApi.removeChainedTrip(jobId, trip),
    onSuccess: (_parts, trip) => {
      // The trip is no longer the job's: drop its views rather than refetch them.
      queryClient.removeQueries({ queryKey: jobKey(jobId, trip) });
      queryClient.invalidateQueries({
        queryKey: ['job', jobId],
        predicate: (query) => !query.queryKey.includes(trip),
      });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

/** The border crossings a route's border stops pick from (US-F3-17). */
export const useBorderCrossings = (enabled: boolean) =>
  useQuery({
    queryKey: ['border-crossings'],
    queryFn: routeStopApi.borderCrossings,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

/** Saves the trip's route draft (US-F3-17); the Route tab and its versions refetch. */
export const useSaveRouteDraft = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: (draft: RouteDraftInput) => jobApi.saveRouteDraft(jobId, draft, trip),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job', jobId] }),
  });
};

/** The confirmed trips this job's trip could join (US-F3-18). */
export const useJoinableTrips = (jobId: string, enabled: boolean) => {
  const trip = useJobTrip();
  return useQuery({
    queryKey: [...jobKey(jobId, trip), 'joinable'],
    queryFn: () => jobApi.getJoinableTrips(jobId, trip),
    enabled: Boolean(jobId) && enabled,
    // A side panel: a refusal is shown in it, never sent to the page's error boundary.
    throwOnError: false,
  });
};

/** Puts this job's trip on a confirmed trip (US-F3-18); every job's page refetches. */
export const useJoinTrip = (jobId: string) => {
  const queryClient = useQueryClient();
  const trip = useJobTrip();
  return useMutation({
    mutationFn: ({ tripId, acceptedWarnings }: { tripId: string; acceptedWarnings: string[] }) =>
      jobApi.joinTrip(jobId, tripId, acceptedWarnings, trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};
