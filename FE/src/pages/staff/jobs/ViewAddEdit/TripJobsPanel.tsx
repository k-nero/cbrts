import { App, Flex } from 'antd';

import { ShareSuggestions } from './ShareSuggestions';
import { allowedDays } from './tripJobs';

import { Button, Chip, Panel } from '@/components/ui';
import { useCanPlanTrips, useTakeOffTrip } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils/error';

/**
 * The jobs sharing this job's trip (US-F3-11), the jobs that could share it (US-F3-13), and a way
 * to take one off before departure. Prices don't change; every change reopens the trip's plans.
 */
export function TripJobsPanel({ job }: { job: JobDetail }) {
  const { message } = App.useApp();
  // Taking a job off and sharing are the trip planners' (US-F3-11); other staff see who shares the trip.
  const canPlan = useCanPlanTrips();
  const beforeDeparture = job.tripStatus === 'NOT_STARTED' && canPlan;
  const takeOff = useTakeOffTrip(job.id);
  const jobs = job.tripJobs ?? [];
  const shared = jobs.length > 1;

  const reportRefusal = (fallback: string) => (error: unknown) =>
    message.error(apiErrorMessage(error, fallback));

  return (
    <Panel
      title={
        shared
          ? `${jobs.length} jobs share ${job.tripCode}`
          : `Share ${job.tripCode ?? 'this trip'}`
      }
      className="p-4"
    >
      <Flex vertical gap={12}>
        {shared &&
          jobs.map((j) => (
            <Flex key={j.jobId} gap={12} align="center" justify="space-between" wrap>
              <Flex vertical gap={2}>
                <Flex gap={8} align="center">
                  <span className="type-label-s font-mono text-ink">{j.code}</span>
                  <Chip tone={j.clearanceReady ? 'ok' : 'warn'}>
                    {j.clearanceReady ? 'Cleared' : 'Clearance pending'}
                  </Chip>
                </Flex>
                <span className="type-body-s text-ink-3">
                  {j.origin ?? 'Origin'} → {j.destination ?? 'Destination'} · {j.horses}{' '}
                  {j.horses === 1 ? 'horse' : 'horses'} · {allowedDays(j)}
                </span>
              </Flex>
              {beforeDeparture && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={takeOff.isPending}
                  onClick={() =>
                    takeOff.mutate(j.jobId, {
                      onSuccess: () =>
                        message.success(`${j.code} now travels on a trip of its own.`),
                      onError: reportRefusal('The job couldn’t be taken off the trip. Try again.'),
                    })
                  }
                >
                  Take off trip
                </Button>
              )}
            </Flex>
          ))}

        {beforeDeparture && (
          <Flex vertical gap={8}>
            <span className="type-label-s text-ink">
              Could share this{' '}
              {job.parts.find((p) => p.current)?.mode === 'AIR' ? 'flight' : 'trailer'}
            </span>
            <ShareSuggestions job={job} />
          </Flex>
        )}
      </Flex>
    </Panel>
  );
}
