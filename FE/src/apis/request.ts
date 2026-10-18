import client from '@/config/axios';
import { makeCrudApi } from './crudFactory';

import type {
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
