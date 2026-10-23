import { useMemo } from 'react';

import { eventLabels, formatAgainstPlan, formatClock, sentence } from './tripFormat';
import { TripRecords } from './TripRecords';

import { Button, Chip, Panel, StatTile } from '@/components/ui';
import type { HorseCondition, TripRecordKind, TripStop, TripView } from '@/interfaces';
import { HorseConditionEnum, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';

const kindTone = (kind: TripRecordKind) =>
  kind === TripRecordKindEnum.HELD
    ? 'bad'
    : kind === TripRecordKindEnum.CLEARED_BORDER ||
        kind === TripRecordKindEnum.DELIVERED ||
        kind === TripRecordKindEnum.DEPARTED
      ? 'ok'
      : 'info';

const conditionTone = (cond: HorseCondition) =>
  cond === HorseConditionEnum.STABLE ? 'ok' : cond === HorseConditionEnum.OFF_FEED ? 'bad' : 'warn';

export function TripDetails({
  trip,
  audience = 'staff',
}: {
  trip: TripView;
  audience?: 'staff' | 'customer' | 'escort';
}) {
  // Determine last recorded stop and next stop
  const recordedStops = useMemo(
    () => trip.stops.filter((s) => Boolean(s.latestOccurredAt)),
    [trip.stops],
  );
  const lastRecordedStop = recordedStops[recordedStops.length - 1];

  const nextStop = useMemo(() => trip.stops.find((s) => !s.latestOccurredAt), [trip.stops]);

  // Latest condition records to count stable horses
  const conditionRecords = useMemo(
    () =>
      trip.records
        .filter((r) => r.conditions.length > 0)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [trip.records],
  );
  const lastConditionRecord = conditionRecords[0];

  const stableHorsesCount = useMemo(() => {
    if (!lastConditionRecord) return trip.horses.length;
    return lastConditionRecord.conditions.filter((c) => c.condition === HorseConditionEnum.STABLE)
      .length;
  }, [lastConditionRecord, trip.horses.length]);

  const againstPlanText = lastRecordedStop
    ? formatAgainstPlan(lastRecordedStop.plannedAt, lastRecordedStop.latestOccurredAt)
    : '—';

  const windowText =
    trip.arrivalWindowStart && trip.arrivalWindowEnd
      ? `${formatClock(trip.arrivalWindowStart)}–${formatClock(trip.arrivalWindowEnd)}`
      : formatClock(trip.plannedArrivalAt);

  // Derive "What the customer sees" text
  const customerSeesText = useMemo(() => {
    if (trip.tripStatus === TripStatusEnum.HELD) {
      return `Held at ${lastRecordedStop?.name ?? 'checkpoint'} since ${formatClock(
        lastRecordedStop?.latestOccurredAt,
      )}. Waiting on logistics decision. Never an estimated arrival time.`;
    }
    if (lastRecordedStop) {
      const nextText = nextStop
        ? ` Next checkpoint: the ${nextStop.name}, expected ${formatClock(nextStop.plannedAt)}.`
        : ' Destination reached.';
      return `Your horses cleared ${lastRecordedStop.name} at ${formatClock(
        lastRecordedStop.latestOccurredAt,
      )}.${nextText}`;
    }
    return 'Departure is being prepared. Tracking updates will appear as checkpoints are recorded.';
  }, [trip.tripStatus, lastRecordedStop, nextStop]);

  return (
    <div className="flex flex-col gap-6">
      {/* 4 StatTiles at top (matching Figma scrTripCoordinator) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          tone={againstPlanText.startsWith('+') ? 'warn' : 'neutral'}
          value={againstPlanText}
          label={`Against plan at ${lastRecordedStop?.name ?? 'first stop'}`}
        />
        <StatTile
          tone="neutral"
          value={windowText}
          label={`Arrival window · plan arrives ${formatClock(trip.plannedArrivalAt)}`}
        />
        <StatTile
          tone="info"
          value={nextStop ? formatClock(nextStop.plannedAt) : 'Complete'}
          label={`Next checkpoint · ${nextStop?.name ?? 'Delivered'}`}
        />
        <StatTile
          tone={stableHorsesCount === trip.horses.length ? 'ok' : 'warn'}
          value={`${stableHorsesCount} of ${trip.horses.length}`}
          label={`Horses stable at last check${
            lastConditionRecord ? `, ${formatClock(lastConditionRecord.occurredAt)}` : ''
          }`}
        />
      </div>

      {/* Full-width Checkpoints Table */}
      <Panel
        title="Checkpoints, planned against recorded"
        extra={
          <span className="type-caption text-ink-3">
            Updated {formatClock(lastRecordedStop?.latestOccurredAt ?? new Date())}
          </span>
        }
      >
        <p className="type-body-s -mt-2 mb-4 text-ink-3">
          From the route plan confirmed for this trip; recorded times come from the cab.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-xs font-semibold text-ink-3">
                <th className="pb-3 pr-4">Checkpoint</th>
                <th className="pb-3 pr-4">Planned</th>
                <th className="pb-3 pr-4">Recorded</th>
                <th className="pb-3 pr-4 text-right">Against plan</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {trip.stops.map((stop) => {
                const isNext = nextStop?.id === stop.id;
                const isDone = Boolean(stop.latestOccurredAt);
                const against = formatAgainstPlan(stop.plannedAt, stop.latestOccurredAt);

                let statusChip = <Chip tone="neutral">Upcoming</Chip>;
                if (stop.latestStatus) {
                  statusChip = (
                    <Chip tone={kindTone(stop.latestStatus)}>
                      {eventLabels[stop.latestStatus] ?? sentence(stop.latestStatus)}
                    </Chip>
                  );
                } else if (isNext) {
                  statusChip = <Chip tone="info">Next</Chip>;
                }

                return (
                  <tr
                    key={stop.id}
                    className={`transition-colors ${
                      isNext ? 'bg-info-soft/20 font-medium' : 'hover:bg-muted/30'
                    }`}
                  >
                    <td className="py-3.5 pr-4">
                      <div className="flex flex-col">
                        <span className="type-label-m text-ink">{stop.name}</span>
                        <span className="type-body-s text-ink-3">
                          {stop.sequence}. {stop.kind.toLowerCase().replaceAll('_', ' ')}
                          {stop.details ? ` · ${stop.details}` : ''}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 pr-4">
                      <span className="type-mono-data text-ink-2">
                        {formatClock(stop.plannedAt)}
                      </span>
                    </td>

                    <td className="py-3.5 pr-4">
                      {isDone ? (
                        <div className="flex flex-col">
                          <span className="type-mono-data font-bold text-ink">
                            {formatClock(stop.latestOccurredAt)}
                          </span>
                          <span className="type-body-s text-ink-3">
                            {stop.latestNote ??
                              (stop.latestRecordedBy ? `Recorded by ${stop.latestRecordedBy}` : '')}
                          </span>
                        </div>
                      ) : (
                        <span className={`type-body-s ${isNext ? 'text-info' : 'text-ink-3'}`}>
                          {isNext ? `Expected at ${formatClock(stop.plannedAt)}` : 'Planned'}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 pr-4 text-right">
                      <span className="type-mono-data text-ink-2">{against}</span>
                    </td>

                    <td className="py-3.5 text-right">{statusChip}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Split Columns (Left & Right) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column (7 cols): Escort log + Customer sees */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <TripRecords trip={trip} />

          {audience !== 'customer' && (
            <Panel title="What the customer sees">
              <p className="type-body-s m-0 text-ink-2">{customerSeesText}</p>
            </Panel>
          )}
        </div>

        {/* Right Column (5 cols): On board + Crew & vehicle + If trip stops */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {/* On board horses */}
          <Panel
            title="On board"
            extra={
              <span className="type-caption text-ink-3">
                Last check{' '}
                {lastConditionRecord ? formatClock(lastConditionRecord.occurredAt) : 'not logged'}
              </span>
            }
          >
            <div className="divide-y divide-line">
              {trip.horses.map((horse) => {
                const latestCondition = lastConditionRecord?.conditions.find(
                  (c) => c.horseId === horse.id,
                );
                const cond = latestCondition?.condition ?? HorseConditionEnum.STABLE;

                return (
                  <div key={horse.id} className="flex items-center justify-between py-3">
                    <div className="flex flex-col">
                      <span className="type-label-m text-ink">{horse.name}</span>
                      <span className="type-body-s text-ink-3">
                        {horse.stall ?? 'Standard stall'}
                        {latestCondition?.note ? ` · ${latestCondition.note}` : ''}
                      </span>
                    </div>
                    <Chip tone={conditionTone(cond)}>{sentence(cond)}</Chip>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Crew and vehicle */}
          <Panel title="Crew and vehicle">
            <div className="divide-y divide-line">
              <div className="flex items-center justify-between py-2.5">
                <span className="type-body-s text-ink-3">Vehicle</span>
                <span className="type-label-m text-ink">
                  {trip.vehicleCode ?? 'Trailer TX-447'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="type-body-s text-ink-3">Driver</span>
                <span className="type-body-m text-ink">Minh, driver</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="type-body-s text-ink-3">Grooms</span>
                <span className="type-body-m text-ink">Lê Thị Hoa, Phạm Quốc Tuấn</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="type-body-s text-ink-3">Records</span>
                <span className="type-body-m text-ink">
                  All sent · last{' '}
                  {lastRecordedStop?.latestOccurredAt
                    ? formatClock(lastRecordedStop.latestOccurredAt)
                    : '—'}
                </span>
              </div>
              {audience === 'staff' && (
                <div className="pt-3">
                  <Button variant="secondary" block>
                    Call the cab
                  </Button>
                </div>
              )}
            </div>
          </Panel>

          {/* If the trip stops */}
          <Panel title="If the trip stops">
            <p className="type-body-s m-0 text-ink-2">
              The escort records the stop and reason in the cab. That hold stays in the journey log
              and customer tracking until the trip resumes. The logistics manager owns incident
              follow-up.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
