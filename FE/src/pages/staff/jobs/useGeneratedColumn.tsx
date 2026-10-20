import { useMemo } from 'react';
import { TableColumnsType } from 'antd';

import { Chip, Deadline, StageMark } from '@/components/ui';
import type { JobSummary } from '@/interfaces';

const STAGE_MAP: Record<
  string,
  'Request' | 'Quotation' | 'Approval' | 'Documents' | 'Clearance' | 'Trip' | 'Handover'
> = {
  REQUEST: 'Request',
  QUOTATION: 'Quotation',
  APPROVAL: 'Approval',
  DOCUMENTS: 'Documents',
  CLEARANCE: 'Clearance',
  TRIP: 'Trip',
  HANDOVER: 'Handover',
  CLOSED: 'Handover',
};

const departure = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Jobs columns (DESIGN.md, Tables). Job and Departure sort on the server; Stage should sort in stage order,
 * which the server can't do yet (the stage is stored as text), so it isn't sortable here.
 */
export const useGeneratedJobColumn = () =>
  useMemo<TableColumnsType<JobSummary>>(
    () => [
      {
        title: 'Job',
        key: 'code',
        dataIndex: 'code',
        width: 150,
        sorter: true,
        render: (code: string) => <span className="type-label-s text-ink">{code}</span>,
      },
      {
        title: 'Route',
        key: 'route',
        width: 250,
        render: (_, job) => (
          <span className="type-label-s text-ink">
            {job.originCity} → {job.destinationCity}
          </span>
        ),
      },
      {
        title: 'Horses',
        key: 'horses',
        width: 350,
        render: (_, job) => (
          <div className="flex flex-col">
            <span className="type-label-s text-ink">
              {job.horseCount} {job.horseCount === 1 ? 'horse' : 'horses'}
            </span>
            {job.horseNames?.length > 0 && (
              <span className="type-body-s text-ink-3">{job.horseNames.join(', ')}</span>
            )}
          </div>
        ),
      },
      {
        title: 'Stage',
        key: 'stage',
        dataIndex: 'stage',
        width: 150,
        render: (stage: string) => <StageMark stage={STAGE_MAP[stage] || 'Approval'} />,
      },
      {
        title: 'Departure',
        key: 'plannedDepartureAt',
        dataIndex: 'plannedDepartureAt',
        width: 170,
        sorter: true,
        render: (iso?: string | null) =>
          iso ? (
            <Deadline tone="neutral" align="start" left="Departure" date={departure(iso)} />
          ) : (
            <span className="type-body-s text-ink-3">—</span>
          ),
      },
      {
        title: 'Status',
        key: 'status',
        width: 400,
        render: (_, job) =>
          job.blockingReason ? (
            <Chip tone="bad">{job.blockingReason}</Chip>
          ) : (
            <Chip tone="ok">Clear to depart</Chip>
          ),
      },
      {
        title: 'Next step owner',
        key: 'nextStepOwner',
        width: 200,
        dataIndex: 'nextStepOwner',
        render: (owner?: string | null) => (
          <span className="type-label-s text-ink">{owner || '—'}</span>
        ),
      },
    ],
    [],
  );
