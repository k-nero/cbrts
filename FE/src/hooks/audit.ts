import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { auditApi, type AuditFilters } from '@/apis/audit';
import { queryKeys } from '@/constant/query';
import { useReadOnlyResource } from '@/hooks/crud';
import type { AuditEntry } from '@/interfaces';
import { ict } from '@/lib';

/** Strip unset filters so the query key stays stable. */
const definedOnly = (filters: AuditFilters & { q?: string }) => {
  const set = Object.entries(filters).filter(([, v]) => v !== undefined && v !== '');
  return set.length > 0 ? (Object.fromEntries(set) as Record<string, string>) : undefined;
};

/**
 * The audit log list (logistics manager): paging, newest first on When, search (`q`) and the
 * Person, Action and When filters.
 */
export const useAuditLog = (filters: AuditFilters) => {
  const { actor, action, from, to } = filters;
  const extra = useMemo(() => definedOnly({ actor, action, from, to }), [actor, action, from, to]);
  return useReadOnlyResource<AuditEntry>(queryKeys.audit.all()[0], auditApi.list, undefined, extra);
};

export const useAuditActors = () =>
  useQuery({ queryKey: queryKeys.audit.actors(), queryFn: auditApi.actors, staleTime: 60_000 });

export const useAuditActions = () =>
  useQuery({ queryKey: queryKeys.audit.actions(), queryFn: auditApi.actions, staleTime: 60_000 });

/** Downloads the filtered entries as a CSV file. */
export const useExportAuditCsv = () =>
  useMutation({
    mutationFn: async (params: AuditFilters & { q?: string }) => {
      const blob = await auditApi.exportCsv(definedOnly(params) ?? {});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${ict(new Date().toISOString()).format('YYYY-MM-DD')}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });
