import { Flex } from 'antd';
import { Button, Callout, Chip, TimelineStop } from '@/components/ui';
import { useRoutePlans } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';

interface Props {
  job: JobDetail;
}

export function RouteTab({ job }: Props) {
  const routePlan = job.routePlan;
  const { data: allVersions } = useRoutePlans(job.id);

  if (!routePlan) {
    return (
      <div className="p-8 text-center">
        <p className="type-body-s text-ink-3">No route plan has been created for this job yet.</p>
      </div>
    );
  }

  const isGateClear = job.clearanceGateState === 'Clear';

  const formatWindow = () => {
    if (job.windowStart && job.windowEnd) {
      const s = new Date(job.windowStart).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const e = new Date(job.windowEnd).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const d = new Date(job.windowEnd).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
      return `${d}, ${s}–${e}`;
    }
    return 'Any time';
  };

  const stops = routePlan.stops ?? [];
  const welfareCount = stops.filter((s) => s.kind === 'WELFARE').length;
  const borderCrossing = stops.find((s) => s.kind === 'BORDER')?.borderCrossingName || 'None';

  return (
    <Flex vertical gap={32}>
      {/* Summary Strip (matching Figma scrRoute) */}
      <div className="p-6 rounded-xl border border-line bg-card shadow-xs">
        <Flex wrap gap={32} align="center" justify="space-between">
          <Flex vertical gap={4}>
            <span className="type-body-s text-ink-3">Origin</span>
            <span className="type-label-m text-ink">{job.originCity}</span>
          </Flex>
          <Flex vertical gap={4}>
            <span className="type-body-s text-ink-3">Destination</span>
            <span className="type-label-m text-ink">{job.destinationCity}</span>
          </Flex>
          <Flex vertical gap={4}>
            <span className="type-body-s text-ink-3">Distance</span>
            <span className="type-label-m text-ink">{routePlan.distanceKm || 0} km</span>
          </Flex>
          <Flex vertical gap={4}>
            <span className="type-body-s text-ink-3">Duration</span>
            <span className="type-label-m text-ink">
              {routePlan.durationMin ? `${(routePlan.durationMin / 60).toFixed(1)} h` : '—'}
            </span>
          </Flex>
          <Flex vertical gap={4}>
            <span className="type-body-s text-ink-3">Border crossing</span>
            <span className="type-label-m text-ink">{borderCrossing}</span>
          </Flex>
          <Flex vertical gap={4}>
            <span className="type-body-s text-ink-3">Welfare stops</span>
            <span className="type-label-m text-ink">{welfareCount}</span>
          </Flex>
          <Flex vertical gap={4}>
            <span className="type-body-s text-ink-3">Arrival window</span>
            <span className="type-label-m text-ink">{formatWindow()}</span>
          </Flex>
        </Flex>
      </div>

      {/* Timeline of Stops */}
      <Flex vertical gap={16}>
        <Flex align="center" justify="space-between">
          <h3 className="type-h3 text-ink">Timeline</h3>
          <Chip tone="neutral">Version {routePlan.versionNo}</Chip>
        </Flex>

        <Flex vertical gap={16}>
          {stops.map((stop) => {
            const timeStr = stop.plannedAt
              ? new Date(stop.plannedAt).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—';

            // On a shared trip each pickup and delivery names its job (US-F3-11).
            const shared = new Set(stops.map((s) => s.jobCode).filter(Boolean)).size > 1;
            const placeName =
              stop.kind === 'BORDER'
                ? stop.borderCrossingName || 'Border'
                : stop.placeName || 'Stop';
            const stopName = shared && stop.jobCode ? `${placeName} · ${stop.jobCode}` : placeName;

            return (
              <TimelineStop
                key={stop.id}
                kind={stop.kind}
                stop={stopName}
                time={timeStr}
                details={stop.details || undefined}
              />
            );
          })}
        </Flex>
      </Flex>

      {/* Departure Gate / Action */}
      <div className="p-6 rounded-xl border border-line bg-card">
        <Flex vertical gap={16}>
          {!isGateClear ? (
            <>
              <Callout tone="bad" title="Departure can’t be recorded yet">
                {job.clearanceGateSummary ||
                  'The clearance gate is locked. All document requirements, permits, and approvals must be completed before recording departure.'}
              </Callout>
              <div>
                <Button variant="primary" size="md" disabled leadingIcon="lock">
                  Record departure
                </Button>
              </div>
            </>
          ) : (
            <>
              <Callout tone="ok" title="Clear to depart">
                Dossier status is CLEARANCE_READY. The driver may record departure.
              </Callout>
              <div>
                <Button variant="primary" size="md" leadingIcon="arrow-right">
                  Record departure
                </Button>
              </div>
            </>
          )}
        </Flex>
      </div>

      {/* Version History */}
      {allVersions && allVersions.length > 1 && (
        <Flex vertical gap={12}>
          <h4 className="type-h4 text-ink">Version history</h4>
          <Flex vertical className="divide-y divide-line rounded-lg border border-line bg-card">
            {allVersions.map((v) => (
              <div key={v.id} className="p-4">
                <Flex align="center" justify="space-between">
                  <Flex gap={12} align="center">
                    <span className="type-data text-ink">v{v.versionNo}</span>
                    <Chip tone={v.status === 'CONFIRMED' ? 'ok' : 'neutral'}>{v.status}</Chip>
                    {v.changeReason && (
                      <span className="type-body-s text-ink-2 truncate max-w-md">
                        {v.changeReason}
                      </span>
                    )}
                  </Flex>
                  <span className="type-caption text-ink-3">
                    {v.confirmedAt ? new Date(v.confirmedAt).toLocaleDateString('en-GB') : 'Draft'}
                  </span>
                </Flex>
              </div>
            ))}
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}
