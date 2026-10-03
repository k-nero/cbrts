import { useMemo } from 'react';
import { DownOutlined, LogoutOutlined } from '@ant-design/icons';
import { Dropdown, Flex, Layout } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';

import Brand from './Brand';
import ThemeToggle from './ThemeToggle';
import { NavItem } from './ui';

import { COLOR_BG_CANVAS, COLOR_BORDER, ZINDEX_HEADER } from '@/constant/color';
import { useAuth, useMe } from '@/hooks/auth';
import { type RouteName, useCustomRouter } from '@/router/route.hook';

const { Header: HeaderLayout } = Layout;

const NAV: [RouteName, string, boolean][] = [
  ['customer-home', 'Home', true],
  ['my-horses', 'My horses', false],
  ['my-requests', 'My requests', false],
];

const AVATAR =
  'grid size-7 place-items-center rounded-full bg-muted font-mono text-[11px] text-ink-2';
const ACCOUNT_CHIP = [
  'flex cursor-pointer items-center gap-2.5 rounded-full border border-line',
  'bg-transparent py-1 pr-3.5 pl-1 text-[13px] text-ink-2 hover:border-line-strong',
].join(' ');

/**
 * The owner portal header (DESIGN.md, App header): the customer's own items only, the active one
 * a Muted Navy pill with a Gold Ink label. Staff work in the sidebar shell instead.
 */
const Header: React.FC = () => {
  const router = useCustomRouter();
  const { logout } = useAuth();
  const me = useMe().data;

  const userItems = useMemo<ItemType[]>(
    () => [{ key: 'logout', label: 'Sign out', icon: <LogoutOutlined />, onClick: logout }],
    [logout],
  );

  return (
    <HeaderLayout
      style={{
        background: COLOR_BG_CANVAS,
        borderBottom: `1px solid ${COLOR_BORDER}`,
        zIndex: ZINDEX_HEADER,
        padding: '0 40px',
        // AntD's Layout.Header sets line-height: 64px, which every child would inherit.
        lineHeight: 'normal',
      }}
    >
      <Flex align="center" justify="space-between" style={{ height: '100%' }}>
        <Brand onClick={() => router.push(router.paths.get('customer-home'))} />
        <nav className="flex items-center gap-1" aria-label="Main">
          {NAV.map(([name, label, end]) => (
            <NavItem key={name} to={router.paths.get(name)} end={end}>
              {label}
            </NavItem>
          ))}
        </nav>
        <Flex align="center" gap={12}>
          <ThemeToggle />
          <Dropdown menu={{ items: userItems }} placement="bottomRight" trigger={['click']}>
            <button type="button" className={ACCOUNT_CHIP}>
              <span className={AVATAR}>
                {me ? `${me.firstName.at(0) ?? ''}${me.lastName.at(0) ?? ''}`.toUpperCase() : '?'}
              </span>
              {me ? `${me.firstName} ${me.lastName}` : 'Loading…'}
              <DownOutlined style={{ fontSize: 10 }} />
            </button>
          </Dropdown>
        </Flex>
      </Flex>
    </HeaderLayout>
  );
};

export default Header;
