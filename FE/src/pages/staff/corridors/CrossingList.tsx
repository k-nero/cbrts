import { type FC, useMemo } from 'react';
import { Flex, type TableColumnsType } from 'antd';

import Table from '@/components/table';
import { Button, Chip } from '@/components/ui';
import type { useBorderCrossings } from '@/hooks/useJob';
import type { BorderCrossing } from '@/interfaces';

type Props = {
  crossings: ReturnType<typeof useBorderCrossings>;
  onEdit: (c: BorderCrossing) => void;
  onDelete: (c: BorderCrossing) => void;
};

/** Routes · Border crossings: every catalogued crossing, the two countries it joins, and whether it is road only. */
const CrossingList: FC<Props> = ({ crossings, onEdit, onDelete }) => {
  const columns = useMemo<TableColumnsType<BorderCrossing>>(
    () => [
      {
        title: 'Border crossing',
        key: 'name',
        dataIndex: 'name',
        width: 340,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (_, c) => <span className="type-label-s text-ink">{c.name}</span>,
      },
      {
        title: 'Joins',
        key: 'countries',
        width: 220,
        sorter: (a, b) =>
          `${a.fromCountry}${a.toCountry}`.localeCompare(`${b.fromCountry}${b.toCountry}`),
        render: (_, c) => (
          <Flex align="center" gap={6}>
            <span className="type-data text-ink">{c.fromCountry}</span>
            <span className="type-body-s text-ink-3">–</span>
            <span className="type-data text-ink">{c.toCountry}</span>
          </Flex>
        ),
      },
      {
        title: 'Traffic',
        key: 'roadOnly',
        width: 160,
        render: (_, c) =>
          c.roadOnly ? <Chip>Road only</Chip> : <span className="type-body-s text-ink-3">Any</span>,
      },
      {
        key: 'actions',
        width: 180,
        render: (_, c) => (
          <Flex gap={8}>
            <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(c)}>
              Delete
            </Button>
          </Flex>
        ),
      },
    ],
    [onDelete, onEdit],
  );

  return (
    <Table<BorderCrossing>
      id="border-crossings"
      rowKey="id"
      columns={columns}
      dataSource={crossings.data ?? []}
      loading={crossings.isPending || crossings.isFetching}
      onRefresh={() => void crossings.refetch()}
      refreshing={crossings.isFetching && !crossings.isPending}
      ignoreKeys={['actions']}
      pagination={{
        pageSize: 20,
        showTotal: (total, [from, to]) =>
          `${from}–${to} of ${total} ${total === 1 ? 'border crossing' : 'border crossings'}`,
      }}
      locale={{
        emptyText: 'No border crossings yet. Add one before a route can leave the country.',
      }}
    />
  );
};

export default CrossingList;
