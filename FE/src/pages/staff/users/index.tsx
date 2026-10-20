import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Input, Select } from 'antd';

import AddEditUserModal from './ViewAddEdit/AddEditUserModal';
import RoleMatrix from './RoleMatrix';
import UserList from './UserList.tsx';

import { type UserGroup, UserGroupEnum } from '@/apis/user';
import PageHeader from '@/components/PageHeader';
import { Tabs } from '@/components/ui';
import { useRoles } from '@/hooks/role';
import { useUserGroupCounts, useUsers } from '@/hooks/user';
import { ROLE_LABEL, type RoleName, RoleNameEnum, type User } from '@/interfaces';

/** "Sorted by name, A to Z" / "Sorted by date created, newest first". */
const sortNote = (field: string, order: 'ascend' | 'descend') =>
  field === 'lastActiveAt'
    ? `Sorted by last active, ${order === 'ascend' ? 'longest ago' : 'most recent'} first`
    : field === 'createdAt'
      ? `Sorted by date created, ${order === 'ascend' ? 'oldest' : 'newest'} first`
      : `Sorted by name, ${order === 'ascend' ? 'A to Z' : 'Z to A'}`;

/** Users & roles (logistics manager): staff accounts and their role. */
const UsersPage = () => {
  const [group, setGroup] = useState<UserGroup>(UserGroupEnum.STAFF);
  const [role, setRole] = useState<string | undefined>(undefined);
  // Roles are staff roles, so the Role filter only applies on the Staff tab.
  const crud = useUsers(group === UserGroupEnum.STAFF ? role : undefined, group);
  const counts = useUserGroupCounts().data;
  const roles = useRoles();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const { listQuery, pageState, setPageState } = crud;
  const total = listQuery.data?.totalElements;
  const sort = pageState.sort;

  const openModal = (user: User | null) => {
    setEditing(user);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
  };

  return (
    <Flex vertical gap={28}>
      <PageHeader
        title="Users & roles"
        summary="Staff accounts and what each role can do. Customers manage their own accounts from the owner portal."
        right={
          <Button icon={<PlusOutlined />} onClick={() => openModal(null)}>
            Invite staff
          </Button>
        }
      />

      <Flex gap={24} align="start" wrap="wrap">
        <Flex vertical gap={16} className="min-w-0 flex-1">
          <Tabs
            label="Accounts"
            activeKey={group}
            onChange={(key) => {
              setGroup(key);
              setPageState((p) => ({ ...p, number: 0 }));
            }}
            items={[
              { key: UserGroupEnum.STAFF, label: 'Staff', count: counts?.staff },
              { key: UserGroupEnum.CUSTOMERS, label: 'Customers', count: counts?.customers },
              { key: UserGroupEnum.INVITES, label: 'Pending invites', count: counts?.invites },
            ]}
          />
          <Flex gap={16} align="end">
            <Flex vertical gap={8}>
              <label htmlFor="users-search" className="type-label-s text-ink-2">
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
            {group === UserGroupEnum.STAFF && (
              <Flex vertical gap={8}>
                <label htmlFor="users-role" className="type-label-s text-ink-2">
                  Role
                </label>
                <Select
                  id="users-role"
                  allowClear
                  placeholder="All roles"
                  style={{ width: 220 }}
                  value={role}
                  loading={roles.isLoading}
                  options={(roles.data ?? [])
                    .filter((r) => r.name !== RoleNameEnum.CUSTOMER)
                    .map((r) => ({
                      label: ROLE_LABEL[r.name as RoleName] ?? r.name,
                      value: r.name,
                    }))}
                  onChange={(value?: string) => {
                    setRole(value);
                    setPageState((p) => ({ ...p, number: 0 }));
                  }}
                />
              </Flex>
            )}
          </Flex>

          <Flex gap={8} align="center" style={{ minHeight: 32 }}>
            <span className="type-label-s text-ink">
              {total === undefined
                ? 'Accounts'
                : `${total} ${total === 1 ? 'account' : 'accounts'}`}
            </span>
            <span className="type-body-s text-ink-3">
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

          {/* Loading is the table's own spinner; a failed load goes to the error boundary. */}
          <UserList crud={crud} onEdit={openModal} />
        </Flex>

        <RoleMatrix className="w-full shrink-0 xl:w-100" />
      </Flex>

      <AddEditUserModal open={open} editing={editing} crud={crud} onClose={handleClose} />
    </Flex>
  );
};

export default UsersPage;
