import client from '@/config/axios';

import type {
  ApprovalOptions,
  ManualLineInput,
  OverrideInput,
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

/** Who can be put on a job at approval (US-F1-07). */
export const getApprovalOptions = (): Promise<ApprovalOptions> =>
  client.get<ApprovalOptions>(`${BASE}/approval-options`).then((r) => r.data);

/** Approve an accepted request into its job, with its team (US-F1-07). */
export const approveRequest = (
  id: string,
  team: { transportSpecialistId: string; coordinatorId: string },
): Promise<RequestReview> =>
  client.post<RequestReview>(`${BASE}/${id}/approve`, team).then((r) => r.data);

/** Reject a request before approval, with the reason the customer reads (BR-F1-04). */
export const rejectRequest = (id: string, reason: string): Promise<RequestReview> =>
  client.post<RequestReview>(`${BASE}/${id}/reject`, { reason }).then((r) => r.data);

/** The request's quotation (US-Q-01): the latest version, or one version; 404 until it is started. */
export const getQuotation = (id: string, version?: number): Promise<QuotationDraft> =>
  client
    .get<QuotationDraft>(`${BASE}/${id}/quotation`, { params: version ? { version } : undefined })
    .then((r) => r.data);

/** Start the draft from the published rate catalog (201), or open the one already started (200). */
export const startQuotation = (id: string): Promise<QuotationDraft> =>
  client.post<QuotationDraft>(`${BASE}/${id}/quotation`).then((r) => r.data);

/**
 * Price the draft with another air class, on the catalog version it pins. `version` is the version
 * on screen: 409 QUOTATION_VERSION_CHANGED when it is no longer the latest draft (so on every write
 * below that takes it).
 */
export const changeQuotationClass = (
  id: string,
  airClass: ServiceClass,
  version: number,
): Promise<QuotationDraft> =>
  client
    .put<QuotationDraft>(`${BASE}/${id}/quotation`, { airClass }, { params: { version } })
    .then((r) => r.data);

/** Re-price the draft on the latest published catalog. */
export const repriceQuotation = (id: string, version: number): Promise<QuotationDraft> =>
  client
    .post<QuotationDraft>(`${BASE}/${id}/quotation/reprice`, undefined, { params: { version } })
    .then((r) => r.data);

/** Override a priced line's amount with a reason (US-Q-02); the totals are worked out again. */
export const overrideLine = (
  id: string,
  lineId: string,
  body: OverrideInput,
): Promise<QuotationDraft> =>
  client
    .put<QuotationDraft>(`${BASE}/${id}/quotation/lines/${lineId}/override`, body)
    .then((r) => r.data);

/** Put a line back to its catalog amount. */
export const removeOverride = (id: string, lineId: string): Promise<QuotationDraft> =>
  client
    .delete<QuotationDraft>(`${BASE}/${id}/quotation/lines/${lineId}/override`)
    .then((r) => r.data);

/** Add a line the catalog doesn't know (US-F1-05). */
export const addLine = (
  id: string,
  body: ManualLineInput,
  version: number,
): Promise<QuotationDraft> =>
  client
    .post<QuotationDraft>(`${BASE}/${id}/quotation/lines`, body, { params: { version } })
    .then((r) => r.data);

/** Change a line the manager added; a catalog line answers 409 NOT_A_MANUAL_LINE. */
export const editLine = (
  id: string,
  lineId: string,
  body: ManualLineInput,
): Promise<QuotationDraft> =>
  client.put<QuotationDraft>(`${BASE}/${id}/quotation/lines/${lineId}`, body).then((r) => r.data);

/** Remove a line the manager added. */
export const removeLine = (id: string, lineId: string): Promise<QuotationDraft> =>
  client.delete<QuotationDraft>(`${BASE}/${id}/quotation/lines/${lineId}`).then((r) => r.data);

/** Issue the draft: 409 QUOTATION_NOT_READY lists what blocks it in details; from v2 a change note is required. */
export const issueQuotation = (
  id: string,
  changeNote: string | null,
  version: number,
): Promise<QuotationDraft> =>
  client
    .post<QuotationDraft>(`${BASE}/${id}/quotation/issue`, { changeNote }, { params: { version } })
    .then((r) => r.data);

/** Draft the next version from the latest issued or expired one (201). */
export const reviseQuotation = (id: string): Promise<QuotationDraft> =>
  client.post<QuotationDraft>(`${BASE}/${id}/quotation/revise`).then((r) => r.data);

/** Discard a revision's draft (204); the version it came from stands. */
export const discardRevision = (id: string, version: number): Promise<void> =>
  client.delete(`${BASE}/${id}/quotation/draft`, { params: { version } }).then(() => undefined);
