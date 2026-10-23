import { useState } from 'react';
import { Flex } from 'antd';

import NotificationList from './NotificationList';

import PageHeader from '@/components/PageHeader';
import { Button, Tabs } from '@/components/ui';
import { useMarkAllRead, useNotifications, useUnreadCount } from '@/hooks/notification';
import { useAuthStore } from '@/stores/authStore';

type View = 'unread' | 'all';

/**
 * Notifications (US-00-07): everything that happened to the records this person works on, newest
 * first, in the owner portal and the staff shell alike. The bell's panel shows the newest few.
 */
const NotificationsPage = () => {
  const customer = useAuthStore((state) => state.roles.includes('CUSTOMER'));
  const count = useUnreadCount().data;
  const unreadCount = count ?? 0;
  // Until a tab is picked, open on Unread while something is unread and on All once nothing is.
  const [picked, setView] = useState<View>();
  const view = picked ?? (count === 0 ? 'all' : 'unread');
  const crud = useNotifications(view === 'unread');
  const markAllRead = useMarkAllRead();
  const { listQuery, setPageState } = crud;
  const total = listQuery.data?.totalElements;

  return (
    <Flex vertical gap={28}>
      <PageHeader
        title="Notifications"
        reserveBack={customer}
        summary={
          customer
            ? 'Updates on your requests, quotations, documents and trips, newest first. Open one to go to its record.'
            : 'Updates on the requests and jobs you work on, newest first. Open one to go to its record.'
        }
        right={
          <Button
            leadingIcon="check"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Mark all as read
          </Button>
        }
      />

      <Flex vertical gap={16}>
        <Tabs
          label="Notifications"
          activeKey={view}
          onChange={(key) => {
            setView(key);
            setPageState((p) => ({ ...p, number: 0 }));
          }}
          items={[
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'all', label: 'All' },
          ]}
        />

        <Flex gap={8} align="center" style={{ minHeight: 32 }}>
          <span className="type-label-s text-ink">
            {total === undefined
              ? 'Notifications'
              : `${total} ${view === 'unread' ? 'unread ' : ''}${total === 1 ? 'notification' : 'notifications'}`}
          </span>
          <span className="type-body-s text-ink-3">Order: newest first</span>
        </Flex>

        <NotificationList crud={crud} unreadOnly={view === 'unread'} />
      </Flex>
    </Flex>
  );
};

export default NotificationsPage;
