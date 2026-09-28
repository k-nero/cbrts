import { Outlet } from 'react-router-dom';
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

import { primaryRole, selectRoles, useAuthStore } from '../store/authStore.ts';
import { type RoleName, RoleNameEnum } from '../types';
import AppShell, { type NavGroup } from './AppShell';

/** Each staff role sees the work it owns (DESIGN.md, Staff sidebar), not the system's tables. */
const ROLE_NAV: Partial<Record<RoleName, readonly NavGroup[]>> = {
    [RoleNameEnum.LOGISTICS_MANAGER]: [
        {
            items: [
                { to: '/staff/overview', label: 'Overview', icon: <BarChartOutlined /> },
                { to: '/staff/requests', label: 'Requests', icon: <HistoryOutlined /> },
                { to: '/staff/jobs', label: 'Jobs', icon: <NodeIndexOutlined /> },
                { to: '/staff/incidents', label: 'Incidents', icon: <AlertOutlined /> },
            ],
        },
        {
            label: 'Admin',
            items: [
                { to: '/staff/users', label: 'Users & roles', icon: <TeamOutlined /> },
                { to: '/staff/audit-log', label: 'Audit log', icon: <AuditOutlined /> },
            ],
        },
    ],
    [RoleNameEnum.TRANSPORT_SPECIALIST]: [
        {
            items: [
                { to: '/staff/jobs', label: 'Jobs', icon: <NodeIndexOutlined /> },
                { to: '/staff/documents', label: 'Documents', icon: <FileTextOutlined /> },
                {
                    to: '/staff/authorities',
                    label: 'Authorities',
                    icon: <SafetyCertificateOutlined />,
                },
                { to: '/staff/customer-notes', label: 'Customer notes', icon: <EditOutlined /> },
            ],
        },
        {
            label: 'Catalogs',
            items: [
                { to: '/staff/regulations', label: 'Regulations', icon: <BookOutlined /> },
                { to: '/staff/rates', label: 'Rates', icon: <TagOutlined /> },
            ],
        },
    ],
    [RoleNameEnum.FLEET_COORDINATOR]: [
        {
            items: [
                { to: '/staff/jobs', label: 'Jobs', icon: <NodeIndexOutlined /> },
                {
                    to: '/staff/fleet-calendar',
                    label: 'Fleet calendar',
                    icon: <CalendarOutlined />,
                },
                { to: '/staff/vehicles', label: 'Vehicles', icon: <CarOutlined /> },
            ],
        },
    ],
};

export default function StaffLayout() {
    const role = primaryRole(useAuthStore(selectRoles));
    return (
        <AppShell navGroups={(role !== null ? ROLE_NAV[role] : undefined) ?? []}>
            <Outlet />
        </AppShell>
    );
}
