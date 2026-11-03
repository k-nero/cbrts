import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearanceApi } from '@/apis/clearance';
import { fileApi } from '@/apis/file';
import { queryKeys } from '@/constant/query';
import type {
  AuthorityKind,
  CatalogMoveRequest,
  CatalogUpdate,
  ChecklistItem,
  ClearanceStatus,
  CreateAuthoritySubmissionRequest,
  CreateQuarantinePeriodRequest,
  DocumentCheckRequest,
  DocumentCheckResponse,
  DocumentUploadRequest,
  DocumentVersion,
  DocumentReviewDetail,
  ClearanceJobSummary,
  ReviewDocumentRequest,
  UpdateAuthoritySubmissionRequest,
} from '@/interfaces';
import { ValidityEnum } from '@/interfaces';

/**
 * Open dossiers for the specialist's job picker, searched on the server by job code or club.
 * Returns the first page (20); typing narrows it.
 */
export const useClearanceJobs = (q: string) => {
  return useQuery({
    queryKey: queryKeys.clearance.jobs(q),
    queryFn: async (): Promise<ClearanceJobSummary[]> => {
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

/** US-F2-02: the customer's documents for one request, owed or not. */
export const useRequestChecklist = (requestId: string) =>
  useQuery({
    queryKey: queryKeys.clearance.requestChecklist(requestId),
    queryFn: async (): Promise<ChecklistItem[]> =>
      (await clearanceApi.getCustomerRequestChecklist(requestId)).data,
    enabled: Boolean(requestId),
  });

/** US-F2-03: every version of one of the customer's documents, newest first. */
export const useDocumentVersions = (checklistItemId: string) =>
  useQuery({
    queryKey: queryKeys.clearance.versions(checklistItemId),
    queryFn: async (): Promise<DocumentVersion[]> =>
      (await clearanceApi.getCustomerVersions(checklistItemId)).data,
    enabled: Boolean(checklistItemId),
  });

export type SubmitDocumentInput = DocumentCheckRequest & {
  checklistItemId: string;
  file: File;
  issuer?: string;
};

/**
 * US-F2-03: check the dates first, and only upload and attach the file when the check doesn't refuse it, so a
 * refused certificate is never stored. Attaching runs the same check again on the server.
 */
export const useSubmitCustomerDocument = (requestId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      checklistItemId,
      file,
      issuer,
      ...dates
    }: SubmitDocumentInput): Promise<DocumentCheckResponse> => {
      const check = (await clearanceApi.checkCustomerDocument(checklistItemId, dates)).data;
      if (check.validity === ValidityEnum.RED) return check;
      const stored = await fileApi.upload(file);
      await clearanceApi.uploadCustomerDocumentVersion(checklistItemId, {
        fileId: stored.id,
        ...dates,
        issuer: issuer || undefined,
      });
      return check;
    },
    onSuccess: (check, { checklistItemId }) => {
      if (check.validity === ValidityEnum.RED) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.clearance.requestChecklist(requestId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.clearance.versions(checklistItemId),
      });
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
 * US-F2-04 (issue #88): Details for reviewing one document version on its own screen.
 */
export const useDocumentReviewDetail = (versionId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.clearance.reviewDetail(versionId ?? ''),
    queryFn: async (): Promise<DocumentReviewDetail | null> => {
      if (!versionId || !versionId.trim()) return null;
      const res = await clearanceApi.getDocumentReviewDetail(versionId);
      return res.data;
    },
    enabled: Boolean(versionId && versionId.trim()),
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
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.pendingReviews() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.clearance.reviewDetail(variables.versionId),
      });
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
 * Auto-generate document checklist from route and pinned regulations (BR-F2-01).
 */
export const useGenerateChecklist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => clearanceApi.generateChecklist(jobId).then((r) => r.data),
    onSuccess: (_, jobId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.checklist(jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.status(jobId) });
    },
  });
};

/** Newer published versions of the job's pinned catalogs; the job stays on its pins until moved. */
export const useCatalogUpdates = (jobId: string) =>
  useQuery({
    queryKey: queryKeys.clearance.catalogUpdates(jobId),
    queryFn: async (): Promise<CatalogUpdate[]> =>
      (await clearanceApi.getCatalogUpdates(jobId)).data,
    enabled: Boolean(jobId),
  });

/** Moves the job onto a newer catalog version: its checklist, gate and pending updates all change. */
export const useMoveToCatalogVersion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: CatalogMoveRequest }) =>
      clearanceApi.moveToCatalogVersion(jobId, data).then((r) => r.data),
    onSuccess: (_, { jobId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.checklist(jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.status(jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.catalogUpdates(jobId) });
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
