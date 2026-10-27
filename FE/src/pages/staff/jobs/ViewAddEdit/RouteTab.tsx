import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { App, Flex } from 'antd';
import { ContinueTripModal } from './ContinueTripModal';
import { FlightPanel } from './FlightPanel';
import { JoinableTrips } from './JoinableTrips';
import { OnTheRoad } from './OnTheRoad';
import { RouteEditor } from './RouteEditor';
import { ShareSuggestions } from './ShareSuggestions';

import { Button, Callout, Chip, Panel, TimelineStop } from '@/components/ui';
import {
  useCanPlanTrips,
  useConfirmRoutePlan,
  useRemoveChainedTrip,
  useRoutePlans,
} from '@/hooks/useJob';
import type { JobDetail, RouteStop, RouteStopKind } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

interface Props {
  job: JobDetail;
}

/** Where a journey continues on another trip: the places horses wait between carriers (US-F3-16). */
const SPLITS: RouteStopKind[] = ['AIRPORT_OUT', 'AIRPORT_IN', 'QUARANTINE'];

export function RouteTab({ job }: Props) {
  const routePlan = job.routePlan;
  const { data: allVersions } = useRoutePlans(job.id);
  const { message, modal } = App.useApp();
  const [, setSearchParams] = useSearchParams();
  const [splitAt, setSplitAt] = useState<RouteStop | null>(null);
  const removeTrip = useRemoveChainedTrip(job.id);
  const confirmRoute = useConfirmRoutePlan(job.id);
  const [editing, setEditing] = useState(false);

  // The trip of the journey this tab plans, and the one that hands the horses on to it (US-F3-16).
  const index = job.parts.findIndex((part) => part.current);
  const part = index < 0 ? null : job.parts[index];
  const before = index > 0 && job.parts[index - 1].handsOn ? job.parts[index - 1] : null;
  const departed = (part?.status ?? job.tripStatus) !== 'NOT_STARTED';
  // Splitting the journey, taking a trip out, sharing and editing the route are the trip planners' (US-F3-16,
  // US-F3-11, US-F3-17).
  const planning = useCanPlanTrips() && !departed;

  const takeOut = () =>
    modal.confirm({
      title: 'Take this trip out of the journey?',
      content: `${job.code} travels on ${before?.corridorCode ?? 'the trip before'} again to the end of this trip's stops. This trip's plan for ${job.code} is dropped; a trip nobody else rides releases its trailers and crew.`,
      okText: 'Take it out',
      onOk: () =>
        removeTrip.mutateAsync(part!.tripId).then(
          () => {
            message.success(`${job.code} travels on the trip before again.`);
            setSearchParams({ tab: 'route', trip: before!.tripId }, { replace: true });
          },
          (error) => message.error(apiErrorMessage(error, 'The trip was not taken out.')),
        ),
    });

  // A later trip of the journey says where it continues from, and can be taken out before it leaves.
  const chainPanel =
    before && part ? (
      <Callout
        tone="info"
        title={`Continues the journey after ${before.corridorCode ?? 'the trip before'}`}
      >
        <Flex vertical gap={12}>
          <span>
            The horses join this trip when the trip before hands them on at its transfer stop; it
            can’t depart before then.
          </span>
          {planning && (
            <div>
              <Button variant="secondary" size="sm" onClick={takeOut}>
                Take this trip out of the journey
              </Button>
            </div>
          )}
        </Flex>
      </Callout>
    ) : null;

  // The trip's draft, newer than its confirmed route if it has one: edited and confirmed here (US-F3-17).
  const draft = allVersions?.find((v) => v.status === 'DRAFT') ?? null;
  const confirmed = allVersions?.find((v) => v.status === 'CONFIRMED') ?? null;
  const editor =
    editing && planning ? (
      <RouteEditor
        job={job}
        from={draft ?? confirmed}
        supersedes={confirmed !== null}
        onClose={() => setEditing(false)}
      />
    ) : null;
  const draftPanel =
    draft && planning && !editing ? (
      <Callout tone="warn" title={`Draft v${draft.versionNo} isn’t confirmed yet`}>
        <Flex vertical gap={12}>
          <span>
            {confirmed
              ? `The trip still runs on v${confirmed.versionNo} until you confirm the draft.`
              : 'Confirm it to set the trip’s dates; the load plan and sign-off follow.'}
            {draft.changeReason ? ` Reason: ${draft.changeReason}` : ''}
          </span>
          <Flex gap={8}>
            <Button
              variant="primary"
              size="sm"
              disabled={confirmRoute.isPending}
              onClick={() =>
                confirmRoute.mutate(
                  { planId: draft.id },
                  {
                    onSuccess: () => message.success(`Route v${draft.versionNo} confirmed.`),
                    onError: (error) =>
                      message.error(apiErrorMessage(error, 'The route was not confirmed.')),
                  },
                )
              }
            >
              {confirmRoute.isPending ? 'Confirming...' : `Confirm draft v${draft.versionNo}`}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Edit draft
            </Button>
          </Flex>
        </Flex>
      </Callout>
    ) : null;

  // Jobs that could share this trailer, proposed where the route is planned too (US-F3-13), and the confirmed
  // trips this one could join instead (US-F3-18).
  const sharePanel = planning ? (
    <Flex vertical gap={24}>
      {job.tripStatus === 'NOT_STARTED' && (
        <Panel title="Could share this trailer" className="p-4">
          <ShareSuggestions job={job} />
        </Panel>
      )}
      <Panel title="Join a confirmed trip" className="p-4">
        <JoinableTrips job={job} enabled={planning} />
      </Panel>
    </Flex>
  ) : null;

  if (!routePlan) {
    return (
      <Flex vertical gap={24}>
        {chainPanel}
        {editor ?? (
          <div className="p-8 text-center">
            <Flex vertical gap={12} align="center">
              <p className="type-body-s m-0 text-ink-3">This trip has no route yet.</p>
              {planning && (
                <Button variant="primary" size="md" onClick={() => setEditing(true)}>
                  Plan the route
                </Button>
              )}
            </Flex>
          </div>
        )}
        {sharePanel}
        <OnTheRoad job={job} />
      </Flex>
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
  // One trip of a journey starts and ends where its own route does (US-F3-16).
  const journey = job.parts.some((p) => p.handsOn);
  const origin = journey ? (stops[0]?.placeName ?? job.originCity) : job.originCity;
  const destination = journey
    ? (stops.at(-1)?.placeName ?? job.destinationCity)
    : job.destinationCity;
  const welfareCount = stops.filter((s) => s.kind === 'WELFARE').length;
  const borderCrossing = stops.find((s) => s.kind === 'BORDER')?.borderCrossingName || 'None';

  return (
    <Flex vertical gap={32}>
      {chainPanel}
      {draftPanel}
      {editor}
      {sharePanel}
      <ContinueTripModal job={job} stop={splitAt} onClose={() => setSplitAt(null)} />

      {/* Summary Strip (matching Figma scrRoute) */}
      <div className="p-6 rounded-xl border border-line bg-card shadow-xs">
        <Flex wrap gap={32} align="center" justify="space-between">
          <Flex vertical gap={4}>
            <span className="type-body-s text-ink-3">Origin</span>
            <span className="type-label-m text-ink">{origin}</span>
          </Flex>
          <Flex vertical gap={4}>
            <span className="type-body-s text-ink-3">Destination</span>
            <span className="type-label-m text-ink">{destination}</span>
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
            <span className="type-label-m text-ink">
              {part?.handsOn ? 'Hands on to the next trip' : formatWindow()}
            </span>
          </Flex>
        </Flex>
      </div>

      <FlightPanel job={job} />

      {/* Timeline of Stops */}
      <Flex vertical gap={16}>
        <Flex align="center" justify="space-between">
          <h3 className="type-h3 text-ink">Timeline</h3>
          <Flex gap={8} align="center">
            {planning && !draft && !editing && (
              <Button
                variant="secondary"
                size="sm"

                onClick={() => setEditing(true)}
              >
                Edit route
              </Button>
            )}
            <Chip tone="neutral">Version {routePlan.versionNo}</Chip>
          </Flex>
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

            // Before departure, the journey can continue on another trip from an airport or quarantine stop.
            const canSplit = planning && SPLITS.includes(stop.kind);
            return (
              <TimelineStop
                key={stop.id}
                kind={stop.kind}
                stop={stopName}
                time={timeStr}
                details={stop.details || undefined}
                status={
                  canSplit ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      trailingIcon="arrow-right"
                      onClick={() => setSplitAt(stop)}
                    >
                      Continue on another trip
                    </Button>
                  ) : undefined
                }
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
                {job.clearanceGateSummary ||
                  'The dossier is cleared. The driver may record departure.'}
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
      <OnTheRoad job={job} />
    </Flex>
  );
}
