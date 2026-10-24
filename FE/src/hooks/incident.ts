import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { incidentApi, incidentsListApi } from '@/apis/incident';
import { useCrudResource } from '@/hooks/crud';
import type {
  Incident,
  IncidentOptionInput,
  IncidentStatus,
  IncidentSummary,
  RaiseIncidentInput,
} from '@/interfaces';

export const useIncidentList = (status?: IncidentStatus) => {
  const extra = useMemo(() => (status ? { status } : undefined), [status]);
  return useCrudResource<IncidentSummary, never>('incidents', incidentsListApi, undefined, extra);
};

export const useIncident = (id: string) =>
  useQuery({
    queryKey: ['incident', id],
    queryFn: () => incidentApi.get(id),
    enabled: Boolean(id),
  });

export const useRaiseIncident = (jobCode: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: RaiseIncidentInput) => incidentApi.raise(jobCode, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ['incidents'] }),
  });
};

/** An incident change: the page shows the incident the server returns, and the list refetches. */
const useIncidentChange = <V>(id: string, change: (v: V) => Promise<Incident>) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: change,
    onSuccess: async (incident) => {
      client.setQueryData(['incident', id], incident);
      await client.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
};

export const useAddIncidentOption = (id: string) =>
  useIncidentChange(id, (input: IncidentOptionInput) => incidentApi.addOption(id, input));

export const useRemoveIncidentOption = (id: string) =>
  useIncidentChange(id, (optionId: string) => incidentApi.removeOption(id, optionId));

export const useProposeIncidentOption = (id: string) =>
  useIncidentChange(id, (v: { optionId: string; note?: string }) =>
    incidentApi.propose(id, v.optionId, v.note),
  );
