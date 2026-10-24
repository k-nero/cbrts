import type { FC } from 'react';
import { Flex, Skeleton } from 'antd';
import { Link } from 'react-router-dom';

import { Chip, Panel } from '@/components/ui';
import { useJobIncidents } from '@/hooks/incident';
import { formatDayTime } from '@/lib/utils';
import { INCIDENT_STATUS } from '@/pages/staff/incidents/incidentFormat';

/**
 * The job's incidents, oldest first, each with its timeline from the audit trail (US-F5-05): the trip record keeps
 * what happened, who decided what, and how each one was closed.
 */
export const JobIncidents: FC<{ jobId: string; action?: React.ReactNode }> = ({
  jobId,
  action,
}) => {
  const { data: incidents, isLoading } = useJobIncidents(jobId);
  return (
    <Panel title="Incidents" extra={action} flush>
      {isLoading ? (
        <div className="p-6">
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      ) : !incidents?.length ? (
        <p className="type-body-m m-0 px-6 py-5 text-ink-2">
          No incidents on this job. A report from the cab or a delay alert appears here with its
          timeline.
        </p>
      ) : (
        <ol className="m-0 list-none p-0">
          {incidents.map((incident, i) => {
            const status = INCIDENT_STATUS[incident.status];
            return (
              <li key={incident.id} className={`px-6 py-5 ${i > 0 ? 'border-t border-line' : ''}`}>
                <Flex vertical gap={12}>
                  <Flex align="start" justify="space-between" gap={16}>
                    <Flex vertical gap={4} className="min-w-0">
                      <Link
                        to={`/staff/incidents/${incident.id}`}
                        className="type-label-m text-ink! underline"
                      >
                        {incident.kindLabel}
                      </Link>
                      <span className="type-body-s text-ink-2">{incident.summary}</span>
                    </Flex>
                    <Chip tone={status.tone}>{status.label}</Chip>
                  </Flex>
                  {incident.resolution && (
                    <div className="rounded-md bg-sunken px-4 py-3">
                      <p className="type-label-s m-0 text-ink">{incident.resolution}</p>
                      {incident.closingNote && (
                        <p className="type-body-s m-0 mt-1 text-ink-2">{incident.closingNote}</p>
                      )}
                    </div>
                  )}
                  <ol className="m-0 list-none border-l border-line-strong p-0 pl-4">
                    {incident.timeline.map((entry, j) => (
                      <li
                        key={`${entry.occurredAt}-${j}`}
                        className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-1.5"
                      >
                        <span className="type-caption pt-0.5 text-ink-3">
                          {formatDayTime(entry.occurredAt)}
                        </span>
                        <span className="type-body-s text-ink">
                          {entry.summary}
                          <span className="text-ink-3"> · {entry.actorLabel}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </Flex>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
};
