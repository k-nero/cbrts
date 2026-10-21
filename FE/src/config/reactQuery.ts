import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client. Defaults:
 * - `staleTime: 30s` keeps repeat navigations snappy without staleness on long sessions.
 * - `retry: 1` retries transient network blips once; mutations don't retry by default.
 * - `refetchOnWindowFocus: false` — the manager console is high-density; we do not want
 *   AntD spinners flashing every time the user alt-tabs.
 * - `gcTime: 5min` keeps prefetched data around for back-navigation.
 * - `throwOnError` sends a failed load to the route's error boundary (ErrorBoundaryHandling), so
 *   pages don't draw their own error or offline states. It only throws when there's nothing on
 *   screen yet: a failed background refetch keeps showing the data already loaded.
 * - `networkMode: 'always'` makes an offline request fail (and reach the boundary's offline page)
 *   instead of pausing forever with a spinner.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      throwOnError: (_error, query) => query.state.data === undefined,
      networkMode: 'always',
    },
    mutations: {
      retry: 0,
    },
  },
});
