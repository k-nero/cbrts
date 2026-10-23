import type { FC } from 'react';

import { useGeneratedVehicleColumn } from './useGeneratedColumn';

import Table from '@/components/table';
import type { UseCrudResourceResult } from '@/hooks/crud';
import type { CreateVehicleInput, Vehicle } from '@/interfaces';

type Props = {
  crud: UseCrudResourceResult<Vehicle, CreateVehicleInput>;
  onBook: (vehicle: Vehicle) => void;
};

/** The fleet, paged and sorted by the server (code, A to Z, until a header is clicked). */
const VehicleList: FC<Props> = ({ crud, onBook }) => {
  const { listQuery, pageState, setPageState } = crud;
  const columns = useGeneratedVehicleColumn({ onBook });
  return (
    <Table<Vehicle>
      id="vehicles"
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
          `${from}–${to} of ${total} ${total === 1 ? 'vehicle' : 'vehicles'}`,
      }}
      locale={{
        emptyText: 'No vehicles yet. Add the first trailer or truck to start planning loads.',
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

export default VehicleList;
