import type { FC } from 'react';
import { Spin } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { Button, Panel } from '@/components/ui';
import type { AuthoritySubmission } from '@/interfaces';
import SubmissionCard from './SubmissionCard';

type Props = {
  submissions: AuthoritySubmission[];
  loading: boolean;
  onRecord: () => void;
  onUpdate: (submission: AuthoritySubmission) => void;
};

/** The "Authority Dossiers" section: one card per authority filing for the job. */
const SubmissionList: FC<Props> = ({ submissions, loading, onRecord, onUpdate }) => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="type-h4 m-0 text-ink">Authority Dossiers</h2>
        <p className="type-body-s m-0 text-ink-2">
          Each authority on the transport route requires an independent dossier and is tracked
          against its SLA response window.
        </p>
      </div>
      <span className="type-mono-caption text-ink-3">
        {submissions.length} relevant authorities
      </span>
    </div>

    {loading ? (
      <div className="flex justify-center p-12">
        <Spin size="large" />
      </div>
    ) : submissions.length === 0 ? (
      <Panel className="py-12 text-center">
        <BankOutlined className="mb-3 text-4xl text-ink-3" />
        <h3 className="type-label-m mb-1 text-ink">No authority dossiers found for this job</h3>
        <p className="type-body-s mb-4 text-ink-2">
          Click &quot;Record submission&quot; to log a filing with Veterinary, Customs, or
          Quarantine authorities.
        </p>
        <Button variant="primary" size="sm" onClick={onRecord}>
          Record submission
        </Button>
      </Panel>
    ) : (
      <div className="flex flex-col gap-4">
        {submissions.map((submission) => (
          <SubmissionCard key={submission.id} submission={submission} onUpdate={onUpdate} />
        ))}
      </div>
    )}
  </div>
);

export default SubmissionList;
