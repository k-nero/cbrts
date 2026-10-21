import type { JobDetail } from '@/interfaces';
import JobAuthorities from '@/components/authorities/JobAuthorities';

interface Props {
  job: JobDetail;
}

/** The job's filings with each authority and its quarantine; the gate is already in the job header. */
export function AuthoritiesTab({ job }: Props) {
  return <JobAuthorities jobId={job.id} jobCode={job.code} />;
}
