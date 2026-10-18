import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { horsesApi } from '@/apis/horse';
import { getRoutes, requestApi, requestListApi, submitRequest } from '@/apis/request';
import { queryKeys } from '@/constant/query';
import type { RequestDraftInput, RequestSummary, TransportRequest } from '@/interfaces';

import { useCrudResource } from './crud';

/** One page of the club's requests, newest first, 20 per page. */
export const useRequests = () =>
  useCrudResource<RequestSummary, RequestDraftInput>('requests', requestListApi, {
    number: 0,
    size: 20,
    sort: { field: 'createdAt', order: 'descend' },
  });

export const useRequest = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.requests.one(id ?? ''),
    queryFn: () => requestApi.get(id as string),
    enabled: Boolean(id),
    retry: false,
    // The wizard owns the draft while it is open: a refetch on focus would only race its saves.
    refetchOnWindowFocus: false,
  });

/**
 * Writes the answer into the request's query, so the wizard reads the saved draft at once. `cancel`
 * stops a read of the draft already in flight, which would otherwise land after the save and put the
 * old draft back.
 */
const useStoreRequest = () => {
  const qc = useQueryClient();
  return {
    cancel: (id: string | undefined) =>
      id ? qc.cancelQueries({ queryKey: queryKeys.requests.one(id) }) : Promise.resolve(),
    store: (request: TransportRequest) => {
      qc.setQueryData(queryKeys.requests.one(request.id), request);
      void qc.invalidateQueries({ queryKey: queryKeys.requests.pages() });
    },
  };
};

/** Create a draft without an id, replace its fields with one. */
export const useSaveRequest = () => {
  const { cancel, store } = useStoreRequest();
  return useMutation<TransportRequest, unknown, { id?: string; input: RequestDraftInput }>({
    onMutate: ({ id }) => cancel(id),
    mutationFn: ({ id, input }) => (id ? requestApi.update(id, input) : requestApi.create(input)),
    onSuccess: store,
  });
};

export const useSubmitRequest = () => {
  const { cancel, store } = useStoreRequest();
  return useMutation<TransportRequest, unknown, string>({
    onMutate: (id) => cancel(id),
    mutationFn: submitRequest,
    onSuccess: store,
  });
};

export const useDiscardRequest = () => {
  const qc = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (id) => requestListApi.remove(id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: queryKeys.requests.one(id) });
      void qc.invalidateQueries({ queryKey: queryKeys.requests.pages() });
    },
  });
};

/** The corridors between two places; an empty list is a route we don't run. */
export const useRoutes = (from: string | null, to: string | null) =>
  useQuery({
    queryKey: queryKeys.requests.routes(from ?? '', to ?? ''),
    queryFn: () => getRoutes(from as string, to as string),
    enabled: Boolean(from && to),
    staleTime: 5 * 60_000,
  });

/** The corridors touching the origin's city: the alternatives on a route we don't run. */
export const useOriginRoutes = (from: string | null, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.requests.originRoutes(from ?? ''),
    queryFn: () => getRoutes(from as string),
    enabled: Boolean(from) && enabled,
    staleTime: 5 * 60_000,
  });

/** Every active horse of the club in one list, for the pick cards and the pass's coat swatches. */
export const useWizardHorses = () =>
  useQuery({
    queryKey: queryKeys.requests.wizardHorses(),
    queryFn: () =>
      horsesApi.list({ archived: false, size: 100, sort: 'name,asc' }).then((page) => page.content),
    staleTime: 60_000,
  });
