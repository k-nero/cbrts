/**
 * Centralized query-key factory so cache invalidation stays consistent across modules.
 * Each top-level key returns a readonly tuple; sub-keys append narrower scopes.
 */
export const queryKeys = {
  me: () => ['me'] as const,
  roles: () => ['admin', 'roles'] as const,
  customerHome: () => ['customer', 'home'] as const,
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
    routes: (from: string, to: string | null) => ['routes', from, to] as const,
    /** Under 'horses', so a horse saved or archived refreshes the pick cards. */
    wizardHorses: () => ['horses', 'wizard'] as const,
  },
  clearance: {
    all: () => ['clearance'] as const,
    jobs: (q = '') => ['clearance', 'jobs', 'list', q] as const,
    pendingReviews: () => ['clearance', 'pending-reviews'] as const,
    checklist: (jobId: string) => ['clearance', 'jobs', jobId, 'checklist'] as const,
    status: (jobId: string) => ['clearance', 'jobs', jobId, 'status'] as const,
    authorities: () => ['clearance', 'authorities'] as const,
    submissions: (jobId: string) => ['clearance', 'jobs', jobId, 'submissions'] as const,
    quarantines: (jobId: string) => ['clearance', 'jobs', jobId, 'quarantines'] as const,
  },
} as const;
