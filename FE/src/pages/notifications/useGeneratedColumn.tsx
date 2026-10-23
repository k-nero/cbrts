import { useMemo } from 'react';
import { Flex, type TableColumnsType, Tooltip } from 'antd';

import {
  NOTIFICATION_KIND_LABEL,
  NOTIFICATION_TONE,
} from '@/components/notification/notificationFormat';
import { Button, Chip, cx } from '@/components/ui';
import type { Notification } from '@/interfaces';
import { formatDayTime, timeAgo } from '@/lib/utils';

type Props = {
  onMarkRead: (n: Notification) => void;
  /** The row being marked, so its button waits. */
  markingId?: string | undefined;
};

/** Notice, Kind, Record, Received and the row's "Mark as read". Newest first, not sortable. */
export const useGeneratedNotificationColumn = ({ onMarkRead, markingId }: Props) =>
  useMemo<TableColumnsType<Notification>>(() => {
    const now = new Date().toISOString();
    return [
      {
        title: 'Notice',
        key: 'title',
        render: (_, n) => {
          const unread = n.readAt === null;
          return (
            <Flex gap={12} align="start">
              <span
                aria-hidden
                className={cx(
                  'mt-1.5 size-2 shrink-0 rounded-full',
                  unread ? 'bg-ink' : 'bg-transparent',
                )}
              />
              <Flex vertical gap={4}>
                <span className={cx('type-label-m', unread ? 'text-ink' : 'text-ink-2')}>
                  {unread && <span className="sr-only">Unread: </span>}
                  {n.title}
                </span>
                {n.body && <span className="type-body-s text-ink-3">{n.body}</span>}
              </Flex>
            </Flex>
          );
        },
      },
      {
        title: 'Kind',
        key: 'kind',
        width: 190,
        render: (_, n) => (
          <Chip tone={NOTIFICATION_TONE[n.tone] ?? 'neutral'}>
            {NOTIFICATION_KIND_LABEL[n.kind] ?? n.kind}
          </Chip>
        ),
      },
      {
        title: 'Record',
        key: 'entityCode',
        width: 160,
        render: (_, n) => <span className="type-data text-ink">{n.entityCode}</span>,
      },
      {
        title: 'Received',
        key: 'createdAt',
        width: 150,
        render: (_, n) => (
          <Flex vertical gap={2}>
            <Tooltip title={formatDayTime(n.createdAt)}>
              <span className="type-data text-ink">{timeAgo(n.createdAt, now)}</span>
            </Tooltip>
            <span className="type-caption text-ink-3">{formatDayTime(n.createdAt)}</span>
          </Flex>
        ),
      },
      {
        key: 'actions',
        width: 168,
        align: 'right',
        render: (_, n) =>
          n.readAt === null ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={markingId === n.id}
              onClick={(e) => {
                // The row opens the record; this only marks it.
                e.stopPropagation();
                onMarkRead(n);
              }}
            >
              Mark as read
            </Button>
          ) : (
            <span className="type-caption text-ink-3">Read {formatDayTime(n.readAt)}</span>
          ),
      },
    ];
  }, [onMarkRead, markingId]);
