import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { App, Flex, Segmented } from 'antd';

import { AddTripModal } from './AddTripModal';
import { FlightTrip } from './FlightTrip';
import { journeyStandings, openingTrip } from './journey';
import { JourneyRail } from './JourneyRail';
import { JourneySummary } from './JourneySummary';
import { LoadPlanTab } from './LoadPlanTab';
import { RouteTab } from './RouteTab';

import { Button, Callout, Icon } from '@/components/ui';
import {
  useCanPlanTrips,
  useCanSignOffTripPlan,
  useDraftJourney,
  useJourneyDetails,
  useRemoveTrip,
} from '@/hooks/useJob';
import type { JobDetail, TripPart } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

export type TripView = 'load-plan' | 'route';

/** The view a trip opens on: the one asked for, else the one still to do (its load plan until confirmed). */
export const tripView = (job: JobDetail, asked: string | null): TripView =>
  asked === 'route' || asked === 'load-plan'
    ? asked
    : job.loadPlan?.status === 'CONFIRMED'
      ? 'route'
      : 'load-plan';

/**
 * True when the trip shown is a road trip on its Route view with a route: that view carries the clearance gate under
 * its summary strip, so the page header leaves it out.
 */
export const routeCarriesGate = (job: JobDetail, asked: string | null) => {
  const part = job.parts.find((p) => p.current);
  return Boolean(part && part.mode !== 'AIR' && job.routePlan && tripView(job, asked) === 'route');
};

/**
 * The Trip tab (US-F3-21): on a journey of two or more trips, a summary strip of the whole journey; then the
 * journey rail, each trip with where it stands, and beside it the trip chosen there. A road trip switches between
 * its Load plan and its Route; a flight shows only its flight. The tab opens on the first trip that waits on the
 * viewer. The coordinator builds the journey on the rail: Add trip from the city it has reached, take the last off.
 */
