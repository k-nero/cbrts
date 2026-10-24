import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { incidentApi, incidentsListApi } from '@/apis/incident';
import { useCrudResource } from '@/hooks/crud';
import type { IncidentStatus, IncidentSummary, RaiseIncidentInput } from '@/interfaces';

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
