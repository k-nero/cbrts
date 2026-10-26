import type { FC } from 'react';

import { useGeneratedCorridorColumn } from './useGeneratedColumn';

import Table from '@/components/table';
import type { useCorridorList } from '@/hooks/routeCatalog';
import type { Corridor } from '@/interfaces';

type Props = { crud: ReturnType<typeof useCorridorList> };

/** The routes we run, paged and sorted by the server (code, A to Z, until a header is clicked). */
const CorridorList: FC<Props> = ({ crud }) => {
  const { listQuery, pageState, setPageState } = crud;
  const columns = useGeneratedCorridorColumn();
  return (
    <Table<Corridor>
      id="corridors"
      rowKey="id"
      columns={columns}
      dataSource={listQuery.data?.content ?? []}
      loading={listQuery.isPending || listQuery.isFetching}
      onRefresh={() => void listQuery.refetch()}
      refreshing={listQuery.isFetching && !listQuery.isPending}
      sorter={
        pageState.sort ? { columnKey: pageState.sort.field, order: pageState.sort.order } : null
      }
      pagination={{
        current: pageState.number + 1,
        pageSize: pageState.size,
        total: listQuery.data?.totalElements ?? 0,
        showTotal: (total, [from, to]) =>
          `${from}–${to} of ${total} ${total === 1 ? 'route' : 'routes'}`,
      }}
      locale={{ emptyText: 'No routes yet. Add the first route we run.' }}
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

export default CorridorList;
