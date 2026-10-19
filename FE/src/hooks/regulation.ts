import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearanceApi } from '@/apis/clearance';
import { queryKeys } from '@/constant/query';
import type {
  DocumentType,
  RegulationCatalog,
  RegulationVersion,
  UpdateRegulationRuleRequest,
} from '@/interfaces';

/**
 * List all regulation catalogs by destination.
 */
export const useRegulationCatalogs = () => {
  return useQuery({
    queryKey: queryKeys.regulations.catalogs(),
    queryFn: async (): Promise<RegulationCatalog[]> => {
      const res = await clearanceApi.getRegulationCatalogs();
      return res.data;
    },
  });
};

/**
 * Get detailed regulation version and rule specifications.
 */
export const useRegulationVersion = (versionId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.regulations.version(versionId ?? ''),
    queryFn: async (): Promise<RegulationVersion> => {
      if (!versionId) throw new Error('No versionId provided');
      const res = await clearanceApi.getRegulationVersionDetails(versionId);
      return res.data;
    },
    enabled: Boolean(versionId && versionId.trim()),
  });
};

/**
 * List all standard document types.
 */
export const useDocumentTypes = () => {
  return useQuery({
    queryKey: queryKeys.regulations.documentTypes(),
    queryFn: async (): Promise<DocumentType[]> => {
      const res = await clearanceApi.getDocumentTypes();
      return res.data;
    },
  });
};

/**
 * Update an individual rule within a draft version.
 */
export const useUpdateRegulationRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ruleId, data }: { ruleId: string; data: UpdateRegulationRuleRequest }) => {
      const res = await clearanceApi.updateRegulationRule(ruleId, data);
      return res.data;
    },
    onSuccess: (version) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.regulations.all() });
      if (version?.id) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.regulations.version(version.id) });
      }
    },
  });
};

/**
 * Discard a draft version.
 */
export const useDiscardRegulationDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      await clearanceApi.discardRegulationDraft(versionId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.regulations.all() });
    },
  });
};

/**
 * Create a new draft regulation version from active version.
 */
export const useCreateRegulationDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (catalogId: string) => {
      const res = await clearanceApi.createRegulationDraft(catalogId);
      return res.data;
    },
    onSuccess: (version) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.regulations.all() });
      if (version?.id) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.regulations.version(version.id) });
      }
    },
  });
};

/**
 * Publish a draft regulation version (DRAFT -> PUBLISHED).
 */
export const usePublishRegulationVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await clearanceApi.publishRegulationVersion(versionId);
      return res.data;
    },
    onSuccess: (version) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.regulations.all() });
      if (version?.id) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.regulations.version(version.id) });
      }
    },
  });
};
