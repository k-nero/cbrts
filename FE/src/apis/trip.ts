import apiV1Instance from '@/config/axios';
import type { TripPage, TripRecordInput, TripRecord, TripView } from '@/interfaces';

export const tripApi = {
  list: async (audience: 'escort' | 'staff' | 'customer', page: number) =>
    (await apiV1Instance.get<TripPage>(`/${audience}/trips`, { params: { page, size: 20 } })).data,
  get: async (audience: 'escort' | 'staff' | 'customer', code: string) =>
    (await apiV1Instance.get<TripView>(`/${audience}/trips/${code}`)).data,
  record: async (audience: 'escort' | 'staff', code: string, input: TripRecordInput) =>
    (await apiV1Instance.post<TripRecord>(`/${audience}/trips/${code}/records`, input)).data,
};
