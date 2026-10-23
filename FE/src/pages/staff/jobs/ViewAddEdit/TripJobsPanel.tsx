import { useState } from 'react';
import { App, Flex, Select } from 'antd';

import { Button, Chip, Panel } from '@/components/ui';
import { useShareCandidates, useShareTrip, useTakeOffTrip } from '@/hooks/useJob';
import type { JobDetail, TripJob } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils/error';

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';

const allowedDays = (j: TripJob) =>
  j.departureDate
    ? j.dateFlexDays > 0
      ? `leaves ${day(j.departureDate)} ± ${j.dateFlexDays} days`
      : `leaves ${day(j.departureDate)}`
    : 'no departure date';

/**
 * The jobs sharing this job's trip (US-F3-11), with a picker to put another job on it and a way
 * to take one off before departure. Prices don't change; every change reopens the trip's plans.
 */
export function TripJobsPanel({ job }: { job: JobDetail }) {
  const { message } = App.useApp();
  const [candidate, setCandidate] = useState<string>();
  const beforeDeparture = job.tripStatus === 'NOT_STARTED';
  const candidates = useShareCandidates(job.id, beforeDeparture);
  const share = useShareTrip(job.id);
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
            <span className="type-body-s text-ink-3">
              Put an approved job on this trailer: same corridor, a shared trailer, and a departure
              day both jobs allow. Prices don’t change; the route and load plan reopen.
            </span>
            <Flex gap={8} align="center" wrap>
              <Select
                aria-label="Job to put on this trip"
                className="w-80"
                placeholder={
                  candidates.data?.length === 0 ? 'No job can share this trip' : 'Choose a job'
                }
                loading={candidates.isPending}
                disabled={candidates.data?.length === 0}
                value={candidate}
                onChange={setCandidate}
                options={(candidates.data ?? []).map((c) => ({
                  value: c.jobId,
                  label: `${c.code} · ${c.horses} ${c.horses === 1 ? 'horse' : 'horses'} · ${allowedDays(c)}`,
                }))}
              />
              <Button
                variant="secondary"
                size="md"
                disabled={!candidate || share.isPending}
                onClick={() =>
                  candidate &&
                  share.mutate(candidate, {
                    onSuccess: (result) => {
                      setCandidate(undefined);
                      message.success(
                        result.departFrom === result.departTo
                          ? `Shared: the trip leaves on ${day(result.departFrom)}.`
                          : `Shared: plan the departure between ${day(result.departFrom)} and ${day(result.departTo)}.`,
                      );
                    },
                    onError: reportRefusal('The job couldn’t be put on this trip. Try again.'),
                  })
                }
              >
                {share.isPending ? 'Sharing…' : 'Put on this trip'}
              </Button>
            </Flex>
          </Flex>
        )}
      </Flex>
    </Panel>
  );
}
