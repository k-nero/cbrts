import { createBrowserRouter, Navigate } from 'react-router-dom';

import ProtectedRoute from './auth/ProtectedRoute';
import CustomerLayout from './layouts/CustomerLayout';
import StaffLayout from './layouts/StaffLayout';
import ForbiddenPage from './pages/ForbiddenPage';
import LoginPage from './pages/login/LoginPage';
import PlaceholderPage from './pages/PlaceholderPage';
import UsersPage from './pages/staff/UsersPage';
import { RoleNameEnum } from './types';

const STAFF = [
    RoleNameEnum.LOGISTICS_MANAGER,
    RoleNameEnum.TRANSPORT_SPECIALIST,
    RoleNameEnum.FLEET_COORDINATOR,
];
const LM = [RoleNameEnum.LOGISTICS_MANAGER];
const TS = [RoleNameEnum.TRANSPORT_SPECIALIST];
const FRC = [RoleNameEnum.FLEET_COORDINATOR];

/** A page that exists in the design but not yet in code. */
function todo(title: string) {
    return <PlaceholderPage title={title} description="Designed in Figma; not built yet." />;
}

/** Nested so each page is limited to the roles that own it (DESIGN.md, Staff sidebar). */
function only(roles: readonly string[], path: string, element: React.ReactNode) {
    return { element: <ProtectedRoute anyOf={roles} />, children: [{ path, element }] };
}

export const router = createBrowserRouter([
    { path: '/', element: <Navigate to="/login" replace /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/forbidden', element: <ForbiddenPage /> },

    {
        element: <ProtectedRoute anyOf={[RoleNameEnum.CUSTOMER]} />,
        children: [
            {
                path: '/app',
                element: <CustomerLayout />,
                children: [
                    { index: true, element: todo('Home') },
                    { path: 'horses', element: todo('My horses') },
                    { path: 'requests', element: todo('My requests') },
                ],
            },
        ],
    },

    {
        element: <ProtectedRoute anyOf={STAFF} />,
        children: [
            {
                path: '/staff',
                element: <StaffLayout />,
                children: [
                    { path: 'jobs', element: todo('Jobs') },
                    only(LM, 'overview', todo('Overview')),
                    only(LM, 'requests', todo('Requests')),
                    only(LM, 'incidents', todo('Incidents')),
                    only(LM, 'users', <UsersPage />),
                    only(LM, 'audit-log', todo('Audit log')),
                    only(TS, 'documents', todo('Documents')),
                    only(TS, 'authorities', todo('Authorities')),
                    only(TS, 'customer-notes', todo('Customer notes')),
                    only(TS, 'regulations', todo('Regulations')),
                    only(TS, 'rates', todo('Rates')),
                    only(FRC, 'fleet-calendar', todo('Fleet calendar')),
                    only(FRC, 'vehicles', todo('Vehicles')),
                ],
            },
        ],
    },

    {
        element: <ProtectedRoute anyOf={[RoleNameEnum.ESCORT]} />,
        children: [{ path: '/escort', element: todo('Cab surface') }],
    },

    { path: '*', element: <Navigate to="/" replace /> },
]);
