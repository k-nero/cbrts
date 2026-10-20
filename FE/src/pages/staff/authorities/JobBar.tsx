import type { FC } from 'react';
import { Select } from 'antd';
import { Chip } from '@/components/ui';
import type { ClearanceJobSummary } from '@/interfaces';

type Props = {
  jobs: ClearanceJobSummary[];
  loading: boolean;
  jobId: string | null;
  onSelect: (jobId: string | null) => void;
  onSearch: (q: string) => void;
};

/** "Hà Nội → Phnom Penh", or null while the request lacks either place. */
const routeOf = (job?: ClearanceJobSummary) =>
  job?.originCity && job.destinationCity ? `${job.originCity} → ${job.destinationCity}` : null;

/** Picks the transport job the page works on and shows its route. */
const JobBar: FC<Props> = ({ jobs, loading, jobId, onSelect, onSearch }) => {
  const route = routeOf(jobs.find((job) => job.id === jobId));
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="type-label-s text-ink-2">Transport job:</span>
        <Select
          showSearch
          placeholder="Search by job code or club"
          value={jobId ?? undefined}
          onChange={(value) => onSelect(value ?? null)}
          onSearch={onSearch}
          loading={loading}
          filterOption={false}
          options={jobs.map((job) => ({
            label: [job.code, job.clubName, routeOf(job)].filter(Boolean).join(' · '),
            value: job.id,
          }))}
          className="w-[380px] sm:w-[460px]"
          size="middle"
        />
      </div>
      <div className="type-body-s flex items-center gap-2 text-ink-2">
        <span>Route:</span>
        <Chip tone="neutral" dot={false}>
          {route ?? 'Not set on the request'}
        </Chip>
      </div>
    </div>
  );
};

export default JobBar;
