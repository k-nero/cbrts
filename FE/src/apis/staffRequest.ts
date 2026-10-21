import client from '@/config/axios';

import type { PagedResponse, QueueRow, RequestReview } from '@/interfaces';

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
