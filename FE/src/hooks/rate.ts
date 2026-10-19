import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rateApi } from '@/apis/rate';
import { queryKeys } from '@/constant/query';
import type {
  RateCatalogDetail,
  RateCorridorSummary,
  UpdateServiceClassRequest,
  UpdateVolumeBreakRequest,
} from '@/interfaces';

/**
 * List all corridors with mode, distance, active version, draft status, and missing rate alerts.
 */
export const useRateCorridors = () => {
  return useQuery({
    queryKey: queryKeys.rates.corridors(),
    queryFn: async (): Promise<RateCorridorSummary[]> => {
      const res = await rateApi.getCorridors();
      return res.data;
    },
  });
};

/**
 * Get rate catalog details for a corridor and optional version.
 */
export const useRateCatalogDetails = (corridorId?: string, versionId?: string) => {
  return useQuery({
    queryKey: queryKeys.rates.details(corridorId, versionId),
    queryFn: async (): Promise<RateCatalogDetail> => {
      const res = await rateApi.getRateCatalogDetails({ corridorId, versionId });
      return res.data;
    },
  });
};

/**
 * Create a new draft rate catalog version cloned from the active published version.
 */
export const useCreateRateDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await rateApi.createDraft();
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rates.all() });
    },
  });
};

/**
 * Discard an active draft rate catalog version.
 */
export const useDiscardRateDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      await rateApi.discardDraft(versionId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rates.all() });
    },
  });
};

/**
 * Publish a draft rate catalog version (DRAFT -> PUBLISHED).
 */
export const usePublishRateDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await rateApi.publishDraft(versionId);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rates.all() });
    },
  });
};

/**
 * Update an individual volume break discount percentage in draft.
 */
export const useUpdateVolumeBreak = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ breakId, data }: { breakId: string; data: UpdateVolumeBreakRequest }) => {
      const res = await rateApi.updateVolumeBreak(breakId, data);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rates.all() });
    },
  });
};

/**
 * Update an individual air service class position rate in draft.
 */
export const useUpdateServiceClass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ classId, data }: { classId: string; data: UpdateServiceClassRequest }) => {
      const res = await rateApi.updateServiceClass(classId, data);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.rates.all() });
    },
  });
};
