import client from '@/config/axios';
import type { Overview, PagedResponse, QuoteOut } from '@/interfaces';

export const overviewApi = {
  /** US-R-01: what needs the logistics manager's attention. */
  get: () => client.get<Overview>('/staff/overview').then((r) => r.data),

  /** Requests · Quotes out: issued quotations waiting for the customer, soonest to expire first. */
  quotesOut: (page: number) =>
    client
      .get<PagedResponse<QuoteOut>>('/staff/requests/quotes-out', { params: { page, size: 20 } })
      .then((r) => r.data),
};
