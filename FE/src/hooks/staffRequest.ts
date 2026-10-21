import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getQueue, getReview, returnForInformation } from '@/apis/staffRequest';
import { queryKeys } from '@/constant/query';
import type { RequestReview } from '@/interfaces';

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
