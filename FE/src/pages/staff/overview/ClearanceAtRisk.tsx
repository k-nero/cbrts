import type { FC } from 'react';
import { Flex } from 'antd';
import { Link } from 'react-router-dom';

import { Panel } from '@/components/ui';
import type { JobSummary } from '@/interfaces';
import { formatDayTime } from '@/lib/utils';

/**
 * Clearance at risk (DESIGN.md, Overview): the blocked jobs leaving soonest, each with what holds it in the Jobs
 * list's own words, never a second description.
 */
export const ClearanceAtRisk: FC<{ jobs: JobSummary[]; total: number }> = ({ jobs, total }) => (
  <Panel
    title="Clearance at risk"
    extra={
      total > jobs.length ? (
        <Link to="/staff/jobs?filter=BLOCKED" className="type-label-s text-ink-2! underline">
          All {total}
        </Link>
      ) : undefined
    }
  >
    {jobs.length === 0 ? (
      <p className="type-body-m m-0 text-ink-2">Every job's dossier is cleared.</p>
    ) : (
      <Flex vertical gap={12}>
        {jobs.map((j) => (
          <Link
            key={j.id}
            to={`/staff/jobs/${j.id}?tab=clearance`}
            className="flex flex-col gap-1 rounded-md border border-line bg-sunken p-3.5 text-inherit no-underline hover:border-line-strong"
          >
            <Flex align="baseline" gap={10}>
              <span className="type-data shrink-0 whitespace-nowrap text-ink">{j.code}</span>
              <span className="type-body-s truncate text-ink-3">
                {j.originCity} → {j.destinationCity}
              </span>
            </Flex>
            <span className="type-label-s text-bad">{j.blockingReason ?? 'Clearance pending'}</span>
            <span className="type-body-s text-ink-3">
              {j.plannedDepartureAt
                ? `Departs ${formatDayTime(j.plannedDepartureAt)}`
                : 'No departure planned yet'}
              {j.nextStepOwner ? ` · ${j.nextStepOwner}` : ''}
            </span>
          </Link>
        ))}
      </Flex>
    )}
  </Panel>
);
