import type { TableColumnsType } from 'antd';
import { Flex } from 'antd';

import { eventLabels, formatTime, recordedByLine, sentence } from './tripFormat';

import Table from '@/components/table';
import { Chip, Panel } from '@/components/ui';
import type { TripPage, TripSummary } from '@/interfaces';
import { TripStatusEnum } from '@/interfaces';

const statusTone = (status: string) =>
  status === TripStatusEnum.DELIVERED ? 'ok' : status === TripStatusEnum.HELD ? 'bad' : 'info';

/** "Mộc Bài → Phnom Penh": from the last stop with a checkpoint to the next one on the route. */
const leg = (row: TripSummary) => {
  if (row.tripStatus === TripStatusEnum.NOT_STARTED) return 'Not departed';
  if (row.tripStatus === TripStatusEnum.DELIVERED) return 'Delivered';
  const from = row.progress?.legFrom ?? row.origin ?? 'Origin';
  const to = row.progress?.legTo ?? row.destination ?? 'Destination';
  return `${from} → ${to}`;
};

/**
 * The office board of active trips (US-F4-04): each with its current leg and last checkpoint, from
 * recorded checkpoints only. Opening a row shows that trip below.
 */
export function TripBoard({
  data,
  loading,
  selectedCode,
  onSelect,
  onPageChange,
}: {
  data: TripPage;
  loading: boolean;
  selectedCode: string;
  onSelect: (jobCode: string) => void;
  onPageChange: (page: number) => void;
}) {
  const columns: TableColumnsType<TripSummary> = [
    {
      key: 'job',
      title: 'Job',
      width: 170,
      render: (_, row) => (
        <Flex vertical gap={2}>
          <span className="type-data text-ink">{row.jobCode}</span>
          {row.progress?.tripCode && (
            <span className="type-caption font-mono text-ink-3">{row.progress.tripCode}</span>
          )}
        </Flex>
      ),
    },
    {
      key: 'route',
      title: 'Route',
      width: 220,
      render: (_, row) => (
        <span className="type-body-s text-ink-2">
          {row.origin ?? 'Origin'} → {row.destination ?? 'Destination'}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: 130,
      render: (_, row) => <Chip tone={statusTone(row.tripStatus)}>{sentence(row.tripStatus)}</Chip>,
    },
    {
      key: 'leg',
      title: 'Current leg',
      width: 240,
      render: (_, row) => <span className="type-body-s text-ink">{leg(row)}</span>,
    },
    {
      key: 'last',
      title: 'Last checkpoint',
      render: (_, row) => {
        const p = row.progress;
        if (!p?.lastKind) return <span className="type-body-s text-ink-3">None recorded</span>;
        return (
          <Flex vertical gap={2}>
            <span className="type-body-s text-ink">
              {eventLabels[p.lastKind]}
              {p.lastStop ? ` · ${p.lastStop}` : ''}
            </span>
            <span className="type-caption text-ink-3">
              {[formatTime(p.lastAt), recordedByLine(p.lastRecordedBy, p.lastChannel)]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </Flex>
        );
      },
    },
  ];

  return (
    <Panel title="Active trips" flush>
      <Table<TripSummary>
        id="trip-board"
        rowKey="jobCode"
        columns={columns}
        dataSource={data.content}
        loading={loading}
        showColumnSettings={false}
        resizableColumns={false}
        rowClassName={(row) =>
          `cursor-pointer ${row.jobCode === selectedCode ? '*:bg-muted!' : ''}`
        }
        onRow={(row) => ({
          onClick: () => onSelect(row.jobCode),
          onKeyDown: (e) => {
            if (e.key === 'Enter') onSelect(row.jobCode);
          },
          tabIndex: 0,
          'aria-selected': row.jobCode === selectedCode,
        })}
        pagination={{
          current: data.number + 1,
          pageSize: 20,
          total: data.totalElements,
          showSizeChanger: false,
          showTotal: (total, [from, to]) => `${from}–${to} of ${total} trips`,
          onChange: (page) => onPageChange(page - 1),
        }}
      />
    </Panel>
  );
}
