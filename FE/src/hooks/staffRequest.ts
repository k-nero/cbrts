import type { AxiosError } from 'axios';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addLine,
  changeQuotationClass,
  discardRevision,
  editLine,
  getQueue,
  getQuotation,
  getReview,
  issueQuotation,
  overrideLine,
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

/** A quotation write: its answer becomes the builder's data, and the review reloads (status, quotation). */
const useQuotationWrite = <V>(write: (requestId: string, value: V) => Promise<QuotationDraft>) => {
  const qc = useQueryClient();
  return useMutation<QuotationDraft, unknown, { requestId: string; value: V }>({
    mutationFn: ({ requestId, value }) => write(requestId, value),
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

export const useStartQuotation = () => useQuotationWrite<void>((id) => startQuotation(id));

export const useChangeQuotationClass = () =>
  useQuotationWrite<ServiceClass>((id, airClass) => changeQuotationClass(id, airClass));

export const useRepriceQuotation = () => useQuotationWrite<void>((id) => repriceQuotation(id));

export const useOverrideLine = () =>
  useQuotationWrite<{ lineId: string; body: OverrideInput }>((id, v) =>
    overrideLine(id, v.lineId, v.body),
  );

export const useRemoveOverride = () =>
  useQuotationWrite<string>((id, lineId) => removeOverride(id, lineId));

export const useAddLine = () => useQuotationWrite<ManualLineInput>((id, body) => addLine(id, body));

export const useEditLine = () =>
  useQuotationWrite<{ lineId: string; body: ManualLineInput }>((id, v) =>
    editLine(id, v.lineId, v.body),
  );

export const useRemoveLine = () =>
  useQuotationWrite<string>((id, lineId) => removeLine(id, lineId));

export const useIssueQuotation = () =>
  useQuotationWrite<string | null>((id, changeNote) => issueQuotation(id, changeNote));

export const useReviseQuotation = () => useQuotationWrite<void>((id) => reviseQuotation(id));

/** Discard a revision: the latest version is the one it came from again, so every view reloads. */
export const useDiscardRevision = () => {
  const qc = useQueryClient();
  return useMutation<void, unknown, { requestId: string }>({
    mutationFn: ({ requestId }) => discardRevision(requestId),
    onSuccess: (_, { requestId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.quotations(requestId) });
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.one(requestId), exact: true });
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.queues() });
    },
  });
};
