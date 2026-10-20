import { type FC, useState } from 'react';
import { App, Flex } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { Button, Callout } from '@/components/ui';
import { useClearanceStatus, useJobQuarantines, useJobSubmissions } from '@/hooks/clearance';
import { type AuthoritySubmission, RoleNameEnum } from '@/interfaces';
import { useAuthStore } from '@/stores/authStore';
import AuthorityGate from './AuthorityGate';
import QuarantineList from './QuarantineList';
import RecordSubmissionModal from './RecordSubmissionModal';
import ScheduleQuarantineModal from './ScheduleQuarantineModal';
import SubmissionList from './SubmissionList';
import UpdateDecisionModal from './UpdateDecisionModal';

type Props = {
  jobId: string;
  jobCode?: string;
  /** The gate and its counts. The Authorities page shows them; the job page has the gate in its header. */
  withGate?: boolean;
};

/**
 * One job's filings with each authority against its SLA, and its pre-export quarantine: the job page's
 * Authorities tab and the body of the Authorities page. The transport specialist records and updates;
 * the logistics manager follows along read-only; the API serves no one else.
 */
const JobAuthorities: FC<Props> = ({ jobId, jobCode, withGate = false }) => {
  const { message } = App.useApp();
  const roles = useAuthStore((state) => state.roles);
  const canEdit = roles.includes(RoleNameEnum.TRANSPORT_SPECIALIST);
  const canRead = canEdit || roles.includes(RoleNameEnum.LOGISTICS_MANAGER);

  // Ask only for what this role may read: a 403 before any data arrives would take down the job page.
  const submissions = useJobSubmissions(canRead ? jobId : null);
  const quarantines = useJobQuarantines(canRead ? jobId : null);
  const status = useClearanceStatus(canEdit ? jobId : null);

  const [recording, setRecording] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [updating, setUpdating] = useState<AuthoritySubmission | null>(null);

  if (!canRead)
    return (
      <Callout tone="info" title="Authority filings are kept by the transport specialist">
        The transport specialist files each dossier and records quarantine; the logistics manager
        follows them here.
      </Callout>
    );

  const loading = submissions.isLoading || quarantines.isLoading || status.isLoading;
  const refresh = () => {
    void submissions.refetch();
    void quarantines.refetch();
    if (canEdit) void status.refetch();
    message.success('Latest data refreshed.');
  };

  return (
    <Flex vertical gap={28}>
      <Flex gap={8} wrap="wrap" justify="flex-end">
        <Button
          variant="secondary"
          size="sm"
          leadingIcon="history"
          onClick={refresh}
          disabled={loading}
        >
          Refresh
        </Button>
        {canEdit && (
          <>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon="plus"
              onClick={() => setScheduling(true)}
            >
              Schedule quarantine
            </Button>
            <Button variant="primary" size="sm" onClick={() => setRecording(true)}>
              <SendOutlined className="mr-1" /> Record submission
            </Button>
          </>
        )}
      </Flex>

      {withGate && canEdit && (
        <AuthorityGate
          jobId={jobId}
          jobCode={jobCode}
          status={status.data ?? undefined}
          submissions={submissions.data ?? []}
        />
      )}

      <SubmissionList
        submissions={submissions.data ?? []}
        loading={submissions.isLoading}
        onRecord={canEdit ? () => setRecording(true) : undefined}
        onUpdate={canEdit ? setUpdating : undefined}
      />

      <QuarantineList
        jobId={jobId}
        quarantines={quarantines.data ?? []}
        loading={quarantines.isLoading}
        onSchedule={canEdit ? () => setScheduling(true) : undefined}
        minDays={status.data?.quarantineMinDays ?? undefined}
        destination={status.data?.destination ?? undefined}
      />

      {canEdit && (
        <>
          <RecordSubmissionModal
            open={recording}
            jobId={jobId}
            onClose={() => setRecording(false)}
          />
          <UpdateDecisionModal
            submission={updating}
            jobId={jobId}
            onClose={() => setUpdating(null)}
          />
          <ScheduleQuarantineModal
            open={scheduling}
            jobId={jobId}
            minDays={status.data?.quarantineMinDays ?? undefined}
            destination={status.data?.destination ?? undefined}
            onClose={() => setScheduling(false)}
          />
        </>
      )}
    </Flex>
  );
};

export default JobAuthorities;
