import { FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGeneratedNotificationColumn } from './useGeneratedColumn';

import Table from '@/components/table';
import type { UseCrudResourceResult } from '@/hooks/crud';
import { useMarkRead } from '@/hooks/notification';
import type { Notification } from '@/interfaces';

type Props = {
  crud: UseCrudResourceResult<Notification, never>;
  unreadOnly: boolean;
};

/** Newest first. A row opens its record and marks it read on the way. */
const NotificationList: FC<Props> = ({ crud, unreadOnly }) => {
  const navigate = useNavigate();
  const markRead = useMarkRead();
  const { listQuery, pageState, setPageState } = crud;
  const columns = useGeneratedNotificationColumn({
    onMarkRead: (n) => markRead.mutate(n.id),
    markingId: markRead.isPending ? markRead.variables : undefined,
  });

  return (
    <Table<Notification>
      id="notifications"
      rowKey="id"
      columns={columns}
      dataSource={listQuery.data?.content ?? []}
      loading={listQuery.isPending || listQuery.isFetching}
      onRefresh={() => void listQuery.refetch()}
      refreshing={listQuery.isFetching && !listQuery.isPending}
      ignoreKeys={['actions']}
      // Fixed widths; Notice takes the rest (the resize kit would shrink it to its minimum).
      resizableColumns={false}
      rowClassName={(n) => (n.readAt === null ? 'bg-raised' : '')}
      onRow={(n) => ({
        onClick: () => {
          if (n.readAt === null) markRead.mutate(n.id);
          navigate(n.linkPath);
        },
        className: 'cursor-pointer',
      })}
      pagination={{
        current: pageState.number + 1,
        pageSize: pageState.size,
        total: listQuery.data?.totalElements ?? 0,
        showTotal: (total, [from, to]) =>
          `${from}–${to} of ${total} ${total === 1 ? 'notification' : 'notifications'}`,
      }}
      locale={{
        emptyText: unreadOnly
          ? "You're all caught up. Open All to see what you've already read."
          : 'No notifications yet. Requests, quotations, documents and trip updates that need you show here.',
      }}
      onChange={(pagination) =>
        setPageState({
          number: (pagination.current ?? 1) - 1,
          size: pagination.pageSize ?? pageState.size,
        })
      }
    />
  );
};

export default NotificationList;
