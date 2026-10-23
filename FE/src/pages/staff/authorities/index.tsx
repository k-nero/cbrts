import { type FC, useState } from 'react';
import { Flex } from 'antd';
import JobAuthorities from '@/components/authorities/JobAuthorities';
import PageHeader from '@/components/PageHeader';
import { useClearanceJobs } from '@/hooks/clearance';
import JobBar from './JobBar';

/**
 * The transport specialist's Authorities page: pick a job, then its filings with each authority against
 * their SLA, its pre-export quarantine, and the clearance gate they feed. The job page's Authorities tab
 * shows the same, for its own job.
 */
const AuthoritiesPage: FC = () => {
  const [jobSearch, setJobSearch] = useState('');
  const { data: jobs = [], isLoading: loadingJobs } = useClearanceJobs(jobSearch);
  const [jobId, setJobId] = useState<string | null>(null);
  // Until the specialist picks one, the page settles on the first open job, and keeps it while they search.
  if (jobId === null && jobs.length > 0) setJobId(jobs[0].id);
  const selectedJob = jobs.find((job) => job.id === jobId);

  return (
    <Flex vertical gap={28} className="pb-16">
      <PageHeader
        title="Authorities & Submissions"
        summary="Transport Specialist: File dossiers with veterinary and border customs authorities, track approvals against committed SLAs, and record quarantine inspections."
      />

      <JobBar
        jobs={jobs}
        loading={loadingJobs}
        jobId={jobId}
        onSelect={setJobId}
        onSearch={setJobSearch}
      />

      {jobId && <JobAuthorities key={jobId} jobId={jobId} jobCode={selectedJob?.code} withGate />}
    </Flex>
  );
};

export default AuthoritiesPage;
