import client from '@/config/axios';

import type {
  PagedResponse,
  QuotationDraft,
  QueueRow,
  RequestReview,
  ServiceClass,
} from '@/interfaces';

const BASE = '/staff/requests';

/** The review queue, oldest first, 20 to a page (US-F1-03). The order is fixed by the server. */
export const getQueue = (page: number): Promise<PagedResponse<QueueRow>> =>
  client.get<PagedResponse<QueueRow>>(BASE, { params: { page } }).then((r) => r.data);

/** One request for review: its checks, versions, history and place in the queue. */
export const getReview = (id: string): Promise<RequestReview> =>
  client.get<RequestReview>(`${BASE}/${id}`).then((r) => r.data);

/** Return a request for missing information (US-F1-04): 400 NOTE_REQUIRED / NOTE_TOO_LONG, 409 REQUEST_NOT_IN_REVIEW. */
export const returnForInformation = (id: string, note: string): Promise<RequestReview> =>
  client.post<RequestReview>(`${BASE}/${id}/return`, { note }).then((r) => r.data);

/** The request's draft quotation (US-Q-01): 404 until it is started. */
export const getQuotation = (id: string): Promise<QuotationDraft> =>
  client.get<QuotationDraft>(`${BASE}/${id}/quotation`).then((r) => r.data);

/** Start the draft from the published rate catalog (201), or open the one already started (200). */
export const startQuotation = (id: string): Promise<QuotationDraft> =>
  client.post<QuotationDraft>(`${BASE}/${id}/quotation`).then((r) => r.data);

/** Price the draft with another air class, on the catalog version it pins. */
export const changeQuotationClass = (id: string, airClass: ServiceClass): Promise<QuotationDraft> =>
  client.put<QuotationDraft>(`${BASE}/${id}/quotation`, { airClass }).then((r) => r.data);

/** Re-price the draft on the latest published catalog. */
export const repriceQuotation = (id: string): Promise<QuotationDraft> =>
  client.post<QuotationDraft>(`${BASE}/${id}/quotation/reprice`).then((r) => r.data);
