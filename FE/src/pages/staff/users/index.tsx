import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Flex, Input, Select } from 'antd';

import AddEditUserModal from './ViewAddEdit/AddEditUserModal';
import UserList from './ViewAddEdit/UserList';

import PageHeader from '@/components/PageHeader';
import { useRoles } from '@/hooks/role';
import { useUsers } from '@/hooks/user';
import { ROLE_LABEL, type RoleName, type User } from '@/interfaces';

/** "Sorted by name, A to Z" / "Sorted by date created, newest first". */
const sortNote = (field: string, order: 'ascend' | 'descend') =>
  field === 'createdAt'
    ? `Sorted by date created, ${order === 'ascend' ? 'oldest' : 'newest'} first`
    : `Sorted by name, ${order === 'ascend' ? 'A to Z' : 'Z to A'}`;

/** Users & roles (logistics manager): staff accounts and their role. */
const UsersPage = () => {
  const [role, setRole] = useState<string | undefined>(undefined);
  const crud = useUsers(role);
  const roles = useRoles();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const { listQuery, pageState, setPageState } = crud;
  const total = listQuery.data?.totalElements;
  const sort = pageState.sort;
  // Offline, React Query pauses instead of failing; say so rather than showing an empty list.
  const isOffline = listQuery.isPending && listQuery.fetchStatus === 'paused';

  const openModal = (user: User | null) => {
    setEditing(user);
    setOpen(true);
  };

  return (
    <Flex vertical gap={28}>
      <PageHeader
        title="Users & roles"
        summary="Staff accounts and what each role can do. Customers manage their own accounts."
        right={
          <Button icon={<PlusOutlined />} onClick={() => openModal(null)}>
            Invite staff
          </Button>
        }
      />

      <Flex vertical gap={16}>
        <Flex gap={16} align="end">
          <Flex vertical gap={8}>
            <label htmlFor="users-search" className="text-[13px] text-ink-2">
              Search
            </label>
            <Input.Search
              id="users-search"
              allowClear
              placeholder="Name or email"
              style={{ width: 360 }}
              onSearch={crud.setSearch}
            />
          </Flex>
          <Flex vertical gap={8}>
            <label htmlFor="users-role" className="text-[13px] text-ink-2">
              Role
            </label>
            <Select
              id="users-role"
              allowClear
              placeholder="All roles"
              style={{ width: 220 }}
              value={role}
              loading={roles.isLoading}
              options={(roles.data ?? []).map((r) => ({
                label: ROLE_LABEL[r.name as RoleName] ?? r.name,
                value: r.name,
              }))}
              onChange={(value?: string) => {
                setRole(value);
                setPageState((p) => ({ ...p, number: 0 }));
              }}
            />
          </Flex>
        </Flex>

        <Flex gap={8} align="center" style={{ minHeight: 32 }}>
          <span className="text-[13px] font-medium text-ink">
            {total === undefined ? 'Accounts' : `${total} ${total === 1 ? 'account' : 'accounts'}`}
          </span>
          <span className="text-[13px] text-ink-3">
            {sort ? sortNote(sort.field, sort.order) : 'Order: newest first'}
          </span>
          {sort && (
            <Button
              type="text"
              size="small"
              onClick={() => setPageState((p) => ({ ...p, number: 0, sort: undefined }))}
            >
              Reset order
            </Button>
          )}
        </Flex>

        {listQuery.isError ? (
          <Alert
            type="error"
            showIcon
            title="Couldn’t load the accounts."
            description="The server didn’t answer. Check your connection, then try again."
            action={
              <Button size="small" onClick={() => void listQuery.refetch()}>
                Try again
              </Button>
            }
          />
        ) : isOffline ? (
          <Alert
            type="warning"
            showIcon
            title="You’re offline."
            description="The accounts load as soon as the connection is back."
          />
        ) : (
          <UserList crud={crud} onEdit={openModal} />
        )}
      </Flex>

      <AddEditUserModal open={open} editing={editing} crud={crud} onClose={() => setOpen(false)} />
    </Flex>
  );
};

export default UsersPage;
