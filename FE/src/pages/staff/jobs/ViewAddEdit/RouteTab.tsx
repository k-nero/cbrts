import { useState } from 'react';
import { Flex } from 'antd';

import { ConfirmRouteModal } from './ConfirmRouteModal';
import { FlightPanel } from './FlightPanel';
import { JoinableTrips } from './JoinableTrips';
import { OnTheRoad } from './OnTheRoad';
import { RecordDepartureButton } from './RecordDepartureButton';
import { RouteChecks } from './RouteChecks';
import { routeChecks } from './routeDraft';
import { RouteEditor } from './RouteEditor';
import { ShareSuggestions } from './ShareSuggestions';

import { Button, Callout, Chip, Panel, TimelineStop } from '@/components/ui';
import { useCanPlanTrips, useRoutePlans } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';

interface Props {
  job: JobDetail;
}

export function RouteTab({ job }: Props) {
  const routePlan = job.routePlan;
  const { data: allVersions } = useRoutePlans(job.id);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // The trip of the journey this tab plans, and the one that hands the horses on to it (US-F3-16).
  const index = job.parts.findIndex((part) => part.current);
  const part = index < 0 ? null : job.parts[index];
  const before = index > 0 && job.parts[index - 1].handsOn ? job.parts[index - 1] : null;
  const departed = (part?.status ?? job.tripStatus) !== 'NOT_STARTED';
  // Sharing and editing the route are the trip planners' (US-F3-11, US-F3-17); the journey's trips are added and
  // taken off on the Trip tab's rail (US-F3-21).
  const planning = useCanPlanTrips() && !departed;

  // A later trip of the journey says where it collects the horses (US-F3-16, US-F3-21).
  const chainPanel =
    before && part ? (
      <Callout
        tone="info"
        title={`Collects the horses from ${before.tripCode} in ${part.startCity ?? 'the city it starts from'}`}
      >
        The horses join this trip when {before.tripCode} hands them on at its transfer stop; it
        can’t depart before then.
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
  // The checks the server runs on confirmation, shown before Confirm; a failing one holds it back.
  const checks = draft ? routeChecks(draft, job) : [];
  const blocked = checks.some((c) => c.blocks && !c.ok);
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
          <RouteChecks checks={checks} />
          <Flex gap={8} align="center" wrap>
            <Button
              variant="primary"
              size="sm"
              disabled={blocked}
              onClick={() => setConfirming(true)}
            >
              {`Confirm draft v${draft.versionNo}`}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Edit draft
            </Button>
            {blocked && (
              <span className="type-body-s text-ink-3">Fix the checks marked Fix to confirm.</span>
            )}
          </Flex>
          <ConfirmRouteModal
            job={job}
            draft={draft}
            confirmed={confirmed}
            checks={checks}
            open={confirming}
            onClose={() => setConfirming(false)}
          />
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

      {/* Departure gate and action; once the trip has left, On the road takes over. */}
      {!departed && (
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
                  <RecordDepartureButton job={job} part={part} />
                </div>
              </>
            )}
          </Flex>
        </div>
      )}

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
