import { type FC, useMemo } from 'react';
import { Flex, type TableColumnsType } from 'antd';

import { PLACE_KIND_LABEL } from './routeOptions';

import Table from '@/components/table';
import { Button, Chip } from '@/components/ui';
import type { usePlaceList } from '@/hooks/routeCatalog';
import type { Place, PlaceKind } from '@/interfaces';

type Props = {
  crud: ReturnType<typeof usePlaceList>;
  onEdit: (p: Place) => void;
  onDelete: (p: Place) => void;
};

/**
 * Routes · Places: every catalogued pickup, delivery and stop point, paged, searched and sorted by
 * the server (city, then name, until a header is clicked). A city is a route's end once it has one.
 */
const PlaceList: FC<Props> = ({ crud, onEdit, onDelete }) => {
  const { listQuery, pageState, setPageState } = crud;
  const columns = useMemo<TableColumnsType<Place>>(
    () => [
      {
        title: 'Place',
        key: 'name',
        dataIndex: 'name',
        width: 320,
        sorter: true,
        render: (_, p) => <span className="type-label-s text-ink">{p.name}</span>,
      },
      {
        title: 'Kind',
        key: 'kind',
        width: 180,
        render: (_, p) => <Chip>{PLACE_KIND_LABEL[p.kind as PlaceKind] ?? p.kind}</Chip>,
      },
      {
        title: 'City',
        key: 'city',
        dataIndex: 'city',
        width: 220,
        sorter: true,
        render: (_, p) => <span className="type-body-s text-ink">{p.city}</span>,
      },
      {
        title: 'Country',
        key: 'country',
        width: 220,
        render: (_, p) => (
          <Flex align="center" gap={8}>
            <span className="type-data text-ink">{p.countryCode}</span>
            <span className="type-body-s text-ink-3">{p.countryName}</span>
          </Flex>
        ),
      },
      {
        key: 'actions',
        width: 180,
        render: (_, p) => (
          <Flex gap={8}>
            <Button variant="ghost" size="sm" onClick={() => onEdit(p)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(p)}>
              Delete
            </Button>
          </Flex>
        ),
      },
    ],
    [onDelete, onEdit],
  );

  return (
    <Table<Place>
      id="places"
      rowKey="id"
      columns={columns}
      dataSource={listQuery.data?.content ?? []}
      loading={listQuery.isPending || listQuery.isFetching}
      onRefresh={() => void listQuery.refetch()}
      refreshing={listQuery.isFetching && !listQuery.isPending}
      ignoreKeys={['actions']}
      sorter={
        pageState.sort ? { columnKey: pageState.sort.field, order: pageState.sort.order } : null
      }
      pagination={{
        current: pageState.number + 1,
        pageSize: pageState.size,
        total: listQuery.data?.totalElements ?? 0,
        showTotal: (total, [from, to]) =>
          `${from}–${to} of ${total} ${total === 1 ? 'place' : 'places'}`,
      }}
      locale={{
        emptyText: crud.search
          ? `No place matches “${crud.search}”. Check the spelling, or clear the search.`
          : 'No places yet. Add the first stable, racecourse or airport a route can start or end at.',
      }}
      onChange={(pagination, _filters, sorter) => {
        const s = Array.isArray(sorter) ? sorter[0] : sorter;
        setPageState({
          number: (pagination.current ?? 1) - 1,
          size: pagination.pageSize ?? pageState.size,
          sort: s?.order ? { field: String(s.columnKey), order: s.order } : undefined,
        });
      }}
    />
  );
};

export default PlaceList;
