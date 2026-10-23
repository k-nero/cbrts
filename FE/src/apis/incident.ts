import client from '@/config/axios';

import { makeCrudApi } from './crudFactory';
import type { Incident, IncidentSummary, RaiseIncidentInput } from '@/interfaces';

/** The Incidents list (Flow 5), newest first; `status` narrows it. */
export const incidentsListApi = makeCrudApi<IncidentSummary, never>('/staff/incidents');

export const incidentApi = {
  get: (id: string) => client.get<Incident>(`/staff/incidents/${id}`).then((r) => r.data),

  /** US-F5-01: the escort reports an emergency on the trip the cab is open on. */
  raise: (jobCode: string, input: RaiseIncidentInput) =>
    client.post<Incident>(`/escort/trips/${jobCode}/incidents`, input).then((r) => r.data),
};
