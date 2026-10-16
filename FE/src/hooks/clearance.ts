import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearanceApi } from '@/apis/clearance';
import { queryKeys } from '@/constant/query';
import type {
  ChecklistItem,
  ClearanceStatus,
  DocumentUploadRequest,
  DocumentVersion,
  JobSummary,
  ReviewDocumentRequest,
} from '@/interfaces';

/**
 * Active jobs list query for staff job picker dropdown (Finding 10 / AGENTS.md).
 */
export const useClearanceJobs = () => {
  return useQuery({
    queryKey: queryKeys.clearance.jobs(),
    queryFn: async (): Promise<JobSummary[]> => {
      const res = await clearanceApi.getActiveJobs();
      return res.data;
    },
  });
};

/**
 * Transport Specialist pending reviews inbox.
 * Uses TanStack Query with caching and invalidation (AGENTS.md).
 * Safely extracts items whether returned as a plain array or paginated content.
 */
export const usePendingReviews = () => {
  return useQuery({
    queryKey: queryKeys.clearance.pendingReviews(),
    queryFn: async (): Promise<DocumentVersion[]> => {
      const res = await clearanceApi.getPendingReviews();
      const raw = res.data;
      if (Array.isArray(raw)) {
        return raw;
      }
      if (raw && typeof raw === 'object' && 'content' in raw && Array.isArray((raw as { content: unknown }).content)) {
        return (raw as { content: DocumentVersion[] }).content;
      }
      return [];
    },
  });
};

/**
 * Job document checklist query.
 * Only enabled when a valid jobId is provided.
 */
export const useJobChecklist = (jobId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.clearance.checklist(jobId ?? ''),
    queryFn: async (): Promise<ChecklistItem[]> => {
      if (!jobId || !jobId.trim()) return [];
      const res = await clearanceApi.getChecklist(jobId);
      return res.data;
    },
    enabled: Boolean(jobId && jobId.trim()),
  });
};

/**
 * Job clearance gate evaluation status.
 * Only enabled when a valid jobId is provided.
 */
export const useClearanceStatus = (jobId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.clearance.status(jobId ?? ''),
    queryFn: async (): Promise<ClearanceStatus | null> => {
      if (!jobId || !jobId.trim()) return null;
      const res = await clearanceApi.getClearanceStatus(jobId);
      return res.data;
    },
    enabled: Boolean(jobId && jobId.trim()),
  });
};

/**
 * Review document version mutation (Approve / Reject).
 * Invalidates affected queries on success (AGENTS.md).
 */
export const useReviewDocument = (jobId?: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, data }: { versionId: string; data: ReviewDocumentRequest }) =>
      clearanceApi.reviewDocument(versionId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.pendingReviews() });
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.checklist(jobId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.status(jobId) });
      }
    },
  });
};

/**
 * Upload new document version mutation.
 */
export const useUploadDocumentVersion = (jobId?: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ checklistItemId, data }: { checklistItemId: string; data: DocumentUploadRequest }) =>
      clearanceApi.uploadDocumentVersion(checklistItemId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.pendingReviews() });
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.checklist(jobId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.status(jobId) });
      }
    },
  });
};

/**
 * Trigger clearance gate evaluation mutation.
 */
export const useEvaluateClearanceGate = (jobId?: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetJobId: string) => clearanceApi.evaluateClearanceGate(targetJobId),
    onSuccess: () => {
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.status(jobId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.checklist(jobId) });
      }
    },
  });
};
