import { useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Flex, Input } from 'antd';

import AddEditUserModal from './ViewAddEdit/AddEditUserModal';
import UserList from './ViewAddEdit/UserList';

import { useUsers } from '@/hooks/user';
import type { User } from '@/interfaces';

/** Users & roles (logistics manager): staff accounts and their role. */
const UsersPage = () => {
  const crud = useUsers();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const openModal = (user: User | null) => {
    setEditing(user);
    setOpen(true);
  };

  return (
    <Flex vertical gap={28}>
      <Flex justify="space-between" align="end" gap={24}>
        <Flex vertical gap={8}>
          <h1 className="m-0 font-display text-[44px] leading-[50px] font-normal text-ink">
            Users &amp; roles
          </h1>
          <p className="m-0 text-[15px] text-ink-2">
            Staff accounts and what each role can do. Customers manage their own accounts.
          </p>
        </Flex>
        <Button icon={<PlusOutlined />} onClick={() => openModal(null)}>
          Invite staff
        </Button>
      </Flex>
      <Input.Search
        allowClear
        placeholder="Name or email"
        style={{ width: 360 }}
        onSearch={crud.setSearch}
      />
      <UserList crud={crud} onEdit={openModal} />
      <AddEditUserModal open={open} editing={editing} crud={crud} onClose={() => setOpen(false)} />
    </Flex>
  );
};

export default UsersPage;
