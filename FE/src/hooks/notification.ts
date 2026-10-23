import { useEffect, useMemo } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationApi } from '@/apis/notification';
import { queryKeys } from '@/constant/query';
import { useReadOnlyResource } from '@/hooks/crud';
import type { Notification } from '@/interfaces';
import { useAuthStore } from '@/stores/authStore';

/** How many rows the bell's panel shows; the rest are on the notifications page. */
export const PANEL_SIZE = 8;
/** How long a dropped stream waits before it reconnects. */
const RETRY_MS = 10_000;

const NOTIFICATIONS = queryKeys.notifications.all()[0];

/**
 * The bell's count. It lives in the shell, so a failed load hides the count instead of replacing
 * the page with the error boundary; the stream retries and refetches it.
 */
export const useUnreadCount = () =>
  useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: notificationApi.unreadCount,
    select: (data) => data.count,
    throwOnError: false,
  });

/** The newest few for the bell's panel. */
export const useNotificationPreview = (unread: boolean, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.notifications.preview(unread),
    queryFn: () => notificationApi.list({ unread, page: 0, size: PANEL_SIZE }),
    enabled,
  });

/** The notifications page: server-side paging, newest first, unread only or all. */
export const useNotifications = (unread: boolean) => {
  const extra = useMemo(() => (unread ? { unread: true } : undefined), [unread]);
  return useReadOnlyResource<Notification>(
    NOTIFICATIONS,
    notificationApi.list,
    { number: 0, size: 20 },
    extra,
  );
};

const useInvalidateNotifications = () => {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: queryKeys.notifications.all() });
};

export const useMarkRead = () => {
  const invalidate = useInvalidateNotifications();
  return useMutation({ mutationFn: notificationApi.markRead, onSuccess: invalidate });
};

export const useMarkAllRead = () => {
  const invalidate = useInvalidateNotifications();
  return useMutation({ mutationFn: notificationApi.markAllRead, onSuccess: invalidate });
};

/** Thrown to stop a stream for good; any other error makes it reconnect. */
class StreamStopped extends Error {}

/**
 * Keeps the bell live (US-00-07): one server-sent event stream per tab, and every `changed` event
 * refetches the notification queries. EventSource can't send the bearer token, so the stream is
 * read with fetch. A new access token restarts it; a reconnect refetches, in case a change was
 * missed while it was down. A hidden tab closes its stream and reopens it when shown again.
 */
export const useNotificationStream = () => {
  const qc = useQueryClient();
  const accessToken = useAuthStore((state) => state.tokens?.accessToken);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    const refetch = () => void qc.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    let opened = false;

    void fetchEventSource(notificationApi.streamUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
      async onopen(response) {
        if (response.ok) return;
        if (response.status === 401 || response.status === 403) {
          // An expired token: an API call refreshes it, and the new token restarts this effect.
          await notificationApi.unreadCount().catch(() => undefined);
          throw new StreamStopped();
        }
        throw new Error(`The notification stream answered ${response.status}.`);
      },
      onmessage(event) {
        if (event.event === 'changed' || (event.event === 'ready' && opened)) refetch();
        if (event.event === 'ready') opened = true;
      },
      onclose() {
        // The server ends a stream after 30 minutes; open the next one.
        throw new Error('The notification stream closed.');
      },
      onerror(error) {
        if (error instanceof StreamStopped) throw error;
        return RETRY_MS;
      },
    }).catch(() => undefined);

    return () => controller.abort();
  }, [accessToken, qc]);
};
