import { type FC, useState } from 'react';
import { Empty, Flex, Select, Spin } from 'antd';
import { Button } from '@/components/ui';
import { useClearanceJobs, useClearanceStatus } from '@/hooks/clearance';
import type { ChecklistItem } from '@/interfaces';
import ClearanceChecklist from './ClearanceChecklist';

type Props = {
  jobId: string | null;
  onSelectJob: (jobId: string | null) => void;
  onView: (fileId: string) => void;
  onUpload: (item: ChecklistItem) => void;
};

/** The "Job checklist and gate" tab: pick a job, then its gate, counts and checklist. */
const JobChecklist: FC<Props> = ({ jobId, onSelectJob, onView, onUpload }) => {
  const [jobSearch, setJobSearch] = useState('');
  const { data: jobs = [], isFetching: jobsLoading } = useClearanceJobs(jobSearch);
  // Only to label a job opened by link that isn't in the open-dossier list.
  const { data: status } = useClearanceStatus(jobId);

  return (
    <Flex vertical gap={24}>
      {/* Job picker: open dossiers, searched on the server by code or club */}
      <div className="rounded-lg border border-line bg-card p-4">
        <Flex align="center" gap={16}>
          <span className="type-label-s shrink-0 text-ink-2">Job</span>
          <Select
            showSearch={{ onSearch: setJobSearch, filterOption: false }}
            placeholder="Search by job code or club"
            value={jobId || undefined}
            onChange={(value) => onSelectJob(value ?? null)}
            loading={jobsLoading}
            className="w-full max-w-md"
            notFoundContent={jobsLoading ? <Spin size="small" /> : 'No open dossier matches'}
            options={[
              ...jobs.map((job) => ({
                value: job.id,
                label: `${job.code}${job.clubName ? ' · ' + job.clubName : ''}`,
              })),
              // A job opened by link (e.g. a departed one) may not be in the open-dossier list; label it by its code.
              ...(jobId && status && !jobs.some((job) => job.id === jobId)
                ? [{ value: jobId, label: status.jobCode }]
                : []),
            ]}
          />
          {jobId && (
            <Button variant="secondary" size="sm" onClick={() => onSelectJob(null)}>
              Clear
            </Button>
          )}
        </Flex>
      </div>

      {!jobId && (
        <div className="rounded-lg border border-line bg-card p-12 text-center">
          <Empty
            description="Choose a job to see its checklist and clearance gate."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      )}

      {jobId && <ClearanceChecklist jobId={jobId} onView={onView} onUpload={onUpload} />}
    </Flex>
  );
};

export default JobChecklist;
