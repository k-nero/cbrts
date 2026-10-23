import type { CrudListParams } from '@/apis/crudFactory';
import client from '@/config/axios';
import type { Notification, PagedResponse } from '@/interfaces';

export interface NotificationListParams extends CrudListParams {
  /** Only the ones not read yet. */
  unread?: boolean;
}

const BASE = '/me/notifications';

/** The signed-in user's own notifications (US-00-07); every role has them. */
export const notificationApi = {
  list: (params: NotificationListParams) =>
    client.get<PagedResponse<Notification>>(BASE, { params }).then((r) => r.data),
  unreadCount: () => client.get<{ count: number }>(`${BASE}/unread-count`).then((r) => r.data),
  markRead: (id: string) => client.post(`${BASE}/${id}/read`).then(() => undefined),
  markAllRead: () => client.post<{ updated: number }>(`${BASE}/read-all`).then((r) => r.data),
  /** Server-sent events; read with fetch (see useNotificationStream), since it needs the bearer token. */
  streamUrl: `/api/v1${BASE}/stream`,
};
