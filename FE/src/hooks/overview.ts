import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { overviewApi } from '@/apis/overview';

/** The Overview refreshes every minute, as the review queue does. */
export const useOverview = () =>
  useQuery({ queryKey: ['overview'], queryFn: overviewApi.get, refetchInterval: 60_000 });

export const useQuotesOut = (page: number) =>
  useQuery({
    queryKey: ['quotes-out', page],
    queryFn: () => overviewApi.quotesOut(page),
    placeholderData: keepPreviousData,
  });
