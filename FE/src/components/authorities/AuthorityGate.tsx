import type { FC } from 'react';
import { App } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Button, ClearanceGate, StatTile } from '@/components/ui';
import { useEvaluateClearanceGate } from '@/hooks/clearance';
import { type AuthoritySubmission, type ClearanceStatus, SubmissionStatusEnum } from '@/interfaces';

type Props = {
  jobId: string | null;
  /** The selected job's code, while the clearance status is still loading. */
  jobCode?: string;
  status?: ClearanceStatus;
  submissions: AuthoritySubmission[];
};

/** The departure gate for the job, then the four submission counts. */
const AuthorityGate: FC<Props> = ({ jobId, jobCode, status, submissions }) => {
  const { message } = App.useApp();
  const evaluateGate = useEvaluateClearanceGate(jobId);
  const code = status?.jobCode ?? jobCode ?? 'Job';

  const total = submissions.length;
  const approved = submissions.filter((s) => s.status === SubmissionStatusEnum.ISSUED).length;
  const overdue = submissions.filter(
    (s) => s.isOverdue || s.status === SubmissionStatusEnum.REFUSED,
  ).length;
  const withAuthorities = submissions.filter(
    (s) =>
      s.status === SubmissionStatusEnum.FILED ||
      s.status === SubmissionStatusEnum.READY_TO_FILE ||
      s.status === SubmissionStatusEnum.ADDITIONAL_INFO,
  ).length;

  const reEvaluate = async () => {
    try {
      await evaluateGate.mutateAsync();
      message.success('Clearance gate re-evaluated successfully.');
    } catch {
      message.error('Failed to evaluate clearance gate.');
    }
  };

  const isDeparted = Boolean(status?.departedAt || status?.isDeparted);
  const gateState = isDeparted ? 'departed' : status?.clearanceReady ? 'clear' : 'locked';
  const gateTitle = isDeparted
    ? `Departed (${code})`
    : status?.clearanceReady
      ? `Clearance Gate OPEN (${code})`
      : `Clearance Gate LOCKED (${code})`;

  return (
    <>
      <ClearanceGate
        state={gateState}
        title={gateTitle}
        action={
          !isDeparted && (
            <Button
              variant="secondary"
              size="sm"
              disabled={evaluateGate.isPending}
              onClick={reEvaluate}
            >
              <ReloadOutlined spin={evaluateGate.isPending} className="mr-1" />
              Re-evaluate gate
            </Button>
          )
        }
      >
        {isDeparted ? (
          'The job has departed. The dossier is frozen.'
        ) : status?.clearanceReady ? (
          'All required veterinary certificates, customs clearances, and quarantine periods have been completed. The convoy is cleared for departure.'
        ) : status?.outstandingIssues && status.outstandingIssues.length > 0 ? (
          <ul className="m-0 list-disc pl-4 text-[13px] text-bad">
            {status.outstandingIssues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        ) : (
          'Authority filings are in progress or quarantine periods are pending completion before the departure gate can clear.'
        )}
      </ClearanceGate>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          tone="neutral"
          value={total}
          label="Total submissions"
          lead={`Job: ${status?.jobCode ?? jobCode ?? '—'}`}
        />
        <StatTile
          tone="info"
          value={withAuthorities}
          label="With the authorities"
          lead="Tracked against SLA"
        />
        <StatTile
          tone="ok"
          value={approved}
          label="Approved & issued"
          lead={`${approved}/${total} dossiers cleared`}
        />
        <StatTile
          tone={overdue > 0 ? 'bad' : 'neutral'}
          value={overdue}
          label="Overdue SLA / Refused"
          lead={overdue > 0 ? 'Requires immediate action' : 'On schedule'}
        />
      </div>
    </>
  );
};

export default AuthorityGate;
