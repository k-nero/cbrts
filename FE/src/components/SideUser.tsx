import { FC } from 'react';
import { DownOutlined, LogoutOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';

import { useAuth, useMe } from '@/hooks/auth';

const USER_BUTTON = [
  'flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-md border-0',
  'bg-transparent px-2 text-left hover:bg-muted',
].join(' ');

const AVATAR =
  'grid size-8 place-items-center rounded-full bg-muted text-[13px] font-medium text-ink-2';

/** Vietnamese names put the family name first: "Vũ Hải Yến" → "VY". */
const initialsOf = (first: string, last: string) =>
  `${last.at(0) ?? ''}${first.split(' ').at(-1)?.at(0) ?? ''}`.toUpperCase();

export const SideUser: FC = () => {
  const { logout } = useAuth();
  const me = useMe().data;
  return (
    <Dropdown
      trigger={['click']}
      placement="topLeft"
      menu={{
        items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', onClick: logout }],
      }}
    >
      <button type="button" className={USER_BUTTON}>
        <span className={AVATAR}>{me ? initialsOf(me.firstName, me.lastName) : '?'}</span>
        <span className="flex-1 truncate text-[13px] font-medium text-ink">
          {me ? `${me.lastName} ${me.firstName}` : 'Loading…'}
        </span>
        <DownOutlined style={{ fontSize: 10, color: 'var(--color-ink-3)' }} />
      </button>
    </Dropdown>
  );
};
