import apiV1Instance from '@/config/axios';

export const fileApi = {
  getBlob: async (contentUrl: string) => {
    const path = contentUrl.replace('/api/v1', '');
    return (await apiV1Instance.get<Blob>(path, { responseType: 'blob' })).data;
  },
};
