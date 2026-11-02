import { useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flex } from 'antd';

import { ConfirmRouteModal } from './ConfirmRouteModal';
import { DepartureReadiness } from './DepartureReadiness';
import { FlightPanel } from './FlightPanel';
import { JobGate } from './JobGate';
import { JoinableTrips } from './JoinableTrips';
import { OnTheRoad } from './OnTheRoad';
import { departureReadiness } from './readiness';
import { legLine, span, stopTimes } from './timeline';
import { TripConnections } from './TripConnections';
import { RouteChecks } from './RouteChecks';
import { routeChecks } from './routeDraft';
import { RouteEditor } from './RouteEditor';
import { ShareSuggestions } from './ShareSuggestions';

import { Button, Callout, Chip, cx, Panel, TimelineStop } from '@/components/ui';
import { useCanPlanTrips, useRoutePlans } from '@/hooks/useJob';
import type { JobDetail } from '@/interfaces';
import { formatTime, ict } from '@/lib/utils';

interface Props {
  job: JobDetail;
}

/** How much of the arrival window the delivery leaves spare (DESIGN.md, arrival window on the Route plan). */
function windowSpare(plannedAt: string, windowEnd: string) {
  const minutes = ict(windowEnd).diff(ict(plannedAt), 'minute');
  const closes = formatTime(windowEnd);
  if (minutes === 0) return `Planned as the window closes at ${closes}.`;
  return minutes > 0
    ? `Planned ${span(minutes)} before the window closes at ${closes}.`
    : `Planned ${span(minutes)} after the window closes at ${closes}.`;
}

