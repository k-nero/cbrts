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

/** One page of the review queue, oldest first. */
export const useReviewQueue = (page: number) =>
  useQuery({
    queryKey: queryKeys.staffRequests.queue(page),
    queryFn: () => getQueue(page),
    placeholderData: keepPreviousData,
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
      // Only the queue: the review was just set from the answer, so refetching it would be a wasted GET.
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.queues() });
    },
  });
};

/** The request's quotation, latest or one version; a 404 means it hasn't been started. */
export const useQuotation = (requestId: string | undefined, version?: number) =>
  useQuery({
    queryKey: queryKeys.staffRequests.quotation(requestId ?? '', version),
    queryFn: () => getQuotation(requestId as string, version),
    enabled: Boolean(requestId),
    retry: false,
  });

/** A quotation write: its answer becomes the builder's data, and the review reloads (status, quotation). */
const useQuotationWrite = <V>(write: (requestId: string, value: V) => Promise<QuotationDraft>) => {
  const qc = useQueryClient();
  return useMutation<QuotationDraft, unknown, { requestId: string; value: V }>({
    mutationFn: ({ requestId, value }) => write(requestId, value),
    onSuccess: (draft, { requestId }) => {
      // Every version's view can change (a revision supersedes, a discard brings the last one back).
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.quotations(requestId) });
      qc.setQueryData(queryKeys.staffRequests.quotation(requestId), draft);
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
    },
  });
};
