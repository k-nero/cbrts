/**
 * Centralized query-key factory so cache invalidation stays consistent across modules.
 * Each top-level key returns a readonly tuple; sub-keys append narrower scopes.
 */
export const queryKeys = {
  me: () => ['me'] as const,
  roles: () => ['admin', 'roles'] as const,
  customerHome: () => ['customer', 'home'] as const,
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
  customerNotes: {
    all: () => ['customer-notes'] as const,
    detail: (id: string) => ['customer-notes', id] as const,
  },
} as const;
