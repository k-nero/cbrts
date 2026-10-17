import type { AxiosError } from 'axios';

import type { CrudListParams } from './crudFactory';

import client from '@/config/axios';
import type { AuditActor, AuditEntry, PagedResponse } from '@/interfaces';

/** The audit log filters; `from` and `to` are inclusive ICT days (YYYY-MM-DD). */
export interface AuditFilters {
  actor?: string;
  action?: string;
  from?: string;
  to?: string;
}

export type AuditListParams = CrudListParams & AuditFilters;

const BASE = '/admin/audit-log';

/** The audit log (logistics manager only). Read-only: entries are never edited or deleted. */
export const auditApi = {
  list: (params: AuditListParams) =>
    client.get<PagedResponse<AuditEntry>>(BASE, { params }).then((r) => r.data),

  actors: () => client.get<AuditActor[]>(`${BASE}/actors`).then((r) => r.data),

  actions: () => client.get<string[]>(`${BASE}/actions`).then((r) => r.data),

  /**
   * The filtered entries as CSV; needs the access token, so it is fetched as a blob. A refusal
   * also arrives as a blob, so its ApiError is parsed back into the response for apiErrorMessage.
   */
  exportCsv: (params: Omit<AuditListParams, 'page' | 'size' | 'sort'>) =>
    client
      .get<Blob>(`${BASE}/export`, { params, responseType: 'blob' })
      .then((r) => r.data)
      .catch(async (error: AxiosError) => {
        const data = error.response?.data;
        if (error.response && data instanceof Blob) {
          try {
            error.response.data = JSON.parse(await data.text()) as unknown;
          } catch {
            // Not JSON: keep the transport error.
          }
        }
        throw error;
      }),
};
