import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { corridorsApi, placesApi, routeCatalogApi } from '@/apis/routeCatalog';
import { queryKeys } from '@/constant/query';
import { useCrudResource } from '@/hooks/crud';
import type {
  Corridor,
  CreateBorderCrossingInput,
  CreateCorridorInput,
  CreatePlaceInput,
  Place,
  UpdateCorridorInput,
} from '@/interfaces';

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
  const deleteCorridor = useMutation({
    mutationFn: corridorsApi.remove,
    onSuccess: () => {
      crud.invalidate();
      void qc.invalidateQueries({ queryKey: ['vehicles'] });
      void qc.invalidateQueries({ queryKey: queryKeys.rates.all() });
    },
  });
  return { ...crud, createCorridor, deleteCorridor };
};

/** Edits a route; refreshes Routes, every corridor list and the rate catalog, which names it. */
export const useUpdateCorridor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCorridorInput }) =>
      routeCatalogApi.updateCorridor(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['corridors'] });
      void qc.invalidateQueries({ queryKey: queryKeys.rates.all() });
    },
  });
};

/**
 * Routes · Places: every catalogued place, paged and searched by the server. Editing or deleting one
 * also refreshes the place pickers.
 */
export const usePlaceList = () => {
  const qc = useQueryClient();
  const crud = useCrudResource<Place, CreatePlaceInput>('places', placesApi);
  const refresh = () => {
    crud.invalidate();
    void qc.invalidateQueries({ queryKey: PLACES_KEY });
  };
  const updatePlace = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreatePlaceInput }) =>
      placesApi.update(id, body),
    onSuccess: refresh,
  });
  const deletePlace = useMutation({ mutationFn: placesApi.remove, onSuccess: refresh });
  return { ...crud, updatePlace, deletePlace };
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PLACES_KEY });
      void qc.invalidateQueries({ queryKey: ['places'] });
    },
  });
};

/** Sets a route's driving days (US-F7-02); refreshes Routes and every corridor list. */
export const useSetDrivingDays = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, drivingDays }: { id: string; drivingDays: number }) =>
      routeCatalogApi.setDrivingDays(id, drivingDays),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['corridors'] }),
  });
};

/** Edits a crossing; Routes lists crossings by name, so the routes refresh too. */
export const useUpdateBorderCrossing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreateBorderCrossingInput }) =>
      routeCatalogApi.updateBorderCrossing(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['border-crossings'] });
      void qc.invalidateQueries({ queryKey: ['corridors'] });
    },
  });
};

export const useDeleteBorderCrossing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: routeCatalogApi.deleteBorderCrossing,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['border-crossings'] }),
  });
};

export const useCreateBorderCrossing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: routeCatalogApi.createBorderCrossing,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['border-crossings'] }),
  });
};
