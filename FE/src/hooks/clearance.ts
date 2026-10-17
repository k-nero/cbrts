import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearanceApi } from '@/apis/clearance';
import type {
  AuthorityKind,
  CreateAuthoritySubmissionRequest,
  CreateQuarantinePeriodRequest,
  ReviewDocumentRequest,
  DocumentUploadRequest,
  UpdateAuthoritySubmissionRequest,
} from '@/interfaces';

export const clearanceKeys = {
  all: ['clearance'] as const,
  authorities: (params?: { countryCode?: string; kind?: AuthorityKind }) =>
    [...clearanceKeys.all, 'authorities', params] as const,
  submissions: (jobId: string) => [...clearanceKeys.all, 'submissions', jobId] as const,
  quarantines: (jobId: string) => [...clearanceKeys.all, 'quarantines', jobId] as const,
  checklist: (jobId: string) => [...clearanceKeys.all, 'checklist', jobId] as const,
  status: (jobId: string) => [...clearanceKeys.all, 'status', jobId] as const,
  pendingReviews: () => [...clearanceKeys.all, 'pendingReviews'] as const,
};

export const useAuthorities = (params?: { countryCode?: string; kind?: AuthorityKind }) => {
  return useQuery({
    queryKey: clearanceKeys.authorities(params),
    queryFn: async () => {
      const res = await clearanceApi.getAuthorities(params);
      return res.data;
    },
    staleTime: 60_000,
  });
};

export const useJobSubmissions = (jobId: string) => {
  return useQuery({
    queryKey: clearanceKeys.submissions(jobId),
    queryFn: async () => {
      const res = await clearanceApi.getSubmissionsByJob(jobId);
      return res.data;
    },
    enabled: Boolean(jobId),
  });
};

export const useCreateSubmission = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAuthoritySubmissionRequest) => {
      const res = await clearanceApi.createSubmission(jobId, data);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.submissions(jobId) });
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.status(jobId) });
    },
  });
};

export const useUpdateSubmission = (jobId: string) => {
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
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.submissions(jobId) });
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.status(jobId) });
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.checklist(jobId) });
    },
  });
};

export const useJobQuarantines = (jobId: string) => {
  return useQuery({
    queryKey: clearanceKeys.quarantines(jobId),
    queryFn: async () => {
      const res = await clearanceApi.getQuarantinesByJob(jobId);
      return res.data;
    },
    enabled: Boolean(jobId),
  });
};

export const useCreateQuarantine = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateQuarantinePeriodRequest) => {
      const res = await clearanceApi.createQuarantine(jobId, data);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.quarantines(jobId) });
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.status(jobId) });
    },
  });
};

export const useCompleteQuarantine = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quarantineId: string) => {
      const res = await clearanceApi.completeQuarantine(quarantineId);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.quarantines(jobId) });
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.status(jobId) });
    },
  });
};

export const useJobChecklist = (jobId: string) => {
  return useQuery({
    queryKey: clearanceKeys.checklist(jobId),
    queryFn: async () => {
      const res = await clearanceApi.getChecklist(jobId);
      return res.data;
    },
    enabled: Boolean(jobId),
  });
};

export const useClearanceStatus = (jobId: string) => {
  return useQuery({
    queryKey: clearanceKeys.status(jobId),
    queryFn: async () => {
      const res = await clearanceApi.getClearanceStatus(jobId);
      return res.data;
    },
    enabled: Boolean(jobId),
  });
};

export const useEvaluateClearanceGate = (jobId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await clearanceApi.evaluateClearanceGate(jobId);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.status(jobId) });
      void queryClient.invalidateQueries({ queryKey: clearanceKeys.checklist(jobId) });
    },
  });
};
