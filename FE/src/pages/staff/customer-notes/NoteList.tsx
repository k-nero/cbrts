import { type FC, useMemo } from 'react';
import { Flex, type TableColumnsType } from 'antd';

import { noteTime, replyDue } from './format';

import Table from '@/components/table';
import { Chip } from '@/components/ui';
import type { CustomerNote } from '@/interfaces';

type Props = {
  notes: CustomerNote[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  selectedId: string | null;
  onSelect: (note: CustomerNote) => void;
};

/**
 * Open notes, oldest first as the server sends them (DESIGN.md, Notes on a request): customer, job,
 * received time and reply due; the selected note is marked with an accent left rule.
 */
const NoteList: FC<Props> = ({ notes, loading, refreshing, onRefresh, selectedId, onSelect }) => {
  const columns = useMemo<TableColumnsType<CustomerNote>>(
    () => [
      {
        title: 'Customer',
        key: 'clubName',
        width: 180,
        render: (_, n) => (
          <Flex vertical gap={2}>
            <span className="type-label-s text-ink">{n.clubName}</span>
            <span className="type-caption text-ink-3">{n.jobCode ?? n.requestCode}</span>
          </Flex>
        ),
      },
      {
        title: 'Note',
        key: 'subject',
        render: (_, n) => (
          <Flex vertical gap={2}>
            <span className="type-body-s line-clamp-2 text-ink">{n.subject}</span>
            <span className="type-caption text-ink-3">{noteTime(n.createdAt)}</span>
          </Flex>
        ),
      },
      {
        title: 'Reply',
        key: 'replyDueAt',
        width: 140,
        render: (_, n) => {
          const due = replyDue(n);
          return <Chip tone={due.tone}>{due.text}</Chip>;
        },
      },
    ],
    [],
  );

  return (
    <Table<CustomerNote>
      id="customer-notes"
      rowKey="id"
      columns={columns}
      dataSource={notes}
      loading={loading}
      onRefresh={onRefresh}
      refreshing={refreshing}
      resizableColumns={false}
      pagination={false}
      rowClassName={(n) =>
        n.id === selectedId
          ? 'cursor-pointer *:bg-raised! *:first:border-l-3 *:first:border-l-gold'
          : 'cursor-pointer'
      }
      onRow={(n) => ({
        onClick: () => onSelect(n),
        onKeyDown: (e) => {
          if (e.key === 'Enter') onSelect(n);
        },
        tabIndex: 0,
        'aria-selected': n.id === selectedId,
      })}
      locale={{ emptyText: 'No customer notes waiting for you. New ones arrive here by topic.' }}
    />
  );
};

export default NoteList;
