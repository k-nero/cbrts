import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  changeQuotationClass,
  getQueue,
  getQuotation,
  getReview,
  repriceQuotation,
  returnForInformation,
  startQuotation,
} from '@/apis/staffRequest';
import { queryKeys } from '@/constant/query';
import type { QuotationDraft, RequestReview, ServiceClass } from '@/interfaces';

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

/** The request's draft quotation; a 404 means it hasn't been started. */
export const useQuotation = (requestId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.staffRequests.quotation(requestId ?? ''),
    queryFn: () => getQuotation(requestId as string),
    enabled: Boolean(requestId),
    retry: false,
  });

/** A quotation write: its answer becomes the builder's data, and the review reloads (status, quotation). */
const useQuotationWrite = <V>(write: (requestId: string, value: V) => Promise<QuotationDraft>) => {
  const qc = useQueryClient();
  return useMutation<QuotationDraft, unknown, { requestId: string; value: V }>({
    mutationFn: ({ requestId, value }) => write(requestId, value),
    onSuccess: (draft, { requestId }) => {
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
