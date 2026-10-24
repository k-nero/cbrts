import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { reportApi } from '@/apis/report';
import type { OnTimeReportParams, RevenueReportParams } from '@/interfaces';

export const useRevenueReport = (params: RevenueReportParams) =>
  useQuery({
    queryKey: ['revenue-report', params],
    queryFn: () => reportApi.revenue(params),
    placeholderData: keepPreviousData,
  });

export const useOnTimeReport = (params: OnTimeReportParams) =>
  useQuery({
    queryKey: ['on-time-report', params],
    queryFn: () => reportApi.onTime(params),
    placeholderData: keepPreviousData,
  });
