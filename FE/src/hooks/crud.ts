import { useCallback, useMemo, useState } from 'react';
import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { CrudApi, CrudListParams } from '@/apis/crudFactory';
import type { PagedResponse } from '@/interfaces';

const NO_MUTATION_ERROR = new Error('This resource is read-only — mutations are not supported.');

export interface SortState {
  /** Entity field to sort on — must match a real backend property. */
  field: string;
  order: 'ascend' | 'descend';
}

export interface PageState {
  number: number;
  size: number;
  // `| undefined` (with exactOptionalPropertyTypes) lets callers clear the sort.
  sort?: SortState | undefined;
}

/** Serialize a sort state into Spring Data's `sort=field,dir` param. */
function sortParam(sort: SortState | undefined): Record<string, string> {
  if (sort === undefined) {
    return {};
  }
  return { sort: `${sort.field},${sort.order === 'ascend' ? 'asc' : 'desc'}` };
}

export interface UseCrudResourceResult<T, Input> {
  resource: string;
  pageState: PageState;
  setPageState: (next: PageState | ((prev: PageState) => PageState)) => void;
  search: string;
  setSearch: (next: string) => void;
  listQuery: UseQueryResult<PagedResponse<T>>;
  createMutation: UseMutationResult<T, unknown, Input>;
  updateMutation: UseMutationResult<T, unknown, { id: string; input: Input }>;
  deleteMutation: UseMutationResult<void, unknown, string>;
  invalidate: () => void;
}

/**
 * Stand-up React Query state for a paged CRUD resource. Each page calls this
 * once and feeds the result into `<Table>` (components/Table). Mutations auto-invalidate the
 * resource's pages on success.
 *
 * `extraListParams` lets a page thread additional server-side filters (e.g.
 * status / type dropdowns) into the list call and its query key. Pass a
 * memoized object — identity changes retrigger the query — and strip unset
 * filters so the key stays stable.
 */
export function useCrudResource<T extends { id: string }, Input>(
  resource: string,
  api: CrudApi<T, Input>,
  defaults: PageState = { number: 0, size: 20 },
  extraListParams?: Record<string, string | number | boolean>,
): UseCrudResourceResult<T, Input> {
  const qc = useQueryClient();
  const [pageState, setPageState] = useState<PageState>(defaults);
  const [search, setSearchState] = useState('');

  const listParams = useMemo<CrudListParams>(
    () => ({
      page: pageState.number,
      size: pageState.size,
      ...(search.length > 0 ? { q: search } : {}),
      ...sortParam(pageState.sort),
      ...(extraListParams ?? {}),
    }),
    [pageState.number, pageState.size, pageState.sort, search, extraListParams],
  );

  // `api` is the stable resource client; the `resource` string already keys
  // the cache, so api itself is intentionally omitted from the query key.

  const listQuery = useQuery({
    queryKey: [resource, 'page', listParams] as const,
    queryFn: () => api.list(listParams),
    staleTime: 15_000,
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [resource] });
  }, [qc, resource]);

  const createMutation = useMutation({
    mutationFn: (input: Input) => api.create(input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Input }) => api.update(id, input),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: invalidate,
  });

  const setSearch = useCallback((next: string) => {
    setSearchState(next);
    setPageState((prev) => ({ ...prev, number: 0 }));
  }, []);

  return {
    resource,
    pageState,
    setPageState,
    search,
    setSearch,
    listQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    invalidate,
  };
}

/**
 * Read-only twin of `useCrudResource` for endpoints that only expose a paged
 * `list`. Mutations are stubbed so the same `<Table>` consumer can be
 * pointed at report-style data. Use `enableDelete={false}` and omit
 * `onCreate`/`onEdit` on the table.
 */
export function useReadOnlyResource<T extends { id: string }>(
  resource: string,
  list: (params: CrudListParams) => Promise<PagedResponse<T>>,
  defaults: PageState = { number: 0, size: 20 },
  extraListParams?: Record<string, string | number | boolean>,
): UseCrudResourceResult<T, never> {
  const qc = useQueryClient();
  const [pageState, setPageState] = useState<PageState>(defaults);
  const [search, setSearchState] = useState('');

  const listParams = useMemo<CrudListParams>(
    () => ({
      page: pageState.number,
      size: pageState.size,
      ...(search.length > 0 ? { q: search } : {}),
      ...sortParam(pageState.sort),
      ...(extraListParams ?? {}),
    }),
    [pageState.number, pageState.size, pageState.sort, search, extraListParams],
  );

  const listQuery = useQuery({
    queryKey: [resource, 'page', listParams, list] as const,
    queryFn: () => list(listParams),
    staleTime: 15_000,
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: [resource] });
  }, [qc, resource]);

  const setSearch = useCallback((next: string) => {
    setSearchState(next);
    setPageState((prev) => ({ ...prev, number: 0 }));
  }, []);

  const reject = () => Promise.reject(NO_MUTATION_ERROR);
  const stubCreate: UseMutationResult<T, unknown, never> = useMutation({
    mutationFn: reject,
  });
  const stubUpdate: UseMutationResult<T, unknown, { id: string; input: never }> = useMutation({
    mutationFn: reject,
  });
  const stubDelete: UseMutationResult<void, unknown, string> = useMutation({
    mutationFn: reject,
  });

  return {
    resource,
    pageState,
    setPageState,
    search,
    setSearch,
    listQuery,
    createMutation: stubCreate,
    updateMutation: stubUpdate,
    deleteMutation: stubDelete,
    invalidate,
  };
}
