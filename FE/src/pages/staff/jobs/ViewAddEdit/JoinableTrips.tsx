import { App, Flex, Skeleton } from 'antd';

import { BiosecurityWarnings } from './BiosecurityWarnings';
import { day } from './tripJobs';

import { Button, Chip } from '@/components/ui';
import { useJoinableTrips, useJoinTrip } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils/error';

const leaves = (iso: string | null) =>
  iso
    ? `Leaves ${new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : 'Departure not planned yet';

/**
 * Confirmed trips on this job's corridor (US-F3-18), those it could join first. Each row says when it leaves, the jobs
 * on it and how many are cleared, and the earliest document deadline still open, so a trip waiting on someone's
 * documents is a choice made knowingly; one it fits adds the days that suit both, the room left and the warnings to
 * accept. A trip it doesn't fit is greyed out with the reason (dates, room, airports, a private trailer), and can't be
 * chosen. Joining reopens the trip's plans; nothing combines until one is chosen.
 */
export function JoinableTrips({ job, enabled }: { job: JobDetail; enabled: boolean }) {
  const { message } = App.useApp();
  const trips = useJoinableTrips(job.id, enabled);
  const join = useJoinTrip(job.id);

  if (!enabled) return null;
  if (trips.isPending) return <Skeleton active title={false} paragraph={{ rows: 2 }} />;
  if (trips.isError) {
    return (
      <span className="type-body-s text-ink-3">
        {apiErrorMessage(trips.error, 'The trips this job could join couldn’t be loaded.')}
      </span>
    );
  }
  if (trips.data.length === 0) {
    return (
      <span className="type-body-s text-ink-3">
        No other trip on this corridor has a confirmed route yet.
      </span>
    );
  }
  const fitting = trips.data.filter((t) => t.fits);
  const notFitting = trips.data.filter((t) => !t.fits);

  return (
    <Flex vertical gap={12}>
      {fitting.length === 0 && (
        <span className="type-body-s text-ink-3">
          No confirmed trip fits yet: same corridor, a shared trailer, a departure day both allow,
          room on the trailers or the flight, and the same airports. Each says why below.
        </span>
      )}
      {fitting.map((t) => {
        const toAccept = t.warnings.filter((w) => !w.accepted);
        const allCleared = t.jobsCleared === t.jobs.length;
        return (
          <div key={t.tripId} className="rounded-lg border border-line p-4">
            <Flex vertical gap={10}>
              <Flex gap={12} align="center" justify="space-between" wrap>
                <Flex vertical gap={2}>
                  <span className="type-label-s text-ink">
                    <span className="font-mono">{t.tripCode}</span> ·{' '}
                    {t.mode === 'AIR' ? 'Flight' : 'Road'} · {t.corridorCode}
                  </span>
                  <span className="type-body-s text-ink-2">
                    {leaves(t.plannedDepartureAt)} ·{' '}
                    {t.departFrom === t.departTo
                      ? `fits on ${day(t.departFrom)}`
                      : `fits ${day(t.departFrom)} – ${day(t.departTo)}`}
                    {t.stallsLeft != null &&
                      ` · ${t.stallsLeft} ${t.stallsLeft === 1 ? 'stall' : 'stalls'} left`}
                  </span>
                  <span className="type-body-s text-ink-3">With {t.jobs.join(', ')}</span>
                </Flex>
                <Flex gap={8} align="center">
                  <Chip tone={allCleared ? 'ok' : 'warn'}>
                    {t.jobsCleared} of {t.jobs.length} cleared
                    {!allCleared && t.documentsDueBy
                      ? ` · documents due ${day(t.documentsDueBy)}`
                      : ''}
                  </Chip>
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={join.isPending}
                    onClick={() =>
                      join.mutate(
                        { tripId: t.tripId, acceptedWarnings: t.warnings.map((w) => w.key) },
                        {
                          onSuccess: (result) =>
                            message.success(
                              `${job.code} joined ${result.tripCode}; its plans reopen for a new confirmation.`,
                            ),
                          onError: (error) => {
                            // A trip that changed meanwhile is shown again as it is now.
                            trips.refetch();
                            message.error(
                              apiErrorMessage(error, 'The job couldn’t join this trip. Try again.'),
                            );
                          },
                        },
                      )
                    }
                  >
                    {toAccept.length > 0
                      ? `Accept ${toAccept.length === 1 ? 'the warning' : `${toAccept.length} warnings`} and join`
                      : 'Join this trip'}
                  </Button>
                </Flex>
              </Flex>
              {!allCleared && (
                <span className="type-body-s text-ink-3">
                  The trip can’t depart until every job on it is cleared; a job that gets stuck is
                  taken off before departure.
                </span>
              )}
              <BiosecurityWarnings warnings={t.warnings} />
            </Flex>
          </div>
        );
      })}
      {notFitting.length > 0 && (
        <span className="type-mono-label pt-2 text-ink-3">Can’t join · {notFitting.length}</span>
      )}
      {notFitting.map((t) => (
        // Greyed out: shown so the coordinator sees why, never chosen.
        <div
          key={t.tripId}
          aria-disabled
          className="rounded-lg border border-line bg-muted/40 p-4 text-ink-3"
        >
          <Flex gap={12} align="center" justify="space-between" wrap>
            <Flex vertical gap={2}>
              <span className="type-label-s">
                <span className="font-mono">{t.tripCode}</span> ·{' '}
                {t.mode === 'AIR' ? 'Flight' : 'Road'} · {t.corridorCode}
              </span>
              <span className="type-body-s">
                {leaves(t.plannedDepartureAt)} · with {t.jobs.join(', ')}
              </span>
              <span className="type-body-s text-ink-2">{t.reason}</span>
            </Flex>
            <Chip tone="neutral">Doesn’t fit</Chip>
          </Flex>
        </div>
      ))}
    </Flex>
  );
}
