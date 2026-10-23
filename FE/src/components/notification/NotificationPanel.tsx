import { FC, useState } from 'react';
import { Flex, Skeleton } from 'antd';

import { NOTIFICATION_KIND_LABEL, NOTIFICATION_TONE } from './notificationFormat';

import { Button, Icon, NotificationItem, Tabs } from '@/components/ui';
import { useMarkAllRead, useMarkRead, useNotificationPreview } from '@/hooks/notification';
import { formatDayTime, timeAgo } from '@/lib/utils';

type View = 'unread' | 'all';

type Props = {
  unreadCount: number;
  /** Opens the full notifications page. */
  onSeeAll: () => void;
  /** Closes the panel, after a row is opened. */
  onClose: () => void;
};

/**
 * The bell's panel (DESIGN.md, Notification centre): the newest few, Unread or All, each a link to
 * its record, with "Mark all as read" in the head and the full page in the foot.
 */
const NotificationPanel: FC<Props> = ({ unreadCount, onSeeAll, onClose }) => {
  // It opens on Unread when something is waiting, otherwise on All.
  const [view, setView] = useState<View>(unreadCount > 0 ? 'unread' : 'all');
  const query = useNotificationPreview(view === 'unread', true);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const rows = query.data?.content ?? [];
  const now = new Date().toISOString();

  return (
    <Flex vertical style={{ width: 400 }}>
      <div className="px-4 pt-4">
        <Flex justify="space-between" align="center" gap={12}>
          <h2 className="type-h4 m-0 text-ink">Notifications</h2>
          <Button
            variant="ghost"
            size="sm"
            leadingIcon="check"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Mark all as read
          </Button>
        </Flex>
        <Tabs
          label="Notifications"
          activeKey={view}
          onChange={setView}
          items={[
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'all', label: 'All' },
          ]}
        />
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 440 }}>
        {query.isPending ? (
          <div className="p-4">
            <Skeleton active paragraph={{ rows: 4 }} title={false} />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10">
            <Flex vertical align="center" gap={8} className="text-center">
              <span className="text-ink-3">
                <Icon name="bell" size={20} />
              </span>
              <span className="type-label-m text-ink">
                {view === 'unread' ? "You're all caught up" : 'No notifications yet'}
              </span>
              <span className="type-body-s text-ink-3">
                Requests, quotations, documents and trip updates that need you show here.
              </span>
            </Flex>
          </div>
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {rows.map((n) => (
              <NotificationItem
                key={n.id}
                title={n.title}
                body={n.body}
                kindLabel={NOTIFICATION_KIND_LABEL[n.kind] ?? n.kind}
                tone={NOTIFICATION_TONE[n.tone] ?? 'neutral'}
                code={n.entityCode}
                when={timeAgo(n.createdAt, now)}
                whenExact={formatDayTime(n.createdAt)}
                unread={n.readAt === null}
                to={n.linkPath}
                onOpen={() => {
                  if (n.readAt === null) markRead.mutate(n.id);
                  onClose();
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line p-2">
        <Button variant="ghost" size="sm" block onClick={onSeeAll}>
          See all notifications
        </Button>
      </div>
    </Flex>
  );
};

export default NotificationPanel;
