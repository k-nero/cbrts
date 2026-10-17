import { createBrowserRouter, Navigate, Outlet, ScrollRestoration } from 'react-router-dom';

import AuthenticateLayout from '@/components/AuthenticateLayout';
import StaffMenu from '@/components/menu/StaffMenu';
import { RoutesGuardWrapper } from '@/HOC/RoutesGuardWrapper';
import DesignSystemPage from '@/pages/design-system';
import ForbiddenPage from '@/pages/ForbiddenPage';
import CustomerHomePage from '@/pages/customer/home';
import MyHorsesPage from '@/pages/customer/horses';
import EditHorsePage from '@/pages/customer/horses/edit';
import AddHorsePage from '@/pages/customer/horses/new';
import HorseProfilePage from '@/pages/customer/horses/profile';
import MyRequestsPage from '@/pages/customer/requests';
import RequestSubmittedPage from '@/pages/customer/requests/submitted';
import RequestWizardPage from '@/pages/customer/requests/wizard';
import LandingPage from '@/pages/landing';
import LoginPage from '@/pages/login';
import PlaceholderPage from '@/pages/PlaceholderPage';
import DocumentsPage from '@/pages/staff/documents';
import FleetCalendarPage from '@/pages/staff/fleet-calendar';
import JobsPage from '@/pages/staff/jobs';
import JobDetailPage from '@/pages/staff/jobs/JobDetail';
import UsersPage from '@/pages/staff/users';
import VehiclesPage from '@/pages/staff/vehicles';
import { CustomerTripPage, EscortTripPage, StaffTripPage } from '@/pages/trip';

/**
 * The page tree. Who may open each path lives in route.config.ts and is enforced once, by
 * RoutesGuardWrapper at the root; the paths here must match that config.
 */
const todo = (title: string) => <PlaceholderPage title={title} />;

export const router = createBrowserRouter([
  {
    element: (
      <RoutesGuardWrapper>
        {/* A new page opens at its top; back and forward return to where you were. */}
        <ScrollRestoration />
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
          { path: '/horses', element: <MyHorsesPage /> },
          { path: '/horses/new', element: <AddHorsePage /> },
          { path: '/horses/:id', element: <HorseProfilePage /> },
          { path: '/horses/:id/edit', element: <EditHorsePage /> },
          { path: '/requests', element: <MyRequestsPage /> },
          { path: '/requests/new', element: <RequestWizardPage /> },
          { path: '/requests/:id/edit', element: <RequestWizardPage /> },
          { path: '/requests/:id/submitted', element: <RequestSubmittedPage /> },
          { path: '/tracking', element: <CustomerTripPage /> },
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
          { path: 'jobs', element: <JobsPage /> },
          { path: 'jobs/:id', element: <JobDetailPage /> },
          { path: 'trips', element: <StaffTripPage /> },
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
          { path: 'fleet-calendar', element: <FleetCalendarPage /> },
          { path: 'vehicles', element: <VehiclesPage /> },
        ],
      },
      { path: '/escort', element: <EscortTripPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
