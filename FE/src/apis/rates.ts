import client from '@/config/axios';

import type {
  RateCatalog,
  RateCorridorView,
  RateLineInput,
  RatePolicyKey,
  RateVersion,
  ServiceClass,
  ServiceClassInput,
  VolumeBreakInput,
} from '@/interfaces';

const BASE = '/staff/rates';

/** The versions, newest first, and the corridors with their missing-rate counts (US-Q-10). */
export const getRateCatalog = (): Promise<RateCatalog> =>
  client.get<RateCatalog>(`${BASE}/catalog`).then((r) => r.data);

/** One corridor's rates in one version. */
export const getRateCorridor = (versionId: string, corridorId: string): Promise<RateCorridorView> =>
  client
    .get<RateCorridorView>(`${BASE}/versions/${versionId}`, { params: { corridorId } })
    .then((r) => r.data);

/** Create the draft from the current version (201), or return the open draft (200). */
export const createRateDraft = (): Promise<RateVersion> =>
  client.post<RateVersion>(`${BASE}/draft`).then((r) => r.data);

/** Discard the draft: 409 NO_DRAFT when there is none. */
export const discardRateDraft = (): Promise<void> =>
  client.delete(`${BASE}/draft`).then(() => undefined);

/** Publish the draft as the current version; the change note is required. */
export const publishRateDraft = (changeNote: string): Promise<RateVersion> =>
  client.post<RateVersion>(`${BASE}/draft/publish`, { changeNote }).then((r) => r.data);

export const putServiceClass = (
  corridorId: string,
  serviceClass: ServiceClass,
  body: ServiceClassInput,
): Promise<RateCorridorView> =>
  client
    .put<RateCorridorView>(
      `${BASE}/draft/corridors/${corridorId}/service-classes/${serviceClass}`,
      body,
    )
    .then((r) => r.data);

export const deleteServiceClass = (
  corridorId: string,
  serviceClass: ServiceClass,
): Promise<RateCorridorView> =>
  client
    .delete<RateCorridorView>(
      `${BASE}/draft/corridors/${corridorId}/service-classes/${serviceClass}`,
    )
    .then((r) => r.data);

/** Writes answer the corridor the page shows (`view`). */
export const addRateLine = (body: RateLineInput, view: string): Promise<RateCorridorView> =>
  client
    .post<RateCorridorView>(`${BASE}/draft/lines`, body, { params: { view } })
    .then((r) => r.data);

export const updateRateLine = (
  lineId: string,
  body: RateLineInput,
  view: string,
): Promise<RateCorridorView> =>
  client
    .put<RateCorridorView>(`${BASE}/draft/lines/${lineId}`, body, { params: { view } })
    .then((r) => r.data);

export const deleteRateLine = (lineId: string, view: string): Promise<RateCorridorView> =>
  client
    .delete<RateCorridorView>(`${BASE}/draft/lines/${lineId}`, { params: { view } })
    .then((r) => r.data);

/** Replace a corridor's own bands (an empty list removes them), or with no corridor the global bands. */
export const putVolumeBreaks = (
  corridorId: string | null,
  bands: VolumeBreakInput[],
  view: string,
): Promise<RateCorridorView> =>
  client
    .put<RateCorridorView>(`${BASE}/draft/volume-breaks`, bands, {
      params: corridorId ? { corridorId, view } : { view },
    })
    .then((r) => r.data);

export const putPolicies = (
  values: Partial<Record<RatePolicyKey, number>>,
  view: string,
): Promise<RateCorridorView> =>
  client
    .put<RateCorridorView>(`${BASE}/draft/policies`, values, { params: { view } })
    .then((r) => r.data);
