import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { incidentApi, incidentsListApi } from '@/apis/incident';
import { useCrudResource } from '@/hooks/crud';
import type {
  DecideIncidentInput,
  DelayAlertInput,
  Incident,
  IncidentOptionInput,
  IncidentStatus,
  IncidentSummary,
  RaiseIncidentInput,
  ResolveIncidentInput,
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

export const useDecideIncident = (id: string) =>
  useIncidentChange(id, (input: DecideIncidentInput) => incidentApi.decide(id, input));

export const useReturnIncidentProposal = (id: string) =>
  useIncidentChange(id, (reason: string) => incidentApi.returnProposal(id, reason));

export const useResolveIncident = (id: string) =>
  useIncidentChange(id, (input: ResolveIncidentInput) => incidentApi.resolve(id, input));

/** A job's incidents with their timelines, on its Trip tab (US-F5-05). */
export const useJobIncidents = (jobId: string) =>
  useQuery({
    // Under 'incidents', so every incident change refreshes the job's record too.
    queryKey: ['incidents', 'job', jobId],
    queryFn: () => incidentApi.ofJob(jobId),
    enabled: Boolean(jobId),
  });

/** A delay alert moves the job's times, so the job and its incidents load again (US-F5-04). */
export const useSendDelayAlert = (jobId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: DelayAlertInput) => incidentApi.sendDelayAlert(jobId, input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['incidents'] }),
        client.invalidateQueries({ queryKey: ['job', jobId] }),
      ]);
    },
  });
};
