import type { FC } from 'react';
import { Select, Tag } from 'antd';
import type { JobSummary } from '@/interfaces';

type Props = {
  jobs: JobSummary[];
  loading: boolean;
  jobId: string | null;
  /** The job's code from its clearance status, for a job that isn't in the open list. */
  fallbackCode?: string;
  onSelect: (jobId: string | null) => void;
  onSearch: (q: string) => void;
};

/** Picks the transport job the page works on and shows its crossing route. */
const JobBar: FC<Props> = ({ jobs, loading, jobId, fallbackCode, onSelect, onSearch }) => {
  const selected = jobs.find((job) => job.id === jobId);
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
          options={jobs.map((job) => ({
            label: `${job.code} · ${job.clubName ? job.clubName + ' ' : ''}(${job.originCity} → ${job.destinationCity})`,
            value: job.id,
          }))}
          className="w-[380px] sm:w-[460px]"
          size="middle"
        />
      </div>
      <div className="flex items-center gap-2 text-[13px] text-ink-2">
        <span>Crossing route:</span>
        <Tag color="cyan">
          {selected
            ? `${selected.originCity} → ${selected.destinationCity}`
            : (fallbackCode ?? 'In transit')}
        </Tag>
      </div>
    </div>
  );
};

export default JobBar;
