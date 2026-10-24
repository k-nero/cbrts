import apiV1Instance from '@/config/axios';
import type { TripPage, TripRecord, TripRecordInput, TripView } from '@/interfaces';

export const tripApi = {
  list: async (audience: 'escort' | 'staff' | 'customer', page: number) =>
    (await apiV1Instance.get<TripPage>(`/${audience}/trips`, { params: { page, size: 20 } })).data,
  /** `tripId` opens one part of a job an incident split across trips (staff and customer, US-F5-06). */
  get: async (audience: 'escort' | 'staff' | 'customer', code: string, tripId?: string) =>
    (
      await apiV1Instance.get<TripView>(`/${audience}/trips/${code}`, {
        params: tripId ? { trip: tripId } : undefined,
      })
    ).data,
  record: async (
    audience: 'escort' | 'staff',
    code: string,
    input: TripRecordInput,
    tripId?: string,
  ) =>
    (
      await apiV1Instance.post<TripRecord>(`/${audience}/trips/${code}/records`, input, {
        params: tripId ? { trip: tripId } : undefined,
      })
    ).data,
};
