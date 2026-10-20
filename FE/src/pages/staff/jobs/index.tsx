import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { TableToolbarRefreshButton } from '@/components/table';
import { Chip, Deadline, Icon, StageMark } from '@/components/ui';
import { useJobs } from '@/hooks/useJob';
import type { JobSummary } from '@/interfaces';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'NEEDS_ME', label: 'Needs me' },
  { key: 'BLOCKED', label: 'Blocked' },
  { key: 'IN_TRANSIT', label: 'In transit' },
] as const;

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

export default function JobsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'NEEDS_ME' | 'BLOCKED' | 'IN_TRANSIT'>('ALL');
  const [q, setQ] = useState('');

  const { data, isLoading, isFetching, isError, error, refetch } = useJobs({ filter, q });
  const jobs = data?.content ?? [];

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="type-display-m text-ink">Jobs</h1>
        <p className="type-body-m text-ink-2">
          Approved transport jobs moving through clearance, load planning, routes and handover.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`focus-ring cursor-pointer rounded-full px-3.5 py-1.5 transition-colors ${
                  active ? 'bg-ink text-canvas font-medium' : 'bg-muted text-ink-2 hover:bg-raised'
                }`}
              >
                <span className="type-label-s">{f.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-64">
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-2.5 text-ink-3 pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search code..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="focus-ring h-9 w-full rounded-md border border-line bg-card pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-3"
            />
          </div>
          <TableToolbarRefreshButton
            onClick={() => void refetch()}
            spin={isFetching && !isLoading}
          />
        </div>
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <span className="type-body-s text-ink-3">Loading jobs...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-bad/30 bg-bad-soft p-6">
          <p className="type-label-m text-bad">Failed to load jobs</p>
          <p className="type-body-s text-bad mt-1">{(error as Error)?.message}</p>
        </div>
      )}

      {!isLoading && !isError && jobs.length === 0 && (
        <div className="rounded-lg border border-dashed border-line p-12 text-center">
          <p className="type-h4 text-ink-2">No jobs found</p>
          <p className="type-body-s text-ink-3 mt-1">
            {q ? 'No jobs match your search criteria.' : 'No transport jobs in this view.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && jobs.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line bg-card shadow-xs">
          <table className="w-full border-collapse text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-line bg-muted">
                <th className="type-mono-label px-4 py-3 text-ink-3">Code</th>
                <th className="type-mono-label px-4 py-3 text-ink-3">Route</th>
                <th className="type-mono-label px-4 py-3 text-ink-3">Horses</th>
                <th className="type-mono-label px-4 py-3 text-ink-3">Stage</th>
                <th className="type-mono-label px-4 py-3 text-ink-3">Departure</th>
                <th className="type-mono-label px-4 py-3 text-ink-3">Status</th>
                <th className="type-mono-label px-4 py-3 text-ink-3">Next step owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {jobs.map((job: JobSummary) => (
                <tr
                  key={job.id}
                  onClick={() => navigate(`/staff/jobs/${job.id}`)}
                  className="cursor-pointer transition-colors hover:bg-sunken"
                >
                  <td className="type-data px-4 py-4 text-ink">{job.code}</td>
                  <td className="px-4 py-4">
                    <span className="type-label-s text-ink">
                      {job.originCity} → {job.destinationCity}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="type-label-s text-ink">
                        {job.horseCount} {job.horseCount === 1 ? 'horse' : 'horses'}
                      </span>
                      {job.horseNames && job.horseNames.length > 0 && (
                        <span className="type-body-s text-ink-3">{job.horseNames.join(', ')}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StageMark stage={STAGE_MAP[job.stage] || 'Approval'} />
                  </td>
                  <td className="px-4 py-4">
                    {job.plannedDepartureAt ? (
                      <Deadline
                        tone="neutral"
                        align="start"
                        left="Departure"
                        date={new Date(job.plannedDepartureAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      />
                    ) : (
                      <span className="type-body-s text-ink-3">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {job.blockingReason ? (
                      <Chip tone="bad">{job.blockingReason}</Chip>
                    ) : (
                      <Chip tone="ok">Clear to depart</Chip>
                    )}
                  </td>
                  <td className="type-label-s px-4 py-4 text-ink">{job.nextStepOwner || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
