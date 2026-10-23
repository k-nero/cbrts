import { useMemo } from 'react';
import { Flex, TableColumnsType } from 'antd';

import { INCIDENT_STATUS } from './incidentFormat';

import { Chip, Deadline } from '@/components/ui';
import type { IncidentSummary } from '@/interfaces';

const opened = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Incidents columns (DESIGN.md, Tables): newest first, a row opens the incident. */
export const useGeneratedIncidentColumn = () =>
  useMemo<TableColumnsType<IncidentSummary>>(
    () => [
      {
        title: 'Opened',
        key: 'openedAt',
        dataIndex: 'openedAt',
        width: 160,
        render: (iso: string) => (
          <Deadline tone="neutral" align="start" left="Opened" date={opened(iso)} />
        ),
      },
      {
        title: 'Job',
        key: 'jobCode',
        dataIndex: 'jobCode',
        width: 150,
        render: (code: string) => <span className="type-label-s text-ink">{code}</span>,
      },
      {
        title: 'What happened',
        key: 'summary',
        width: 420,
        render: (_, incident) => (
          <Flex vertical>
            <span className="type-label-s text-ink">
              {incident.kindLabel}
              {incident.horseName ? ` · ${incident.horseName}` : ''}
            </span>
            <span className="type-body-s text-ink-3">
              {[incident.location, incident.summary].filter(Boolean).join(' · ')}
            </span>
          </Flex>
        ),
      },
      {
        title: 'Status',
        key: 'status',
        dataIndex: 'status',
        width: 130,
        render: (status: IncidentSummary['status']) => (
          <Chip tone={INCIDENT_STATUS[status].tone}>{INCIDENT_STATUS[status].label}</Chip>
        ),
      },
      {
        title: 'Owner',
        key: 'ownerName',
        dataIndex: 'ownerName',
        width: 180,
        render: (owner?: string | null) => (
          <span className="type-body-s text-ink">{owner ?? '—'}</span>
        ),
      },
    ],
    [],
  );
