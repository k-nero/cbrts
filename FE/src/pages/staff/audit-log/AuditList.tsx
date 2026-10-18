import { FC, useMemo } from 'react';
import type { TableColumnsType } from 'antd';

import { fromLabel, recordedLabel, roleLabel } from './format';

import Table from '@/components/table';
import { Chip, Icon } from '@/components/ui';
import type { UseCrudResourceResult } from '@/hooks/crud';
import type { AuditEntry } from '@/interfaces';
import { formatTime, ict } from '@/lib';

type Props = {
  crud: UseCrudResourceResult<AuditEntry, never>;
  selectedId: string | null;
  onSelect: (entry: AuditEntry) => void;
  /** The No results / empty state, drawn under the header. */
  empty: React.ReactNode;
};

/**
 * Newest first is the When column sorted descending, its only sortable column (DESIGN.md,
 * Tables). With an entry open the table drops On and From, which the entry repeats.
 */
const AuditList: FC<Props> = ({ crud, selectedId, onSelect, empty }) => {
  const { listQuery, pageState, setPageState } = crud;
  const open = selectedId !== null;

  const columns = useMemo<TableColumnsType<AuditEntry>>(() => {
    const all: TableColumnsType<AuditEntry> = [
      {
        title: 'When',
        key: 'occurredAt',
        dataIndex: 'occurredAt',
        width: 104,
        sorter: true,
        render: (v: string) => (
          <div className="flex flex-col gap-0.5">
            <span className="type-data text-ink">{formatTime(v)}</span>
            <span className="type-caption text-ink-3">{ict(v).format('D MMM')}</span>
          </div>
        ),
      },
      {
        title: 'Who',
        key: 'actorLabel',
        width: open ? 180 : 210,
        render: (_, r) => (
          <div className="flex flex-col gap-0.5">
            <span className={`type-label-s ${r.actorId ? 'text-ink' : 'text-ink-2'}`}>
              {r.actorLabel}
            </span>
            <span className="type-body-s text-ink-3">{roleLabel(r.actorRole)}</span>
          </div>
        ),
      },
      {
        title: 'Action',
        key: 'summary',
        dataIndex: 'summary',
        render: (v: string) => <span className="type-body-s text-ink">{v}</span>,
      },
      {
        title: 'On',
        key: 'entityCode',
        dataIndex: 'entityCode',
        width: 150,
        render: (v: string | null) => <span className="type-caption text-ink">{v ?? '—'}</span>,
      },
      {
        title: 'From',
        key: 'channel',
        width: 132,
        render: (_, r) => {
          const recorded = recordedLabel(r);
          return (
            <div className="flex flex-col items-start gap-1">
              <Chip dot={false}>{fromLabel(r)}</Chip>
              {recorded && <span className="type-body-s text-ink-3">{recorded}</span>}
            </div>
          );
        },
      },
      {
        key: 'open',
        width: 40,
        render: () => <Icon name="arrow-right" size={14} className="text-ink-3" />,
      },
    ];
    return open ? all.filter((c) => c.key !== 'entityCode' && c.key !== 'channel') : all;
  }, [open]);

  return (
    <Table<AuditEntry>
      id={open ? 'audit-log-open' : 'audit-log'}
      rowKey="id"
      columns={columns}
      dataSource={listQuery.data?.content ?? []}
      loading={listQuery.isPending || listQuery.isFetching}
      ignoreKeys={['open']}
      // Fixed widths from the frame; Action takes the rest (the resize kit would give it to From).
      resizableColumns={false}
      sorter={{
        columnKey: 'occurredAt',
        order: pageState.sort?.order ?? 'descend',
      }}
      rowClassName={(r) => `cursor-pointer ${r.id === selectedId ? '*:bg-muted!' : ''}`}
      onRow={(r) => ({
        onClick: () => onSelect(r),
        onKeyDown: (e) => {
          if (e.key === 'Enter') onSelect(r);
        },
        tabIndex: 0,
        'aria-selected': r.id === selectedId,
      })}
      pagination={{
        current: pageState.number + 1,
        pageSize: pageState.size,
        total: listQuery.data?.totalElements ?? 0,
        showSizeChanger: false,
        showTotal: (total, [from, to]) => `${from}–${to} of ${total} entries`,
      }}
      locale={{ emptyText: empty }}
      onChange={(pagination, _filters, sorter) => {
        const s = Array.isArray(sorter) ? sorter[0] : sorter;
        setPageState({
          number: (pagination.current ?? 1) - 1,
          size: pageState.size,
          sort: s?.order ? { field: 'occurredAt', order: s.order } : undefined,
        });
      }}
    />
  );
};

export default AuditList;
