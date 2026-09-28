import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { LogoutOutlined } from '@ant-design/icons';
import { Avatar, Dropdown, Flex, Layout, Menu } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';

import Brand from './Brand';

import { COLOR_BG_CANVAS, COLOR_BG_MUTED, COLOR_BORDER, ZINDEX_HEADER } from '@/constant/color';
import { useAuth, useMe } from '@/hooks/auth';
import { type RouteName, useCustomRouter } from '@/router/route.hook';

const { Header: HeaderLayout } = Layout;

const NAV: [RouteName, string][] = [
  ['customer-home', 'Home'],
  ['my-horses', 'My horses'],
  ['my-requests', 'My requests'],
];

/** The owner portal header: the customer's own items only; staff work in the sidebar shell. */
const Header: React.FC = () => {
  const router = useCustomRouter();
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const me = useMe().data;

  const navItems = useMemo<ItemType[]>(
    () =>
      NAV.map(([name, label]) => ({
        key: router.paths.get(name),
        label,
        onClick: () => router.push(router.paths.get(name)),
      })),
    [router],
  );

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
      }}
    >
      <Flex align="center" justify="space-between" style={{ height: '100%' }}>
        <Brand onClick={() => router.push(router.paths.get('customer-home'))} />
        <Menu
          mode="horizontal"
          items={navItems}
          selectedKeys={[pathname]}
          style={{ background: 'transparent', borderBottom: 0, minWidth: 320 }}
        />
        <Dropdown menu={{ items: userItems }} placement="bottomRight">
          <Flex align="center" gap={10} style={{ cursor: 'pointer' }}>
            <Avatar style={{ backgroundColor: COLOR_BG_MUTED }}>
              {me?.firstName.at(0) ?? '?'}
            </Avatar>
            <span className="text-[13px] text-ink-2">
              {me ? `${me.firstName} ${me.lastName}` : ''}
            </span>
          </Flex>
        </Dropdown>
      </Flex>
    </HeaderLayout>
  );
};

export default Header;
