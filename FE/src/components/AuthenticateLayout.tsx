import { FC } from 'react';
import { useLocation } from 'react-router-dom';
import { DownOutlined, LogoutOutlined } from '@ant-design/icons';
import { Dropdown, Flex, Layout } from 'antd';
import dayjs from 'dayjs';

import Brand from './Brand';
import Breadcrumb from './Breadscrumb';
import ErrorBoundaryHandling from './ErrorBoundaryHandling';
import Footer from './Footer';
import Header from './Header';
import ThemeToggle from './ThemeToggle';

import { COLOR_BG_CANVAS, COLOR_BG_SUNKEN, COLOR_BORDER, ZINDEX_MENU } from '@/constant/color';
import { useAuth, useMe } from '@/hooks/auth';
import { ROLE_LABEL } from '@/interfaces';
import { useCustomRouter } from '@/router/route.hook';
import { primaryRole, primaryRoleHome, useAuthStore } from '@/stores/authStore';

const USER_BUTTON = [
  'flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-md border-0',
  'bg-transparent px-2 text-left hover:bg-muted',
].join(' ');
const AVATAR =
  'grid size-8 place-items-center rounded-full bg-muted text-[13px] font-medium text-ink-2';
const ROLE_TAG = [
  'w-fit rounded-full border border-line-strong bg-muted px-2.5 py-1',
  'font-mono text-[11px] tracking-wide text-ink-2 uppercase',
].join(' ');

const { Content, Sider } = Layout;

type Props = {
  children: React.ReactNode;
  /** The staff sidebar's items. Without it the layout is the customer portal (top header). */
  menu?: React.ReactNode;
};

/** Vietnamese names put the family name first: "Vũ Hải Yến" → "VY". */
const initialsOf = (first: string, last: string) =>
  `${last.at(0) ?? ''}${first.split(' ').at(-1)?.at(0) ?? ''}`.toUpperCase();

const SideUser: FC = () => {
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

const AuthenticateLayout: FC<Props> = ({ children, menu }) => {
  const { pathname } = useLocation();
  const router = useCustomRouter();
  const roles = useAuthStore((state) => state.roles);
  const role = primaryRole(roles);

  if (!menu) {
    // Owner shell: header, the 1200 px column, then the Full footer (DESIGN.md, Layout).
    return (
      <Layout style={{ minHeight: '100vh', background: COLOR_BG_CANVAS }}>
        <Header />
        <ErrorBoundaryHandling key={pathname}>
          <Content style={{ padding: '32px 120px 96px' }}>{children}</Content>
        </ErrorBoundaryHandling>
        <Footer />
      </Layout>
    );
  }

  // Staff shell: a top bar with the breadcrumb and today's date, then content at 40 px gutters.
  const body = (
    <Layout style={{ background: COLOR_BG_CANVAS }}>
      <Flex
        justify="space-between"
        align="center"
        style={{ padding: '18px 40px', borderBottom: `1px solid ${COLOR_BORDER}` }}
      >
        <Breadcrumb />
        <Flex align="center" gap={16}>
          <span className="font-mono text-[12px] text-ink-3">
            {dayjs().format('ddd D MMM YYYY')}
          </span>
          <ThemeToggle />
        </Flex>
      </Flex>
      <ErrorBoundaryHandling key={pathname}>
        <Content style={{ padding: '28px 40px 96px' }}>{children}</Content>
      </ErrorBoundaryHandling>
    </Layout>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={248}
        style={{
          background: COLOR_BG_SUNKEN,
          borderRight: `1px solid ${COLOR_BORDER}`,
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: ZINDEX_MENU,
        }}
      >
        <Flex vertical gap={20} style={{ height: '100%', padding: '20px 16px 16px' }}>
          <Flex vertical gap={10}>
            <Brand onClick={() => router.push(primaryRoleHome(roles))} />
            {role && <span className={ROLE_TAG}>{ROLE_LABEL[role]}</span>}
          </Flex>
          <div style={{ flex: 1, overflowY: 'auto' }}>{menu}</div>
          <div style={{ borderTop: `1px solid ${COLOR_BORDER}`, paddingTop: 8 }}>
            <SideUser />
          </div>
        </Flex>
      </Sider>
      {body}
    </Layout>
  );
};

export default AuthenticateLayout;
