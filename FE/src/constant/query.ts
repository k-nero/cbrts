/**
 * Centralized query-key factory so cache invalidation stays consistent across modules.
 * Each top-level key returns a readonly tuple; sub-keys append narrower scopes.
 */
export const queryKeys = {
  me: () => ['me'] as const,
  /** Everything under it refetches when the notification stream says something changed. */
  notifications: {
    all: () => ['notifications'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
    /** The bell's panel: the newest few, unread only or all. */
    preview: (unread: boolean) => ['notifications', 'preview', unread] as const,
  },
  roles: () => ['admin', 'roles'] as const,
  customerHome: () => ['customer', 'home'] as const,
  /** A request's invoices as the club reads them (the deposit invoice comes with acceptance). */
  customerInvoices: (requestId: string) => ['customer-invoices', requestId] as const,
  horses: {
    all: () => ['horses'] as const,
    one: (id: string) => ['horses', id] as const,
    sizeClasses: () => ['horses', 'size-classes'] as const,
    count: (archived: boolean) => ['horses', 'count', archived] as const,
  },
  requests: {
    all: () => ['requests'] as const,
    /** The list pages (useCrudResource keys them [resource, 'page', params]). */
    pages: () => ['requests', 'page'] as const,
    one: (id: string) => ['requests', id] as const,
    /** The request's issued quotation. */
    quotation: (id: string) => ['requests', id, 'quotation'] as const,
    /** The instant estimate for one set of wizard values. */
    estimate: (input: unknown) => ['requests', 'estimate', input] as const,
    /** The corridors between two places. */
    routes: (from: string, to: string) => ['routes', 'pair', from, to] as const,
    /** The corridors touching one place's city (the alternatives on a route we don't run). */
    originRoutes: (from: string) => ['routes', 'from', from] as const,
    /** Under 'horses', so a horse saved or archived refreshes the pick cards. */
    wizardHorses: () => ['horses', 'wizard'] as const,
  },
  staffRequests: {
    all: () => ['staff-requests'] as const,
    queues: () => ['staff-requests', 'queue'] as const,
    queue: (page: number) => ['staff-requests', 'queue', page] as const,
    one: (id: string) => ['staff-requests', id] as const,
    /** Every version of the request's quotation; invalidate this after a write. */
    quotations: (id: string) => ['staff-requests', id, 'quotation'] as const,
    /** One version, or the latest when none is named. */
    quotation: (id: string, version?: number) =>
      ['staff-requests', id, 'quotation', version ?? 'latest'] as const,
  },
  rates: {
    all: () => ['rates'] as const,
    catalog: () => ['rates', 'catalog'] as const,
    /** Every corridor's view of one version: policies, global bands and shared lines appear in all of them. */
    versionViews: (versionId: string) => ['rates', 'view', versionId] as const,
    view: (versionId: string, corridorId: string) =>
      ['rates', 'view', versionId, corridorId] as const,
  },
  audit: {
    all: () => ['admin-audit-log'] as const,
    actors: () => ['admin-audit-log', 'actors'] as const,
    actions: () => ['admin-audit-log', 'actions'] as const,
  },
  clearance: {
    all: () => ['clearance'] as const,
    jobs: (q = '') => ['clearance', 'jobs', 'list', q] as const,
    pendingReviews: () => ['clearance', 'pending-reviews'] as const,
    reviewDetail: (versionId: string) =>
      ['clearance', 'versions', versionId, 'review-detail'] as const,
    checklist: (jobId: string) => ['clearance', 'jobs', jobId, 'checklist'] as const,
    requestChecklist: (requestId: string) =>
      ['clearance', 'requests', requestId, 'checklist'] as const,
    versions: (checklistItemId: string) =>
      ['clearance', 'checklist', checklistItemId, 'versions'] as const,
    status: (jobId: string) => ['clearance', 'jobs', jobId, 'status'] as const,
    authorities: () => ['clearance', 'authorities'] as const,
    submissions: (jobId: string) => ['clearance', 'jobs', jobId, 'submissions'] as const,
    quarantines: (jobId: string) => ['clearance', 'jobs', jobId, 'quarantines'] as const,
  },
  customerNotes: {
    all: () => ['customer-notes'] as const,
    detail: (id: string) => ['customer-notes', id] as const,
    request: (requestId: string) => ['customer-notes', 'request', requestId] as const,
  },
  regulations: {
    all: () => ['regulations'] as const,
    countries: () => ['regulations', 'countries'] as const,
    version: (id: string) => ['regulations', 'version', id] as const,
    documentTypes: () => ['regulations', 'document-types'] as const,
  },
  trips: {
    /** Every trip list, for invalidation after a record is saved. */
    lists: () => ['trips'] as const,
    list: (audience: string, page: number) => ['trips', audience, page] as const,
    one: (audience: string, code: string) => ['trip', audience, code] as const,
  },
} as const;