export function RouteTab({ job }: Props) {
  const routePlan = job.routePlan;
  const { data: allVersions } = useRoutePlans(job.id);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [, setSearchParams] = useSearchParams();
  // Editing takes over the Route view (DESIGN.md, Route editor). It opens at the top of the view; Cancel returns to
  // where the coordinator was, and Save to the top, where the new draft waits to be confirmed.
  const root = useRef<HTMLDivElement>(null);
  const scrollBack = useRef<number | null>(null);
  const startEditing = () => {
    scrollBack.current = window.scrollY;
    setEditing(true);
  };
  const stopEditing = (saved: boolean) => {
    if (saved) scrollBack.current = null;
    setEditing(false);
  };
  const wasEditing = useRef(editing);
  useLayoutEffect(() => {
    if (wasEditing.current === editing) return;
    wasEditing.current = editing;
    if (!editing && scrollBack.current !== null) {
      window.scrollTo({ top: scrollBack.current });
      scrollBack.current = null;
      return;
    }
    const top = root.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) root.current?.scrollIntoView({ block: 'start' });
  }, [editing]);

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
  const formatWindow = () => {
    if (job.windowStart && job.windowEnd) {
      return `${ict(job.windowEnd).format('D MMM')}, ${formatTime(job.windowStart)}–${formatTime(job.windowEnd)}`;
    }
    return 'Any time';
  };

  // While the route is edited the editor is the whole view: the timeline, the strip and the panels around it come
  // back on save or cancel, so the route is never on screen twice.
  const corridorKm = (draft ?? confirmed)?.corridorDistanceKm;
  if (editing && planning) {
    return (
      <Flex ref={root} vertical gap={24} className="scroll-mt-6">
        {chainPanel}
        <RouteEditor
          job={job}
          from={draft ?? confirmed}
          supersedes={confirmed !== null}
          note={[
            part?.handsOn
              ? 'The route ends where it hands the horses on to the next trip.'
              : job.windowStart && job.windowEnd
                ? `Arrival window: ${formatWindow()}.`
                : 'No arrival window is set for this job.',
            // The distance the legs are checked against and the welfare stops counted from.
            corridorKm ? `${part?.corridorCode ?? 'The corridor'} is ${corridorKm} km.` : null,
          ]
            .filter(Boolean)
            .join(' ')}
          onClose={stopEditing}
        />
      </Flex>
    );
  }
  // The checks the server runs on confirmation, shown before Confirm; a failing one holds it back.
  const checks = draft ? routeChecks(draft, job) : [];
  const blocked = checks.some((c) => c.blocks && !c.ok);
  const draftPanel =
    draft && planning ? (
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
            <Button variant="secondary" size="sm" onClick={startEditing}>
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
      <Flex ref={root} vertical gap={24} className="scroll-mt-6">
        {chainPanel}
        <div className="p-8 text-center">
          <Flex vertical gap={12} align="center">
            <p className="type-body-s m-0 text-ink-3">This trip has no route yet.</p>
            {planning && (
              <Button variant="primary" size="md" onClick={startEditing}>
                Plan the route
              </Button>
            )}
          </Flex>
        </div>
        {sharePanel}
        <OnTheRoad job={job} />
      </Flex>
    );
  }

  // What the trip still needs before it leaves; the one gold action is the first open step's.
  const readiness = departureReadiness(
    job,
    part,
    before,
    // A draft waiting to be confirmed holds the route open, and the gold with it.
    (confirmed !== null || routePlan.status === 'CONFIRMED') && !draft,
  );

  const stops = routePlan.stops ?? [];
  // One trip of a journey starts and ends where its own route does (US-F3-16).
  const journey = job.parts.some((p) => p.handsOn);
  const origin = journey ? (stops[0]?.placeName ?? job.originCity) : job.originCity;
  const destination = journey
    ? (stops.at(-1)?.placeName ?? job.destinationCity)
    : job.destinationCity;
  const welfareCount = stops.filter((s) => s.kind === 'WELFARE').length;
  const times = stopTimes(stops);
  const borderCrossing = stops.find((s) => s.kind === 'BORDER')?.borderCrossingName || 'None';

  return (
    <Flex ref={root} vertical gap={24} className="scroll-mt-6">
      {chainPanel}
      {draftPanel}

      {/* Summary strip (Figma "Fleet & route coordinator · Route plan") */}
      <div className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-line bg-card px-6 py-[18px]">
        {[
          ['Origin', origin],
          ['Destination', destination],
          ['Distance', routePlan.distanceKm ? `${routePlan.distanceKm} km` : '—'],
          [
            'Duration',
            routePlan.durationMin ? `${+(routePlan.durationMin / 60).toFixed(1)} h` : '—',
          ],
          ['Border crossing', borderCrossing],
          ['Welfare stops', welfareCount],
          ['Arrival window', part?.handsOn ? 'Hands on to the next trip' : formatWindow()],
        ].map(([label, value]) => (
          <Flex key={label} vertical gap={4}>
            <span className="type-body-s text-ink-3">{label}</span>
            <span className="type-label-m text-ink">{value}</span>
          </Flex>
        ))}
      </div>

      {/* The gate for this trip, under where it starts and ends (the page header leaves it out here). */}
      <JobGate
        job={job}
        onOpenClearance={() => setSearchParams({ tab: 'clearance' }, { replace: true })}
      />

      <FlightPanel job={job} />

      <TripConnections job={job} />

      {/* Timeline of Stops */}
      <Flex vertical gap={16}>
        <Flex align="center" justify="space-between">
          <h3 className="type-h3 text-ink">Timeline</h3>
          <Flex gap={8} align="center">
            {planning && !draft && (
              <Button variant="secondary" size="sm" onClick={startEditing}>
                Edit route
              </Button>
            )}
            <Chip tone="neutral">Version {routePlan.versionNo}</Chip>
          </Flex>
        </Flex>

        <div className="flex flex-col">
          {stops.map((stop, i) => {
            const timeStr = times[i];
            // The leg to the next stop, under a 2 px rule beneath the marker (DESIGN.md, Route editor).
            const leg =
              i < stops.length - 1 ? routePlan.legs?.find((l) => l.fromStopId === stop.id) : null;
            const line = leg ? legLine(leg) : null;

            // On a shared trip each pickup and delivery names its job (US-F3-11).
            const shared = new Set(stops.map((s) => s.jobCode).filter(Boolean)).size > 1;
            const placeName =
              stop.kind === 'BORDER'
                ? stop.borderCrossingName || 'Border'
                : stop.placeName || 'Stop';
            const stopName = shared && stop.jobCode ? `${placeName} · ${stop.jobCode}` : placeName;
            // The delivery says how much of the arrival window the plan leaves spare.
            const spare =
              stop.kind === 'DELIVERY' &&
              (!stop.jobCode || stop.jobCode === job.code) &&
              !part?.handsOn &&
              job.windowStart &&
              job.windowEnd &&
              stop.plannedAt
                ? windowSpare(stop.plannedAt, job.windowEnd)
                : null;
            const details = [stop.details, spare].filter(Boolean).join(' ');

            return (
              <div key={stop.id} className="flex flex-col">
                <TimelineStop
                  kind={stop.kind}
                  stop={stopName}
                  time={timeStr}
                  details={details || undefined}
                />
                {i < stops.length - 1 && (
                  <div className="ml-[17px] min-h-4 border-l-2 border-line py-2.5 pl-[33px]">
                    {line && (
                      <span
                        className={cx(
                          'type-caption',
                          line.missingTime ? 'text-warn' : 'text-ink-3',
                        )}
                      >
                        {line.text}
                        {line.missingTime &&
                          ' · the welfare stops this drive needs can’t be checked'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Flex>

      {/* Ready to depart, until the trip leaves and On the road takes over; */}
      {!departed && (
        <DepartureReadiness
          job={job}
          part={part}
          steps={readiness}
          onOpenLoadPlan={() =>
            setSearchParams(
              { tab: 'trip', ...(part ? { trip: part.tripId } : {}), view: 'load-plan' },
              { replace: true },
            )
          }
          onOpenClearance={() => setSearchParams({ tab: 'clearance' }, { replace: true })}
        />
      )}

      {/* Not in the Route plan frame, so after its blocks: sharing and joining (US-F3-13, US-F3-18). */}
      {sharePanel}

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
