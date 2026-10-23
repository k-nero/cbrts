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
  { path: '/register', roles: ['*'], type: 'unauthenticated', breadcrumb: '', name: 'register' },
  { path: '/forbidden', roles: ['*'], type: 'public', breadcrumb: '', name: 'forbidden' },
  {
    path: '/design-system',
    roles: ['*'],
    type: 'public',
    breadcrumb: 'Design system',
    name: 'design-system',
  },
  // The public landing page, open to everyone: the brand links here from every shell. The guard
  // matches by path segment, so "/" has no config check.
  { path: '/', roles: ['*'], type: 'public', breadcrumb: '', name: 'landing' },
  {
    path: '/home',
    roles: ['CUSTOMER'],
    type: 'authenticated',
    breadcrumb: 'Home',
    name: 'customer-home',
  },
  {
    path: '/horses',
    roles: ['CUSTOMER'],
    type: 'authenticated',
    breadcrumb: 'My horses',
    name: 'my-horses',
    children: [
      {
        path: '/new',
        roles: ['*'],
        type: 'authenticated',
        breadcrumb: 'Add a horse',
        name: 'horse-new',
      },
      {
        path: '/{id}',
        roles: ['*'],
        type: 'authenticated',
        breadcrumb: 'Profile',
        name: 'horse-profile',
        children: [
          {
            path: '/edit',
            roles: ['*'],
            type: 'authenticated',
            breadcrumb: 'Edit',
            name: 'horse-edit',
          },
        ],
      },
    ],
  },
  {
    path: '/requests',
    roles: ['CUSTOMER'],
    type: 'authenticated',
    breadcrumb: 'My requests',
    name: 'my-requests',
    children: [
      {
        path: '/new',
        roles: ['*'],
        type: 'authenticated',
        breadcrumb: 'Request transport',
        name: 'request-new',
      },
      {
        path: '/{id}',
        roles: ['*'],
        type: 'authenticated',
        breadcrumb: 'Request',
        name: 'request',
        children: [
          {
            path: '/edit',
            roles: ['*'],
            type: 'authenticated',
            breadcrumb: 'Edit',
            name: 'request-edit',
          },
          {
            path: '/submitted',
            roles: ['*'],
            type: 'authenticated',
            breadcrumb: 'Submitted',
            name: 'request-submitted',
          },
          {
            path: '/quotation',
            roles: ['*'],
            type: 'authenticated',
            breadcrumb: 'Quotation',
            name: 'request-quotation',
          },
          {
            path: '/documents',
            roles: ['*'],
            type: 'authenticated',
            breadcrumb: 'Documents',
            name: 'request-documents',
          },
        ],
      },
    ],
  },
  {
    path: '/tracking',
    roles: ['CUSTOMER'],
    type: 'authenticated',
    breadcrumb: 'Trip tracking',
    name: 'tracking',
  },
  {
    path: '/notifications',
    roles: ['CUSTOMER'],
    type: 'authenticated',
    breadcrumb: 'Notifications',
    name: 'notifications',
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
        // Every staff role has one; the bell in the top bar opens it.
        path: '/notifications',
        roles: ['*'],
        type: 'authenticated',
        breadcrumb: 'Notifications',
        name: 'staff-notifications',
      },
      {
        path: '/trips',
        roles: [FRC, LM],
        type: 'authenticated',
        breadcrumb: 'Trip progress',
        name: 'staff-trips',
      },
      {
        path: '/jobs/:id',
        roles: ['*'],
        type: 'authenticated',
        breadcrumb: 'Job workspace',
        name: 'job-detail',
      },
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
        children: [
          {
            path: '/{id}',
            roles: [LM],
            type: 'authenticated',
            breadcrumb: 'Request review',
            name: 'request-review',
            children: [
              {
                path: '/quotation',
                roles: [LM],
                type: 'authenticated',
                breadcrumb: 'Quotation',
                name: 'quotation-builder',
              },
            ],
          },
        ],
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
        // Every staff role may open it; other roles see why it's kept to the logistics manager.
        path: '/audit-log',
        roles: [LM, TS, FRC],
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
        children: [
          {
            path: '/review/{id}',
            roles: [TS],
            type: 'authenticated',
            breadcrumb: 'Review',
            name: 'document-review',
          },
        ],
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
