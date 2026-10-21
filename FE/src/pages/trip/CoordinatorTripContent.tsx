import { Chip, Panel, RouteStrip, StageMark, StatTile, Callout } from '@/components/ui';
import { TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import type { TripView } from '@/interfaces';
import { TripRecords } from './TripRecords';
import {
  conditionTone,
  durationLabel,
  eventLabels,
  formatClock,
  formatTime,
  isStable,
  kindTone,
  lastCheckpointRecord,
  lastConditionRecord,
  lastRecord,
  minutesBetween,
  sentence,
  stopKindLabel,
} from './trip-utils';

export function CoordinatorTripContent({ trip }: { trip: TripView }) {
  const last = lastRecord(trip);
  const lastCheckpoint = lastCheckpointRecord(trip);
  const welfare = lastConditionRecord(trip);
  const mostRecentStop = lastCheckpoint?.routeStopId
    ? trip.stops.find((stop) => stop.id === lastCheckpoint.routeStopId)
    : undefined;
  const next = trip.stops.find((stop) => !stop.latestOccurredAt);
  const delta = mostRecentStop
    ? minutesBetween(mostRecentStop.plannedAt, mostRecentStop.latestOccurredAt)
    : null;
  const stableCount = welfare?.conditions.filter((item) => isStable(item.condition)).length ?? 0;
  const arrivalWindow =
    trip.arrivalWindowStart && trip.arrivalWindowEnd
      ? `${formatClock(trip.arrivalWindowStart)}–${formatClock(trip.arrivalWindowEnd)}`
      : 'Not set';
  const horseCount = trip.horses.length;
  const lastChecks = new Map(welfare?.conditions.map((item) => [item.horseId, item]) ?? []);
  const crew = [...new Set(trip.records.map((record) => record.recordedBy).filter(Boolean))];
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          value={delta === null ? '—' : durationLabel(delta)}
          label={`Against plan at ${mostRecentStop?.name ?? 'last checkpoint'}`}
        />
        <StatTile
          value={arrivalWindow}
          label="Arrival window"
          lead={
            trip.plannedArrivalAt
              ? `Planned arrival · ${formatClock(trip.plannedArrivalAt)}`
              : 'No planned arrival time'
          }
        />
        <StatTile
          value={next ? formatClock(next.plannedAt) : '—'}
          label={`Next checkpoint · ${next?.name ?? 'No remaining stop'}`}
        />
        <StatTile
          tone={stableCount === horseCount && horseCount > 0 ? 'ok' : 'warn'}
          value={`${stableCount} of ${horseCount}`}
          label="Horses stable at last check"
          lead={welfare ? formatClock(welfare.occurredAt) : 'No condition check recorded'}
        />
      </div>

      <Panel
        title="Checkpoints, planned against recorded"
        extra={
          last ? (
            <span className="type-caption text-ink-3">Updated {formatClock(last.receivedAt)}</span>
          ) : undefined
        }
        flush
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="bg-sunken">
              <tr className="type-mono-label text-ink-3">
                <th className="px-5 py-3 font-medium">Checkpoint</th>
                <th className="px-4 py-3 font-medium">Planned</th>
                <th className="px-4 py-3 font-medium">Recorded</th>
                <th className="px-4 py-3 font-medium">Against plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {trip.stops.map((stop) => {
                const difference = minutesBetween(stop.plannedAt, stop.latestOccurredAt);
                const status = stop.latestStatus;
                return (
                  <tr key={stop.id} className={stop.id === next?.id ? 'bg-info-soft/50' : ''}>
                    <td className="px-5 py-4">
                      <span className="type-label-m block text-ink">{stop.name}</span>
                      <span className="type-body-s text-ink-3">
                        {stopKindLabel(stop.kind)}
                        {stop.details ? ` · ${stop.details}` : ''}
                      </span>
                    </td>
                    <td className="type-data whitespace-nowrap px-4 py-4 text-ink-2">
                      {formatTime(stop.plannedAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="type-data block text-ink">
                        {formatTime(stop.latestOccurredAt)}
                      </span>
                      {stop.latestNote && (
                        <span className="type-body-s text-ink-3">{stop.latestNote}</span>
                      )}
                      {stop.latestRecordedBy && (
                        <span className="type-body-s block text-ink-3">
                          {stop.latestRecordedBy}
                        </span>
                      )}
                    </td>
                    <td className="type-data whitespace-nowrap px-4 py-4 text-ink-2">
                      {difference === null ? '—' : durationLabel(difference)}
                    </td>
                    <td className="px-4 py-4">
                      <Chip
                        tone={status ? kindTone(status) : stop.id === next?.id ? 'info' : 'neutral'}
                      >
                        {status ? eventLabels[status] : stop.id === next?.id ? 'Next' : 'Upcoming'}
                      </Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!trip.stops.length && (
            <p className="type-body-s p-6 text-ink-3">
              The confirmed route has no checkpoints yet.
            </p>
          )}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-3">
          <p className="type-body-s m-0 text-ink-3">
            {trip.records.length} {trip.records.length === 1 ? 'record' : 'records'} from the cab.
            Every saved record is also shown to the customer.
          </p>
          <TripRecords trip={trip} />
        </div>
        <div className="flex flex-col gap-6">
          <Panel title="On board">
            <p className="type-body-s m-0 mb-3 text-ink-3">
              Last condition check{' '}
              {welfare
                ? `${formatClock(welfare.occurredAt)} by ${welfare.recordedBy ?? 'the escort'}`
                : 'not recorded yet'}
              .
            </p>
            <div className="divide-y divide-line">
              {trip.horses.map((horse) => {
                const condition = lastChecks.get(horse.id);
                const tone = conditionTone(condition?.condition);
                return (
                  <div key={horse.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <strong className="type-label-m block text-ink">{horse.name}</strong>
                      <span className="type-body-s text-ink-3">
                        {horse.stall ?? 'Stall not assigned'}
                        {condition?.note ? ` · ${condition.note}` : ''}
                      </span>
                    </div>
                    <Chip tone={tone}>
                      {condition ? sentence(condition.condition) : 'Not checked'}
                    </Chip>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel title="Crew and vehicle">
            <dl className="m-0 grid grid-cols-[100px_1fr] gap-x-4 gap-y-3">
              <dt className="type-body-s text-ink-3">Vehicle</dt>
              <dd className="type-data m-0 text-ink">{trip.vehicleCode ?? 'Not assigned'}</dd>
              <dt className="type-body-s text-ink-3">Crew seen</dt>
              <dd className="type-body-s m-0 text-ink-2">
                {crew.length ? crew.join(', ') : 'No trip records yet'}
              </dd>
              <dt className="type-body-s text-ink-3">Last update</dt>
              <dd className="type-data m-0 text-ink">
                {last
                  ? `${formatClock(last.occurredAt)} · ${last.recordedBy ?? 'Crew'}`
                  : 'Not recorded'}
              </dd>
            </dl>
          </Panel>
          <Panel title="What the customer sees">
            <p className="type-body-s m-0 text-ink-2">
              {mostRecentStop
                ? `Your horses ${eventLabels[lastCheckpoint?.kind ?? TripRecordKindEnum.NOTE].toLowerCase()} at ${mostRecentStop.name} at ${formatClock(lastCheckpoint?.occurredAt ?? null)}.`
                : 'The customer sees no trip position until the first checkpoint is recorded.'}
            </p>
            {next && (
              <p className="type-body-s m-2 text-ink-3">
                Next: {next.name}, planned {formatClock(next.plannedAt)}. Positions come only from
                recorded checkpoints.
              </p>
            )}
          </Panel>
          <Panel title="If the trip stops">
            <Callout
              tone={trip.tripStatus === TripStatusEnum.HELD ? 'bad' : 'info'}
              title={
                trip.tripStatus === TripStatusEnum.HELD
                  ? 'Trip is held'
                  : 'Record a hold from the cab'
              }
            >
              The escort records the stop and reason in the cab. That hold stays in the journey log
              and customer tracking until the trip resumes. The logistics manager owns incident
              follow-up.
            </Callout>
          </Panel>
        </div>
      </div>
    </div>
  );
}
