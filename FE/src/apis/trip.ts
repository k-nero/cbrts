import apiV1Instance from '@/config/axios';
import type { TripRecordInput, TripRecord, TripView } from '@/interfaces';

export const tripApi = {
  list: async (audience: 'escort' | 'staff' | 'customer') => (await apiV1Instance.get<{ content: TripView[] }>(`/${audience}/trips`, { params: { page: 0, size: 20 } })).data.content,
  get: async (audience: 'escort' | 'staff' | 'customer', code: string) => (await apiV1Instance.get<TripView>(`/${audience}/trips/${code}`)).data,
  record: async (audience: 'escort' | 'staff', code: string, input: TripRecordInput) => (await apiV1Instance.post<TripRecord>(`/${audience}/trips/${code}/records`, input)).data,
  uploadPhoto: async (file: File) => {
    const form = new FormData(); form.append('file', file);
    return (await apiV1Instance.post<{ id: string }>('/files', form)).data;
  },
};
