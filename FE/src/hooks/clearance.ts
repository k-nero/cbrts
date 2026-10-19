import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearanceApi } from '@/apis/clearance';
import { queryKeys } from '@/constant/query';
import type {
  AuthorityKind,
  ChecklistItem,
  ClearanceStatus,
  CreateAuthoritySubmissionRequest,
  CreateQuarantinePeriodRequest,
  DocumentUploadRequest,
  DocumentVersion,
  JobSummary,
  ReviewDocumentRequest,
  UpdateAuthoritySubmissionRequest,
} from '@/interfaces';

/**
 * Open dossiers for the specialist's job picker, searched on the server by job code or club.
 * Returns the first page (20); typing narrows it.
 */
export const useClearanceJobs = (q: string) => {
  return useQuery({
    queryKey: queryKeys.clearance.jobs(q),
    queryFn: async (): Promise<JobSummary[]> => {
      const res = await clearanceApi.getActiveJobs(q);
      return res.data.content;
    },
    placeholderData: (previous) => previous,
  });
};

/**
 * Transport Specialist pending reviews inbox.
 * Uses TanStack Query with caching and invalidation.
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
      if (
        raw &&
        typeof raw === 'object' &&
        'content' in raw &&
        Array.isArray((raw as { content: unknown }).content)
      ) {
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
 * Invalidates affected queries on success.
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
    mutationFn: ({
      checklistItemId,
      data,
    }: {
      checklistItemId: string;
      data: DocumentUploadRequest;
    }) => clearanceApi.uploadDocumentVersion(checklistItemId, data),
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
    mutationFn: (targetJobId?: string) => {
      const idToEvaluate = targetJobId ?? jobId;
      if (!idToEvaluate) throw new Error('No jobId provided to evaluate clearance gate');
      return clearanceApi.evaluateClearanceGate(idToEvaluate);
    },
    onSuccess: () => {
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.status(jobId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.checklist(jobId) });
      }
    },
  });
};

/**
 * Recognised authorities list.
 */
export const useAuthorities = (params?: { countryCode?: string; kind?: AuthorityKind }) => {
  return useQuery({
    queryKey: queryKeys.clearance.authorities(),
    queryFn: async () => {
      const res = await clearanceApi.getAuthorities(params);
      return res.data;
    },
    staleTime: 60_000,
  });
};

/**
 * Submissions filed with authorities for a specific job.
 */
export const useJobSubmissions = (jobId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.clearance.submissions(jobId ?? ''),
    queryFn: async () => {
      if (!jobId || !jobId.trim()) return [];
      const res = await clearanceApi.getSubmissionsByJob(jobId);
      return res.data;
    },
    enabled: Boolean(jobId && jobId.trim()),
  });
};

/**
 * File new authority submission mutation.
 */
export const useCreateSubmission = (jobId: string | null | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAuthoritySubmissionRequest) => {
      if (!jobId) throw new Error('No jobId provided for submission');
      const res = await clearanceApi.createSubmission(jobId, data);
      return res.data;
    },
    onSuccess: () => {
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.submissions(jobId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.status(jobId) });
      }
    },
  });
};

/**
 * Update authority submission status mutation.
 */
export const useUpdateSubmission = (jobId: string | null | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submissionId,
      data,
    }: {
      submissionId: string;
      data: UpdateAuthoritySubmissionRequest;
    }) => {
      const res = await clearanceApi.updateSubmission(submissionId, data);
      return res.data;
    },
    onSuccess: () => {
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.submissions(jobId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.status(jobId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.checklist(jobId) });
      }
    },
  });
};

/**
 * Quarantine periods list for a job.
 */
export const useQuarantineFacilities = () => {
  return useQuery({
    queryKey: ['clearance', 'quarantine-facilities'],
    queryFn: async () => {
      const res = await clearanceApi.getQuarantineFacilities();
      return res.data;
    },
  });
};

export const useJobQuarantines = (jobId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.clearance.quarantines(jobId ?? ''),
    queryFn: async () => {
      if (!jobId || !jobId.trim()) return [];
      const res = await clearanceApi.getQuarantinesByJob(jobId);
      return res.data;
    },
    enabled: Boolean(jobId && jobId.trim()),
  });
};

/**
 * Create quarantine period mutation.
 */
export const useCreateQuarantine = (jobId: string | null | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateQuarantinePeriodRequest) => {
      if (!jobId) throw new Error('No jobId provided for quarantine');
      const res = await clearanceApi.createQuarantine(jobId, data);
      return res.data;
    },
    onSuccess: () => {
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.quarantines(jobId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.status(jobId) });
      }
    },
  });
};

/**
 * Complete quarantine inspection mutation.
 */
export const useCompleteQuarantine = (jobId: string | null | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quarantineId: string) => {
      const res = await clearanceApi.completeQuarantine(quarantineId);
      return res.data;
    },
    onSuccess: () => {
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.quarantines(jobId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.status(jobId) });
      }
    },
  });
};
