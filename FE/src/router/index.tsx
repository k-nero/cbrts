import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';

import AuthenticateLayout from '@/components/AuthenticateLayout';
import StaffMenu from '@/components/menu/StaffMenu';
import { RoutesGuardWrapper } from '@/HOC/RoutesGuardWrapper';
import DesignSystemPage from '@/pages/design-system';
import ForbiddenPage from '@/pages/ForbiddenPage';
import CustomerHomePage from '@/pages/customer/home';
import LandingPage from '@/pages/landing';
import LoginPage from '@/pages/login';
import PlaceholderPage from '@/pages/PlaceholderPage';
import DocumentsPage from '@/pages/staff/documents';
import UsersPage from '@/pages/staff/users';

/**
 * The page tree. Who may open each path lives in route.config.ts and is enforced once, by
 * RoutesGuardWrapper at the root; the paths here must match that config.
 */
const todo = (title: string) => <PlaceholderPage title={title} />;

export const router = createBrowserRouter([
  {
    element: (
      <RoutesGuardWrapper>
        <Outlet />
      </RoutesGuardWrapper>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/forbidden', element: <ForbiddenPage /> },
      { path: '/design-system', element: <DesignSystemPage /> },
      { path: '/', element: <LandingPage /> },
      {
        // The owner portal: Home, My horses, My requests (customers only, by route.config.ts).
        element: (
          <AuthenticateLayout>
            <Outlet />
          </AuthenticateLayout>
        ),
        children: [
          { path: '/home', element: <CustomerHomePage /> },
          { path: '/horses', element: todo('My horses') },
          { path: '/requests', element: todo('My requests') },
        ],
      },
      {
        path: '/staff',
        element: (
          <AuthenticateLayout menu={<StaffMenu />}>
            <Outlet />
          </AuthenticateLayout>
        ),
        children: [
          { path: 'jobs', element: todo('Jobs') },
          { path: 'overview', element: todo('Overview') },
          { path: 'requests', element: todo('Requests') },
          { path: 'incidents', element: todo('Incidents') },
          { path: 'users', element: <UsersPage /> },
          { path: 'audit-log', element: todo('Audit log') },
          { path: 'documents', element: <DocumentsPage /> },
          { path: 'authorities', element: todo('Authorities') },
          { path: 'customer-notes', element: todo('Customer notes') },
          { path: 'regulations', element: todo('Regulations') },
          { path: 'rates', element: todo('Rates') },
          { path: 'fleet-calendar', element: todo('Fleet calendar') },
          { path: 'vehicles', element: todo('Vehicles') },
        ],
      },
      { path: '/escort', element: todo('Cab surface') },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