export function TripTab({ job }: { job: JobDetail }) {
  const { message, modal } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const planner = useCanPlanTrips();
  const remove = useRemoveTrip(job.id);
  const drafting = useDraftJourney(job.id);
  const canSignOff = useCanSignOffTripPlan();

  // Each trip's own page, so the rail and the summary can say where every trip stands.
  const details = useJourneyDetails(
    job.id,
    job.parts.map((p) => p.tripId),
  );
  const standings =
    job.parts.length > 1
      ? journeyStandings(
          job.parts,
          details.map((d) => d.data),
          { canPlan: planner, canSignOff },
        )
      : [];
  // With no trip asked for, open on the first trip that waits on the viewer, once every trip has said.
  const opening = standings.every((s) => s.word !== '…') ? openingTrip(standings) : null;
  const askedTrip = searchParams.get('trip');
  useEffect(() => {
    if (!askedTrip && opening && !opening.current)
      setSearchParams(
        {
          tab: 'trip',
          trip: opening.tripId,
          ...(searchParams.get('view') ? { view: searchParams.get('view')! } : {}),
        },
        { replace: true },
      );
  }, [askedTrip, opening, searchParams, setSearchParams]);

  const part = job.parts.find((p) => p.current) ?? null;
  const show = (trip: string, view?: TripView) =>
    setSearchParams({ tab: 'trip', trip, ...(view ? { view } : {}) }, { replace: true });
  const view = tripView(job, searchParams.get('view'));

  const addFrom = job.journeyComplete ? null : job.journeyEndCity;
  const takeOff = (last: TripPart) =>
    modal.confirm({
      title: `Take ${last.tripCode} off the journey?`,
      content:
        job.parts.length === 1
          ? `${job.code} has no trip again. A trip nobody else rides is deleted with its route, load plan, bookings and crew.`
          : `${job.code}’s journey ends in ${last.startCity} again. A trip nobody else rides is deleted with its route, load plan, bookings and crew.`,
      okText: 'Take it off',
      onOk: () =>
        remove.mutateAsync(last.tripId).then(
          (parts) => {
            message.success(`${last.tripCode} taken off ${job.code}’s journey.`);
            const lastLeft = parts.at(-1);
            setSearchParams(lastLeft ? { tab: 'trip', trip: lastLeft.tripId } : { tab: 'trip' }, {
              replace: true,
            });
          },
          (error) => message.error(apiErrorMessage(error, 'The trip wasn’t taken off.')),
        ),
    });

  const warnings = job.journeyWarnings.map((w) => <Callout key={w} tone="warn" title={w} />);

  const addModal = (
    <AddTripModal
      job={job}
      open={adding}
      onClose={() => setAdding(false)}
      onAdded={(added) => show(added.tripId)}
    />
  );

  if (job.parts.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-card p-12">
        <Flex vertical gap={16} align="center" className="text-center">
          <Flex
            align="center"
            justify="center"
            className="size-14 rounded-full bg-muted text-ink-2"
          >
            <Icon name="route" size={24} />
          </Flex>
          <h3 className="type-h3 m-0 text-ink">No trips yet</h3>
          <p className="type-body-m m-0 max-w-md text-ink-2">
            {planner
              ? `Draft ${job.code}’s journey from its quoted route, from ${job.originCity} to ${job.destinationCity}, then review each trip and confirm its route. Or build it one trip at a time.`
              : `The fleet coordinator builds ${job.code}’s journey, from ${job.originCity} to ${job.destinationCity}.`}
          </p>
          {planner && (
            <Flex gap={8} wrap justify="center">
              <Button
                variant="primary"
                size="md"
                leadingIcon="route"
                disabled={drafting.isPending}
                onClick={() =>
                  drafting.mutate(undefined, {
                    onSuccess: (parts) => {
                      message.success(
                        `${parts.length} ${parts.length === 1 ? 'trip' : 'trips'} drafted. Review each route and confirm it.`,
                      );
                      const firstTrip = parts[0];
                      if (firstTrip) show(firstTrip.tripId, 'route');
                    },
                    onError: (error) =>
                      message.error(
                        apiErrorMessage(error, 'The journey wasn’t drafted. Try again.'),
                      ),
                  })
                }
              >
                {drafting.isPending ? 'Drafting…' : 'Draft the journey from the quote'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                leadingIcon="plus"
                onClick={() => setAdding(true)}
              >
                Add the first trip by hand
              </Button>
            </Flex>
          )}
        </Flex>
        {addModal}
      </div>
    );
  }

  return (
    <Flex vertical gap={24}>
      <JourneySummary parts={job.parts} standings={standings} />
      <Flex gap={24} align="start">
        <JourneyRail
          parts={job.parts}
          standings={standings}
          onShow={(trip) => show(trip)}
          addFrom={addFrom}
          onAdd={planner ? () => setAdding(true) : null}
          onRemove={planner ? takeOff : null}
        />
        <div className="min-w-0 flex-1">
          <Flex vertical gap={24}>
            {warnings}
            {part && (
              <Flex align="center" justify="space-between" gap={16} wrap>
                <Flex vertical gap={2}>
                  <span className="type-h4 text-ink">
                    {part.startCity} → {part.endCity}
                  </span>
                  <span className="type-data text-ink-3">
                    {part.tripCode} · {part.corridorCode}
                    {part.handsOn ? ' · hands on to the next trip' : ''}
                  </span>
                </Flex>
                {part.mode !== 'AIR' && (
                  <Segmented<TripView>
                    value={view}
                    onChange={(v) => show(part.tripId, v)}
                    options={[
                      { label: 'Load plan', value: 'load-plan' },
                      { label: 'Route', value: 'route' },
                    ]}
                  />
                )}
              </Flex>
            )}
            {part?.mode === 'AIR' ? (
              <FlightTrip job={job} part={part} />
            ) : view === 'route' ? (
              <RouteTab job={job} />
            ) : (
              <LoadPlanTab job={job} />
            )}
          </Flex>
        </div>
      </Flex>
      {addModal}
    </Flex>
  );
}
