import type { AxiosError } from 'axios';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addLine,
  approveRequest,
  changeQuotationClass,
  discardRevision,
  editLine,
  getApprovalOptions,
  getQueue,
  getQuotation,
  getReview,
  issueQuotation,
  overrideLine,
  rejectRequest,
  removeLine,
  removeOverride,
  repriceQuotation,
  returnForInformation,
  reviseQuotation,
  startQuotation,
} from '@/apis/staffRequest';
import { queryKeys } from '@/constant/query';
import type {
  ManualLineInput,
  OverrideInput,
  QuotationDraft,
  RequestReview,
  ServiceClass,
} from '@/interfaces';

/** One page of the review queue, oldest first, refetched every minute so the ages keep moving. */
export const useReviewQueue = (page: number) =>
  useQuery({
    queryKey: queryKeys.staffRequests.queue(page),
    queryFn: () => getQueue(page),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

export const useRequestReview = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.staffRequests.one(id ?? ''),
    queryFn: () => getReview(id as string),
    enabled: Boolean(id),
    retry: false,
  });

/** Ask for information: the answer becomes the review's data, and the queue reloads without it. */
export const useReturnRequest = () => {
  const qc = useQueryClient();
  return useMutation<RequestReview, unknown, { id: string; note: string }>({
    mutationFn: ({ id, note }) => returnForInformation(id, note),
    onSuccess: (review, { id }) => {
      qc.setQueryData(queryKeys.staffRequests.one(id), review);
      // The queue and every other cached review: their positions moved. Not this review: it was just set
      // from the answer, so refetching it would be a wasted GET.
      void qc.invalidateQueries({
        queryKey: queryKeys.staffRequests.all(),
        predicate: (q) => q.queryKey[1] !== id,
      });
    },
  });
};

/** Who can be put on the job at approval; read only while a request waits for approval. */
export const useApprovalOptions = (enabled: boolean) =>
  useQuery({
    queryKey: [...queryKeys.staffRequests.all(), 'approval-options'],
    queryFn: getApprovalOptions,
    enabled,
  });

/** A decision that ends the review (approve, reject): the answer is the review, and every list reloads. */
const useDecision = <V>(write: (id: string, value: V) => Promise<RequestReview>) => {
  const qc = useQueryClient();
  return useMutation<RequestReview, unknown, { id: string; value: V }>({
    mutationFn: ({ id, value }) => write(id, value),
    onSuccess: (review, { id }) => {
      qc.setQueryData(queryKeys.staffRequests.one(id), review);
      void qc.invalidateQueries({
        queryKey: queryKeys.staffRequests.all(),
        predicate: (q) => q.queryKey[1] !== id,
      });
      // The jobs list (useCrudResource keys it under 'jobs') gains the new job.
      void qc.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

export const useApproveRequest = () =>
  useDecision<{ transportSpecialistId: string; coordinatorId: string }>(approveRequest);

export const useRejectRequest = () => useDecision<string>(rejectRequest);

/**
 * The request's quotation, the latest or one version. A 404 means none has been started: the builder offers
 * Start, so only other failures go to the error boundary.
 */
export const useQuotation = (requestId: string | undefined, version?: number) =>
  useQuery({
    queryKey: queryKeys.staffRequests.quotation(requestId ?? '', version),
    queryFn: () => getQuotation(requestId as string, version),
    enabled: Boolean(requestId),
    retry: false,
    throwOnError: (error, query) =>
      query.state.data === undefined && (error as AxiosError).response?.status !== 404,
  });

/**
 * The version on screen, sent with every draft write that isn't addressed by a line id: a write on a
 * version that moved on answers 409 QUOTATION_VERSION_CHANGED instead of landing on one nobody saw.
 */
type Shown = { version: number };

/** A quotation write: its answer becomes the builder's data, and the review reloads (status, quotation). */
const useQuotationWrite = <V, E = object>(
  write: (vars: { requestId: string; value: V } & E) => Promise<QuotationDraft>,
) => {
  const qc = useQueryClient();
  return useMutation<QuotationDraft, unknown, { requestId: string; value: V } & E>({
    mutationFn: write,
    onSuccess: (draft, { requestId }) => {
      const latest = queryKeys.staffRequests.quotation(requestId);
      qc.setQueryData(latest, draft);
      // Every other version's view can change (a revision supersedes, an issue moves the latest on). Not the
      // latest: it was just set from the answer, so refetching it would be a wasted GET.
      void qc.invalidateQueries({
        queryKey: queryKeys.staffRequests.quotations(requestId),
        predicate: (q) => q.queryKey[3] !== latest[3],
      });
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.one(requestId), exact: true });
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.queues() });
    },
  });
};

export const useStartQuotation = () =>
  useQuotationWrite<void>(({ requestId }) => startQuotation(requestId));

export const useChangeQuotationClass = () =>
  useQuotationWrite<ServiceClass, Shown>(({ requestId, value, version }) =>
    changeQuotationClass(requestId, value, version),
  );

export const useRepriceQuotation = () =>
  useQuotationWrite<void, Shown>(({ requestId, version }) => repriceQuotation(requestId, version));

export const useOverrideLine = () =>
  useQuotationWrite<{ lineId: string; body: OverrideInput }>(({ requestId, value }) =>
    overrideLine(requestId, value.lineId, value.body),
  );

export const useRemoveOverride = () =>
  useQuotationWrite<string>(({ requestId, value }) => removeOverride(requestId, value));

export const useAddLine = () =>
  useQuotationWrite<ManualLineInput, Shown>(({ requestId, value, version }) =>
    addLine(requestId, value, version),
  );

export const useEditLine = () =>
  useQuotationWrite<{ lineId: string; body: ManualLineInput }>(({ requestId, value }) =>
    editLine(requestId, value.lineId, value.body),
  );

export const useRemoveLine = () =>
  useQuotationWrite<string>(({ requestId, value }) => removeLine(requestId, value));

export const useIssueQuotation = () =>
  useQuotationWrite<string | null, Shown>(({ requestId, value, version }) =>
    issueQuotation(requestId, value, version),
  );

export const useReviseQuotation = () =>
  useQuotationWrite<void>(({ requestId }) => reviseQuotation(requestId));

/** Discard a revision: the latest version is the one it came from again, so every view reloads. */
export const useDiscardRevision = () => {
  const qc = useQueryClient();
  return useMutation<void, unknown, { requestId: string } & Shown>({
    mutationFn: ({ requestId, version }) => discardRevision(requestId, version),
    onSuccess: (_, { requestId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.quotations(requestId) });
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.one(requestId), exact: true });
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.queues() });
    },
  });
};
