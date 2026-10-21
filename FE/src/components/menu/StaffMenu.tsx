import { FC, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertOutlined,
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  CalendarOutlined,
  CarOutlined,
  EditOutlined,
  FileTextOutlined,
  HistoryOutlined,
  NodeIndexOutlined,
  SafetyCertificateOutlined,
  TagOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Menu as MenuAntd } from 'antd';
import type { ItemType } from 'antd/es/menu/interface';

import { type RoleName, RoleNameEnum } from '@/interfaces';
import { type RouteName, useCustomRouter } from '@/router/route.hook';
import { primaryRole, useAuthStore } from '@/stores/authStore';

type Entry = [RouteName, string, React.ReactNode];

/**
 * Each staff role sees only the work it owns (DESIGN.md, Staff sidebar). A section takes a
 * label only when it holds more than one item.
 */
const ROLE_MENU: Partial<Record<RoleName, { label?: string; items: Entry[] }[]>> = {
  [RoleNameEnum.LOGISTICS_MANAGER]: [
    {
      items: [
        ['overview', 'Overview', <BarChartOutlined key="i" />],
        ['requests', 'Requests', <HistoryOutlined key="i" />],
        ['jobs', 'Jobs', <NodeIndexOutlined key="i" />],
        ['incidents', 'Incidents', <AlertOutlined key="i" />],
      ],
    },
    {
      label: 'Admin',
      items: [
        ['users', 'Users & roles', <TeamOutlined key="i" />],
        ['audit-log', 'Audit log', <AuditOutlined key="i" />],
      ],
    },
  ],
  [RoleNameEnum.TRANSPORT_SPECIALIST]: [
    {
      items: [
        ['jobs', 'Jobs', <NodeIndexOutlined key="i" />],
        ['documents', 'Documents', <FileTextOutlined key="i" />],
        ['authorities', 'Authorities', <SafetyCertificateOutlined key="i" />],
        ['customer-notes', 'Customer notes', <EditOutlined key="i" />],
      ],
    },
    {
      label: 'Catalogs',
      items: [
        ['regulations', 'Regulations', <BookOutlined key="i" />],
        ['rates', 'Rates', <TagOutlined key="i" />],
      ],
    },
  ],
  [RoleNameEnum.FLEET_COORDINATOR]: [
    {
      items: [
        ['jobs', 'Jobs', <NodeIndexOutlined key="i" />],
        ['staff-trips', 'Trip progress', <HistoryOutlined key="i" />],
        ['fleet-calendar', 'Fleet calendar', <CalendarOutlined key="i" />],
        ['vehicles', 'Vehicles', <CarOutlined key="i" />],
      ],
    },
  ],
};

const StaffMenu: FC = () => {
  const { pathname } = useLocation();
  const router = useCustomRouter();
  const role = primaryRole(useAuthStore((state) => state.roles));

  const items = useMemo<ItemType[]>(
    () =>
      (role ? (ROLE_MENU[role] ?? []) : []).map((section, i) => {
        const children: ItemType[] = section.items.map(([name, label, icon]) => ({
          key: router.paths.get(name),
          label,
          icon,
          onClick: () => router.push(router.paths.get(name)),
        }));
        return section.label && section.items.length > 1
          ? { type: 'group', key: section.label, label: section.label, children }
          : { type: 'group', key: `section-${i}`, children };
      }),
    [role, router],
  );

  const selectedKeys = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return [`/${segments.slice(0, 2).join('/')}`];
  }, [pathname]);

  return (
    <MenuAntd
      mode="inline"
      style={{
        fontSize: '18px',
      }}
      items={items}
      selectedKeys={selectedKeys}
    />
  );
};

export default StaffMenu;
