import { App, Flex, Skeleton } from 'antd';

import { BiosecurityWarnings } from './BiosecurityWarnings';
import { allowedDays, day } from './tripJobs';

import { Button } from '@/components/ui';
import { useCanPlanTrips, useShareSuggestions, useShareTrip } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils/error';

/**
 * Approved jobs that could share this job's trailer (US-F3-13): same corridor, a shared trailer, a
 * departure day both allow and room on the trailers. Each shows the proposed departure, the horses
 * it adds, the stalls left and what sharing would mix. Nothing combines until one is chosen.
 */
export function ShareSuggestions({ job }: { job: JobDetail }) {
  const { message } = App.useApp();
  // Only the roles that plan trips may load suggestions (US-F3-13); the others never ask.
  const canPlan = useCanPlanTrips();
  const beforeDeparture = job.tripStatus === 'NOT_STARTED' && canPlan;
  const suggestions = useShareSuggestions(job.id, beforeDeparture);
  const flies = job.parts.find((p) => p.current)?.mode === 'AIR';
  const share = useShareTrip(job.id);

  if (!beforeDeparture) return null;
  if (suggestions.isPending) return <Skeleton active title={false} paragraph={{ rows: 2 }} />;
  if (suggestions.isError) {
    return (
      <span className="type-body-s text-ink-3">
        {apiErrorMessage(suggestions.error, 'The jobs that could share couldn’t be loaded.')}
      </span>
    );
  }
  if (suggestions.data.length === 0) {
    return (
      <span className="type-body-s text-ink-3">
        {flies
          ? 'No approved job fits this flight: same corridor, a departure day both jobs allow and room in its stall positions.'
          : 'No approved job fits this trailer: same corridor, a shared trailer, a departure day both jobs allow and room on the trailers.'}
      </span>
    );
  }

  return (
    <Flex vertical gap={12}>
      {suggestions.data.map((s) => {
        const toAccept = s.warnings.filter((w) => !w.accepted);
        return (
          <div key={s.job.jobId} className="rounded-lg border border-line p-4">
            <Flex vertical gap={10}>
              <Flex gap={12} align="center" justify="space-between" wrap>
                <Flex vertical gap={2}>
                  <span className="type-label-s font-mono text-ink">{s.job.code}</span>
                  <span className="type-body-s text-ink-3">
                    {s.job.origin ?? 'Origin'} → {s.job.destination ?? 'Destination'} ·{' '}
                    {allowedDays(s.job)}
                  </span>
                  <span className="type-body-s text-ink-2">
                    Leaves {day(s.proposedDeparture)} · adds {s.horsesAdded}{' '}
                    {s.horsesAdded === 1 ? 'horse' : 'horses'}
                    {s.stallsLeft != null &&
                      ` · ${s.stallsLeft} ${s.stallsLeft === 1 ? 'stall' : 'stalls'} left`}
                  </span>
                </Flex>
                <Button
                  variant="secondary"
                  size="md"
                  disabled={share.isPending}
                  onClick={() =>
                    share.mutate(
                      { otherJobId: s.job.jobId, acceptedWarnings: s.warnings.map((w) => w.key) },
                      {
                        onSuccess: (result) =>
                          message.success(
                            result.departFrom === result.departTo
                              ? `Shared: the trip leaves on ${day(result.departFrom)}.`
                              : `Shared: plan the departure between ${day(result.departFrom)} and ${day(result.departTo)}.`,
                          ),
                        onError: (error) => {
                          // A suggestion that changed meanwhile is shown again as it is now.
                          suggestions.refetch();
                          message.error(
                            apiErrorMessage(
                              error,
                              'The job couldn’t be put on this trip. Try again.',
                            ),
                          );
                        },
                      },
                    )
                  }
                >
                  {toAccept.length > 0
                    ? `Accept ${toAccept.length === 1 ? 'the warning' : `${toAccept.length} warnings`} and share`
                    : flies
                      ? 'Share this flight'
                      : 'Share this trailer'}
                </Button>
              </Flex>
              <BiosecurityWarnings warnings={s.warnings} />
            </Flex>
          </div>
        );
      })}
    </Flex>
  );
}
