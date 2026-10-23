import client from '@/config/axios';
import { makeCrudApi } from './crudFactory';

import type {
  CustomerQuotation,
  Estimate,
  PagedResponse,
  Place,
  RequestDraftInput,
  RequestSummary,
  Route,
  TransportRequest,
} from '@/interfaces';

const BASE = '/customer/requests';

/** The club's requests as list rows; also discards a draft (slice 2, /api/v1/customer/requests). */
export const requestListApi = makeCrudApi<RequestSummary, RequestDraftInput>(BASE);

/** One request: read, create a draft, replace a draft's fields. */
export const requestApi = makeCrudApi<TransportRequest, RequestDraftInput>(BASE);

/** Submit a draft: 409 SUBMISSION_BLOCKED with the blockers in `details` while any remain. */
export const submitRequest = (id: string): Promise<TransportRequest> =>
  client.post<TransportRequest>(`${BASE}/${id}/submit`).then((r) => r.data);

/** Pickup and delivery points whose name or city matches `q`. */
export const searchPlaces = (q: string): Promise<Place[]> =>
  client
    .get<PagedResponse<Place>>('/customer/places', { params: { q, size: 20 } })
    .then((r) => r.data.content);

/** The corridors we run between two places' cities; without `to`, those touching the origin's city. */
export const getRoutes = (from: string, to?: string): Promise<Route[]> =>
  client
    .get<Route[]>('/customer/routes', { params: to ? { from, to } : { from } })
    .then((r) => r.data);

/** The instant estimate for the wizard's current values; nothing is saved (US-Q-05). */
export const getEstimate = (input: RequestDraftInput): Promise<Estimate> =>
  client.post<Estimate>(`${BASE}/estimate`, input).then((r) => r.data);

/** The request's latest issued quotation (spec §6.1); 404 until one is issued. */
export const getCustomerQuotation = (id: string): Promise<CustomerQuotation> =>
  client.get<CustomerQuotation>(`${BASE}/${id}/quotation`).then((r) => r.data);

/** Accept the latest issued quotation before it expires (US-F1-06); the request becomes CUSTOMER_ACCEPTED. */
export const acceptQuotation = (id: string): Promise<CustomerQuotation> =>
  client.post<CustomerQuotation>(`${BASE}/${id}/quotation/accept`).then((r) => r.data);

/** Decline the latest issued quotation, with an optional reason; the request ends EXPIRED. */
export const declineQuotation = (id: string, reason: string | null): Promise<CustomerQuotation> =>
  client.post<CustomerQuotation>(`${BASE}/${id}/quotation/decline`, { reason }).then((r) => r.data);

/** Cancel a submitted request before approval; the fee band follows the days left (BR-F1-07). */
export const cancelRequest = (id: string): Promise<TransportRequest> =>
  client.post<TransportRequest>(`${BASE}/${id}/cancel`).then((r) => r.data);
