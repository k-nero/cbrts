import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { archiveHorse, getSizeClasses, horsesApi } from '@/apis/horse';
import { queryKeys } from '@/constant/query';
import type { Horse, HorseInput } from '@/interfaces';

import { useCrudResource } from './crud';

/** One page of the club's horses: active, or archived only. Sorted by name, 20 per page. */
export const useHorses = (archived: boolean) => {
  const extra = useMemo(() => ({ archived }), [archived]);
  return useCrudResource<Horse, HorseInput>(
    'horses',
    horsesApi,
    { number: 0, size: 20, sort: { field: 'name', order: 'ascend' } },
    extra,
  );
};

/** How many horses the club has in one tab; first run is no horse in either. */
export const useHorseCount = (archived: boolean, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.horses.count(archived),
    queryFn: () => horsesApi.list({ archived, size: 1 }).then((page) => page.totalElements),
    enabled,
  });

export const useHorse = (id: string) =>
  useQuery({ queryKey: queryKeys.horses.one(id), queryFn: () => horsesApi.get(id), retry: false });

/** The height bands rarely change. */
export const useSizeClasses = () =>
  useQuery({
    queryKey: queryKeys.horses.sizeClasses(),
    queryFn: getSizeClasses,
    staleTime: Infinity,
  });

/** Create without an id, update with one. */
export const useSaveHorse = () => {
  const qc = useQueryClient();
  return useMutation<Horse, unknown, { id?: string; input: HorseInput }>({
    mutationFn: ({ id, input }) => (id ? horsesApi.update(id, input) : horsesApi.create(input)),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.horses.all() }),
  });
};

export const useArchiveHorse = () => {
  const qc = useQueryClient();
  return useMutation<Horse, unknown, string>({
    mutationFn: archiveHorse,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.horses.all() }),
  });
};
