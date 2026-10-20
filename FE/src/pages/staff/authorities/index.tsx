import { type FC, useState } from 'react';
import { App, Flex } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui';
import {
  useAuthorities,
  useClearanceJobs,
  useClearanceStatus,
  useJobQuarantines,
  useJobSubmissions,
} from '@/hooks/clearance';
import type { AuthoritySubmission } from '@/interfaces';
import AuthorityGate from './AuthorityGate';
import JobBar from './JobBar';
import QuarantineList from './QuarantineList';
import RecordSubmissionModal from './RecordSubmissionModal';
import ScheduleQuarantineModal from './ScheduleQuarantineModal';
import SubmissionList from './SubmissionList';
import UpdateDecisionModal from './UpdateDecisionModal';

/**
 * The transport specialist's Authorities page: a job's filings with each authority against its SLA,
 * its pre-export quarantine, and the clearance gate they feed.
 */
const AuthoritiesPage: FC = () => {
  const { message } = App.useApp();
  const [jobSearch, setJobSearch] = useState('');
  const { data: jobs = [], isLoading: loadingJobs } = useClearanceJobs(jobSearch);
  const [jobId, setJobId] = useState<string | null>(null);
  // Until the specialist picks one, the page settles on the first open job, and keeps it while they search.
  if (jobId === null && jobs.length > 0) setJobId(jobs[0].id);
  const selectedJob = jobs.find((job) => job.id === jobId);

  const { isLoading: loadingAuthorities } = useAuthorities();
  const submissions = useJobSubmissions(jobId);
  const quarantines = useJobQuarantines(jobId);
  const status = useClearanceStatus(jobId);

  const [recording, setRecording] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [updating, setUpdating] = useState<AuthoritySubmission | null>(null);

  const loading =
    submissions.isLoading || quarantines.isLoading || loadingAuthorities || status.isLoading;

  const refresh = () => {
    void submissions.refetch();
    void quarantines.refetch();
    void status.refetch();
    message.success('Latest data refreshed.');
  };

  return (
    <Flex vertical gap={28} className="max-w-[1240px] pb-16">
      <PageHeader
        title="Authorities & Submissions"
        summary="Transport Specialist: File dossiers with veterinary and border customs authorities, track approvals against committed SLAs, and record quarantine inspections."
        right={
          <Flex gap={8} wrap="wrap">
            <Button
              variant="secondary"
              size="sm"
              leadingIcon="history"
              onClick={refresh}
              disabled={loading}
            >
              Refresh
            </Button>
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
          </Flex>
        }
      />

      <JobBar
        jobs={jobs}
        loading={loadingJobs}
        jobId={jobId}
        onSelect={setJobId}
        onSearch={setJobSearch}
      />

      <AuthorityGate
        jobId={jobId}
        jobCode={selectedJob?.code}
        status={status.data ?? undefined}
        submissions={submissions.data ?? []}
      />

      <SubmissionList
        submissions={submissions.data ?? []}
        loading={submissions.isLoading}
        onRecord={() => setRecording(true)}
        onUpdate={setUpdating}
      />

      <QuarantineList
        jobId={jobId}
        quarantines={quarantines.data ?? []}
        loading={quarantines.isLoading}
        onSchedule={() => setScheduling(true)}
        minDays={status.data?.quarantineMinDays ?? undefined}
        destination={status.data?.destination ?? undefined}
      />

      <RecordSubmissionModal open={recording} jobId={jobId} onClose={() => setRecording(false)} />
      <UpdateDecisionModal submission={updating} jobId={jobId} onClose={() => setUpdating(null)} />
      <ScheduleQuarantineModal
        open={scheduling}
        jobId={jobId}
        minDays={status.data?.quarantineMinDays ?? undefined}
        destination={status.data?.destination ?? undefined}
        onClose={() => setScheduling(false)}
      />
    </Flex>
  );
};

export default AuthoritiesPage;
