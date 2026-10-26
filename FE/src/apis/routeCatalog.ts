import client from '@/config/axios';
import { makeCrudApi } from './crudFactory';
import type {
  BorderCrossing,
  CountryOption,
  Corridor,
  CreateBorderCrossingInput,
  CreateCorridorInput,
  CreatePlaceInput,
  Place,
} from '@/interfaces';

/** The routes we run, paged and sorted by the server; the coordinator adds new ones. */
export const corridorsApi = makeCrudApi<Corridor, CreateCorridorInput>('/staff/corridors');

/** The places, border crossings and countries a new route is built from. */
export const routeCatalogApi = {
  /** Every catalogued place; there are a few hundred at most. */
  places: () =>
    client
      .get<{ content: Place[] }>('/staff/places', { params: { size: 500 } })
      .then((r) => r.data.content),
  createPlace: (body: CreatePlaceInput) =>
    client.post<Place>('/staff/places', body).then((r) => r.data),
  createBorderCrossing: (body: CreateBorderCrossingInput) =>
    client.post<BorderCrossing>('/staff/border-crossings', body).then((r) => r.data),
  countries: () => client.get<CountryOption[]>('/staff/countries').then((r) => r.data),
};
