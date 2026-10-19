import client from '@/config/axios';
import type {
  RateCatalogDetail,
  RateCorridorSummary,
  RateServiceClass,
  RateVolumeBreak,
  UpdateServiceClassRequest,
  UpdateVolumeBreakRequest,
} from '@/interfaces';

export const rateApi = {
  getCorridors: () => client.get<RateCorridorSummary[]>('/staff/rates/corridors'),

  getRateCatalogDetails: (params?: { corridorId?: string; versionId?: string }) =>
    client.get<RateCatalogDetail>('/staff/rates/details', { params }),

  createDraft: () => client.post<RateCatalogDetail>('/staff/rates/draft'),

  discardDraft: (versionId: string) => client.delete<void>(`/staff/rates/draft/${versionId}`),

  publishDraft: (versionId: string) =>
    client.post<RateCatalogDetail>(`/staff/rates/draft/${versionId}/publish`),

  updateVolumeBreak: (breakId: string, data: UpdateVolumeBreakRequest) =>
    client.put<RateVolumeBreak>(`/staff/rates/volume-breaks/${breakId}`, data),

  updateServiceClass: (classId: string, data: UpdateServiceClassRequest) =>
    client.put<RateServiceClass>(`/staff/rates/service-classes/${classId}`, data),
};
