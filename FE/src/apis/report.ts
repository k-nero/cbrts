import client from '@/config/axios';
import type { RevenueReport, RevenueReportParams } from '@/interfaces';

export const reportApi = {
  /** US-R-02: revenue and direct cost by month and corridor. */
  revenue: (params: RevenueReportParams) =>
    client.get<RevenueReport>('/staff/reports/revenue', { params }).then((r) => r.data),

  /** The same report's job rows as a CSV file. */
  revenueCsv: (params: RevenueReportParams) =>
    client
      .get<Blob>('/staff/reports/revenue.csv', { params, responseType: 'blob' })
      .then((r) => r.data),
};
