import client from '@/config/axios';

import { makeCrudApi } from './crudFactory';
import type {
  DecideIncidentInput,
  Incident,
  IncidentOptionInput,
  IncidentSummary,
  RaiseIncidentInput,
} from '@/interfaces';

/** The Incidents list (Flow 5), newest first; `status` narrows it. */
export const incidentsListApi = makeCrudApi<IncidentSummary, never>('/staff/incidents');

export const incidentApi = {
  get: (id: string) => client.get<Incident>(`/staff/incidents/${id}`).then((r) => r.data),

  /** US-F5-02: record an option, with its cost and delay. */
  addOption: (id: string, input: IncidentOptionInput) =>
    client.post<Incident>(`/staff/incidents/${id}/options`, input).then((r) => r.data),

  removeOption: (id: string, optionId: string) =>
    client.delete<Incident>(`/staff/incidents/${id}/options/${optionId}`).then((r) => r.data),

  /** US-F5-02: propose one option for the logistics manager's approval. */
  propose: (id: string, optionId: string, note?: string) =>
    client
      .post<Incident>(`/staff/incidents/${id}/proposal`, { optionId, note })
      .then((r) => r.data),

  /** US-F5-03: the logistics manager approves the proposed option. */
  decide: (id: string, input: DecideIncidentInput) =>
    client.post<Incident>(`/staff/incidents/${id}/decision`, input).then((r) => r.data),

  /** US-F5-03: the logistics manager sends the proposal back, saying why. */
  returnProposal: (id: string, reason: string) =>
    client.post<Incident>(`/staff/incidents/${id}/proposal/return`, { reason }).then((r) => r.data),

  /** US-F5-01: the escort reports an emergency on the trip the cab is open on. */
  raise: (jobCode: string, input: RaiseIncidentInput) =>
    client.post<Incident>(`/escort/trips/${jobCode}/incidents`, input).then((r) => r.data),
};
