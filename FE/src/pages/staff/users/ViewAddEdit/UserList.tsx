import { FC, useMemo } from 'react';
import type { TableColumnsType } from 'antd';
import { App, Tag } from 'antd';
import dayjs from 'dayjs';

import type { UserInput } from '@/apis/user';
import Table from '@/components/table';
import TableActionDropdown from '@/components/TableActionDropdown';
import type { UseCrudResourceResult } from '@/hooks/crud';
import { ROLE_LABEL, type RoleName, RoleNameEnum, type User } from '@/interfaces';

type Props = {
  crud: UseCrudResourceResult<User, UserInput>;
  onEdit: (user: User) => void;
};

/** Sortable columns follow DESIGN.md, Tables: Name, then the others as their data arrives. */
const UserList: FC<Props> = ({ crud, onEdit }) => {
  const { modal } = App.useApp();
  const { listQuery, pageState, setPageState } = crud;

  const columns = useMemo<TableColumnsType<User>>(
    () => [
      {
        title: 'Name',
        key: 'firstName',
        dataIndex: 'firstName',
        sorter: true,
        render: (_, r) => (
          <div className="flex flex-col">
            <span className="font-medium text-ink">{`${r.lastName} ${r.firstName}`}</span>
            <span className="font-mono text-[12px] text-ink-3">{r.email}</span>
          </div>
        ),
      },
      {
        title: 'Role',
        key: 'roles',
        dataIndex: 'roles',
        render: (roles: string[]) =>
          roles.map((r) => <Tag key={r}>{ROLE_LABEL[r as RoleName] ?? r}</Tag>),
      },
      {
        title: 'Created',
        key: 'createdAt',
        dataIndex: 'createdAt',
        sorter: true,
        render: (v: string) => <span className="font-mono">{dayjs(v).format('D MMM YYYY')}</span>,
      },
      {
        key: 'actions',
        width: 56,
        render: (_, r) => (
          <TableActionDropdown
            edit={{ onClick: () => onEdit(r), permission: RoleNameEnum.LOGISTICS_MANAGER }}
            delete={{
              permission: RoleNameEnum.LOGISTICS_MANAGER,
              onClick: () =>
                modal.confirm({
                  title: `Remove ${r.lastName} ${r.firstName}?`,
                  content: 'They can no longer sign in. Their past records stay.',
                  okText: 'Remove',
                  okButtonProps: { danger: true },
                  onOk: () => crud.deleteMutation.mutateAsync(r.id),
                }),
            }}
          />
        ),
      },
    ],
    [crud.deleteMutation, modal, onEdit],
  );

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
        showTotal: (total, [from, to]) => `${from}–${to} of ${total} accounts`,
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
