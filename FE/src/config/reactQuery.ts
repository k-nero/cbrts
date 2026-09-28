import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client. Defaults:
 * - `staleTime: 30s` keeps repeat navigations snappy without staleness on long sessions.
 * - `retry: 1` retries transient network blips once; mutations don't retry by default.
 * - `refetchOnWindowFocus: false` — the manager console is high-density; we do not want
 *   AntD spinners flashing every time the user alt-tabs.
 * - `gcTime: 5min` keeps prefetched data around for back-navigation.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
