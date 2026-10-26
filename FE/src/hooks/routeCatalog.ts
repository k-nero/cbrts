import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { corridorsApi, routeCatalogApi } from '@/apis/routeCatalog';
import { queryKeys } from '@/constant/query';
import { useCrudResource } from '@/hooks/crud';
import type { Corridor, CreateCorridorInput } from '@/interfaces';

const PLACES_KEY = ['route-catalog', 'places'] as const;
const COUNTRIES_KEY = ['route-catalog', 'countries'] as const;

/** Routes: the corridors, paged; adding one also refreshes the rate catalog, which lists every corridor. */
export const useCorridorList = () => {
  const qc = useQueryClient();
  const crud = useCrudResource<Corridor, CreateCorridorInput>('corridors', corridorsApi, {
    number: 0,
    size: 20,
    sort: { field: 'code', order: 'ascend' },
  });
  const createCorridor = useMutation({
    mutationFn: corridorsApi.create,
    onSuccess: () => {
      crud.invalidate();
      void qc.invalidateQueries({ queryKey: queryKeys.rates.all() });
    },
  });
  return { ...crud, createCorridor };
};

/** Every catalogued place: the cities a route can run between. */
export const useCatalogPlaces = () =>
  useQuery({ queryKey: PLACES_KEY, queryFn: routeCatalogApi.places });

export const useCountries = () =>
  useQuery({ queryKey: COUNTRIES_KEY, queryFn: routeCatalogApi.countries, staleTime: 5 * 60_000 });

export const useCreatePlace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: routeCatalogApi.createPlace,
    onSuccess: () => void qc.invalidateQueries({ queryKey: PLACES_KEY }),
  });
};

export const useCreateBorderCrossing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: routeCatalogApi.createBorderCrossing,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['border-crossings'] }),
  });
};
