import { FC } from 'react';
import type { UserInput } from '@/apis/user.ts';
import Table from '@/components/table';
import type { UseCrudResourceResult } from '@/hooks/crud.ts';
import { User } from '@/interfaces';
import { useGeneratedUserColumn } from '@/pages/staff/users/useGeneratedColumn.tsx';

type Props = {
  crud: UseCrudResourceResult<User, UserInput>;
  onEdit: (user: User) => void;
};

/** Sortable columns follow DESIGN.md, Tables: Name, then the others as their data arrives. */
const UserList: FC<Props> = ({ crud, onEdit }) => {
  const { listQuery, pageState, setPageState } = crud;
  const columns = useGeneratedUserColumn({ crud, onEdit });
  return (
    <Table<User>
      id="users"
      rowKey="id"
      columns={columns}
      dataSource={listQuery.data?.content ?? []}
      // Spinner until the first page arrives, and while a new page or sort loads.
      loading={listQuery.isPending || listQuery.isFetching}
      onRefresh={() => void listQuery.refetch()}
      refreshing={listQuery.isFetching && !listQuery.isPending}
      ignoreKeys={['actions']}
      // Controlled, so the header highlight follows the page's sort and "Reset order" clears it.
      sorter={
        pageState.sort ? { columnKey: pageState.sort.field, order: pageState.sort.order } : null
      }
      pagination={{
        current: pageState.number + 1,
        pageSize: pageState.size,
        total: listQuery.data?.totalElements ?? 0,
        showTotal: (total, [from, to]) =>
          `${from}–${to} of ${total} ${total === 1 ? 'account' : 'accounts'}`,
      }}
      locale={{ emptyText: 'No accounts match. Clear the search or the role filter.' }}
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

export default UserList;
