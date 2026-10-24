import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { reportApi } from '@/apis/report';
import type { RevenueReportParams } from '@/interfaces';

export const useRevenueReport = (params: RevenueReportParams) =>
  useQuery({
    queryKey: ['revenue-report', params],
    queryFn: () => reportApi.revenue(params),
    placeholderData: keepPreviousData,
  });
