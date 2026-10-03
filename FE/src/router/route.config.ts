import type { RouteConfigItem } from './route.type';

const LM = 'LOGISTICS_MANAGER';
const TS = 'TRANSPORT_SPECIALIST';
const FRC = 'FLEET_COORDINATOR';

/**
 * Every page, the roles that may open it and whether it needs a session. Route names are the
 * canonical identifiers: navigate with useCustomRouter().paths.get('<name>'), never a literal.
 * A page's roles are checked together with every ancestor's (RoutesGuardWrapper).
 */
export const routesConfig = [
  { path: '/login', roles: ['*'], type: 'unauthenticated', breadcrumb: '', name: 'login' },
  { path: '/forbidden', roles: ['*'], type: 'public', breadcrumb: '', name: 'forbidden' },
  {
    path: '/design-system',
    roles: ['*'],
    type: 'public',
    breadcrumb: 'Design system',
    name: 'design-system',
  },
  {
    path: '/app',
    roles: ['CUSTOMER'],
    type: 'authenticated',
    breadcrumb: 'Home',
    name: 'customer-home',
    children: [
      {
        path: '/horses',
        roles: ['*'],
        type: 'authenticated',
        breadcrumb: 'My horses',
        name: 'my-horses',
      },
      {
        path: '/requests',
        roles: ['*'],
        type: 'authenticated',
        breadcrumb: 'My requests',
        name: 'my-requests',
      },
    ],
  },
  {
    path: '/staff',
    roles: [LM, TS, FRC],
    type: 'authenticated',
    breadcrumb: '',
    name: 'staff',
    children: [
      { path: '/jobs', roles: ['*'], type: 'authenticated', breadcrumb: 'Jobs', name: 'jobs' },
      {
        path: '/overview',
        roles: [LM],
        type: 'authenticated',
        breadcrumb: 'Overview',
        name: 'overview',
      },
      {
        path: '/requests',
        roles: [LM],
        type: 'authenticated',
        breadcrumb: 'Requests',
        name: 'requests',
      },
      {
        path: '/incidents',
        roles: [LM],
        type: 'authenticated',
        breadcrumb: 'Incidents',
        name: 'incidents',
      },
      {
        path: '/users',
        roles: [LM],
        type: 'authenticated',
        breadcrumb: 'Users & roles',
        name: 'users',
      },
      {
        path: '/audit-log',
        roles: [LM],
        type: 'authenticated',
        breadcrumb: 'Audit log',
        name: 'audit-log',
      },
      {
        path: '/documents',
        roles: [TS],
        type: 'authenticated',
        breadcrumb: 'Documents',
        name: 'documents',
      },
      {
        path: '/authorities',
        roles: [TS],
        type: 'authenticated',
        breadcrumb: 'Authorities',
        name: 'authorities',
      },
      {
        path: '/customer-notes',
        roles: [TS],
        type: 'authenticated',
        breadcrumb: 'Customer notes',
        name: 'customer-notes',
      },
      {
        path: '/regulations',
        roles: [TS],
        type: 'authenticated',
        breadcrumb: 'Regulations',
        name: 'regulations',
      },
      { path: '/rates', roles: [TS], type: 'authenticated', breadcrumb: 'Rates', name: 'rates' },
      {
        path: '/fleet-calendar',
        roles: [FRC],
        type: 'authenticated',
        breadcrumb: 'Fleet calendar',
        name: 'fleet-calendar',
      },
      {
        path: '/vehicles',
        roles: [FRC],
        type: 'authenticated',
        breadcrumb: 'Vehicles',
        name: 'vehicles',
      },
    ],
  },
  {
    path: '/escort',
    roles: ['ESCORT'],
    type: 'authenticated',
    breadcrumb: 'Cab surface',
    name: 'escort',
  },
] as const satisfies readonly RouteConfigItem[];
