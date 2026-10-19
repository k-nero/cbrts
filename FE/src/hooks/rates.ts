import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addRateLine,
  createRateDraft,
  deleteRateLine,
  deleteServiceClass,
  discardRateDraft,
  getRateCatalog,
  getRateCorridor,
  publishRateDraft,
  putPolicies,
  putServiceClass,
  putVolumeBreaks,
  updateRateLine,
} from '@/apis/rates';
import { queryKeys } from '@/constant/query';
import type {
  RateCorridorView,
  RateLineInput,
  RatePolicyKey,
  ServiceClass,
  ServiceClassInput,
  VolumeBreakInput,
} from '@/interfaces';

/** The versions and the corridors (US-Q-10). */
export const useRateCatalog = () =>
  useQuery({ queryKey: queryKeys.rates.catalog(), queryFn: getRateCatalog });

/** One corridor's rates in one version; waits until both are known. */
export const useRateCorridor = (versionId: string | null, corridorId: string | null) =>
  useQuery({
    queryKey: queryKeys.rates.view(versionId ?? '', corridorId ?? ''),
    queryFn: () => getRateCorridor(versionId as string, corridorId as string),
    enabled: Boolean(versionId && corridorId),
  });

/** Create, discard or publish the draft: every version and count may change, so all of it reloads. */
const useVersionWrite = <V>(write: (value: V) => Promise<unknown>) => {
  const qc = useQueryClient();
  return useMutation<unknown, unknown, V>({
    mutationFn: write,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.rates.all() }),
  });
};

export const useCreateRateDraft = () => useVersionWrite<void>(() => createRateDraft());
export const useDiscardRateDraft = () => useVersionWrite<void>(() => discardRateDraft());
export const usePublishRateDraft = () => useVersionWrite<string>((note) => publishRateDraft(note));

/**
 * A draft edit: the answer is the corridor the page shows, so it fills that view; the catalog reloads for
 * the missing counts and who edited last.
 */
const useDraftWrite = <V>(write: (value: V) => Promise<RateCorridorView>) => {
  const qc = useQueryClient();
  return useMutation<RateCorridorView, unknown, V>({
    mutationFn: write,
    onSuccess: (view) => {
      // Other corridors show the same policies, global bands and shared lines: mark them stale first, then
      // fill the shown corridor with the answer, which is fresh.
      void qc.invalidateQueries({
        queryKey: queryKeys.rates.versionViews(view.versionId),
        refetchType: 'none',
      });
      qc.setQueryData(queryKeys.rates.view(view.versionId, view.corridor.id), view);
      void qc.invalidateQueries({ queryKey: queryKeys.rates.catalog() });
    },
  });
};

export const usePutServiceClass = () =>
  useDraftWrite<{ corridorId: string; serviceClass: ServiceClass; body: ServiceClassInput }>(
    ({ corridorId, serviceClass, body }) => putServiceClass(corridorId, serviceClass, body),
  );

export const useDeleteServiceClass = () =>
  useDraftWrite<{ corridorId: string; serviceClass: ServiceClass }>(
    ({ corridorId, serviceClass }) => deleteServiceClass(corridorId, serviceClass),
  );

export const useSaveRateLine = () =>
  useDraftWrite<{ lineId: string | null; body: RateLineInput; view: string }>(
    ({ lineId, body, view }) =>
      lineId ? updateRateLine(lineId, body, view) : addRateLine(body, view),
  );

export const useDeleteRateLine = () =>
  useDraftWrite<{ lineId: string; view: string }>(({ lineId, view }) =>
    deleteRateLine(lineId, view),
  );

export const usePutVolumeBreaks = () =>
  useDraftWrite<{ corridorId: string | null; bands: VolumeBreakInput[]; view: string }>(
    ({ corridorId, bands, view }) => putVolumeBreaks(corridorId, bands, view),
  );

export const usePutPolicies = () =>
  useDraftWrite<{ values: Partial<Record<RatePolicyKey, number>>; view: string }>(
    ({ values, view }) => putPolicies(values, view),
  );
