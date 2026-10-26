import { FC } from 'react';
import { useLocation } from 'react-router-dom';
import { Flex, Layout } from 'antd';
import dayjs from 'dayjs';

import Brand from './Brand';
import Breadcrumb from './Breadcrumb';
import ErrorBoundaryHandling from './ErrorBoundaryHandling';
import Footer from './Footer';
import Header from './Header';
import NotificationBell from './notification/NotificationBell';
import PageMotion from './PageMotion';
import ThemeToggle from './ThemeToggle';
import { SideUser } from './SideUser';

import { COLOR_BG_CANVAS, COLOR_BG_SUNKEN, COLOR_BORDER, ZINDEX_MENU } from '@/constant/color';
import { ROLE_LABEL } from '@/interfaces';
import { primaryRole, useAuthStore } from '@/stores/authStore';

const ROLE_TAG = [
  'w-fit rounded-full border border-line-strong bg-muted px-2.5 py-1',
  'font-mono text-[11px] tracking-wide text-ink-2 uppercase',
].join(' ');

const { Content, Sider } = Layout;

type Props = {
  children: React.ReactNode;
  /** The staff sidebar's items. Without it the layout is the customer portal (top header). */
  menu?: React.ReactNode;
  /** Where the staff shell's bell leads; the escort has a notifications page of their own. */
  notificationsPage?: 'staff-notifications' | 'escort-notifications';
};

const AuthenticateLayout: FC<Props> = ({
  children,
  menu,
  notificationsPage = 'staff-notifications',
}) => {
  const { pathname } = useLocation();
  const roles = useAuthStore((state) => state.roles);
  const role = primaryRole(roles);

  if (!menu) {
    // Owner shell: header, the 1200 px column, then the Full footer (DESIGN.md, Layout).
    return (
      <Layout style={{ minHeight: '100vh', background: COLOR_BG_CANVAS }}>
        <Header />
        <ErrorBoundaryHandling key={pathname}>
          <Content style={{ padding: '32px 120px 96px' }}>
            <PageMotion>{children}</PageMotion>
          </Content>
        </ErrorBoundaryHandling>
        <Footer />
      </Layout>
    );
  }

  // Staff shell: a top bar with the breadcrumb, today's date and the bell, then content at 40 px gutters.
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
          <NotificationBell page={notificationsPage} />
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
            <Brand />
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
