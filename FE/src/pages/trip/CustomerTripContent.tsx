import { Chip, Panel, RouteStrip, StageMark } from '@/components/ui';
import { TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import type { TripView } from '@/interfaces';
import { Photo, TripRecords } from './TripRecords';
import {
  conditionTone,
  eventLabels,
  formatClock,
  formatTime,
  lastCheckpointRecord,
  lastConditionRecord,
  sentence,
  statusTone,
  stopKindLabel,
} from './trip-utils';

export function CustomerTripContent({ trip }: { trip: TripView }) {
  const latest = lastCheckpointRecord(trip);
  const welfare = lastConditionRecord(trip);
  const handoverRecorded = trip.records.some(
    (record) => record.kind === TripRecordKindEnum.HANDED_OVER,
  );
  const tripStarted = trip.tripStatus !== TripStatusEnum.NOT_STARTED;
  const tripDelivered = trip.tripStatus === TripStatusEnum.DELIVERED;
  const stageStates = [
    { label: 'Request', state: 'done' },
    { label: 'Quotation', state: 'done' },
    { label: 'Approval', state: 'done' },
    { label: 'Documents', state: trip.clearanceReady ? 'done' : 'current' },
    { label: 'Clearance', state: trip.clearanceReady ? 'done' : 'upcoming' },
    {
      label: 'Trip',
      state: tripDelivered ? 'done' : tripStarted || trip.clearanceReady ? 'current' : 'upcoming',
    },
    {
      label: 'Handover',
      state: handoverRecorded ? 'done' : tripDelivered ? 'current' : 'upcoming',
    },
  ];
  const next = trip.stops.find((stop) => !stop.latestOccurredAt);
  const route = trip.stops.map((stop) => ({
    name: stop.name,
    kind: stopKindLabel(stop.kind),
    time: stop.latestOccurredAt
      ? `${formatClock(stop.latestOccurredAt)} · ${stop.latestStatus ? eventLabels[stop.latestStatus] : 'Recorded'}`
      : `Planned ${formatClock(stop.plannedAt)}`,
    state:
      trip.tripStatus === TripStatusEnum.HELD && stop.latestStatus === TripRecordKindEnum.HELD
        ? ('held' as const)
        : stop.latestOccurredAt
          ? ('done' as const)
          : stop.id === next?.id
            ? ('current' as const)
            : ('upcoming' as const),
  }));
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Travel pass">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="type-data text-ink-2">{trip.jobCode}</span>
            <h2 className="type-h2 m-0 mt-2 text-ink">
              {trip.origin ?? 'Origin'} → {trip.destination ?? 'Destination'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <StageMark stage={trip.tripStatus === TripStatusEnum.DELIVERED ? 'Handover' : 'Trip'} />
            <Chip tone={statusTone(trip.tripStatus)}>{sentence(trip.tripStatus)}</Chip>
          </div>
        </div>
        <div className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <span className="type-body-s block text-ink-3">Departs</span>
            <span className="type-data text-ink">{formatTime(trip.plannedDepartureAt)}</span>
          </div>
          <div>
            <span className="type-body-s block text-ink-3">Arrival window</span>
            <span className="type-data text-ink">
              {trip.arrivalWindowStart && trip.arrivalWindowEnd
                ? `${formatClock(trip.arrivalWindowStart)}–${formatClock(trip.arrivalWindowEnd)}`
                : 'Not set'}
            </span>
          </div>
          <div>
            <span className="type-body-s block text-ink-3">Horses</span>
            <span className="type-label-m text-ink">
              {trip.horses.map((horse) => horse.name).join(' · ') || 'None listed'}
            </span>
          </div>
          <div>
            <span className="type-body-s block text-ink-3">Vehicle</span>
            <span className="type-data text-ink">{trip.vehicleCode ?? 'Not assigned'}</span>
          </div>
        </div>
      </Panel>
      <Panel title="Journey stage">
        <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-4 xl:grid-cols-7">
          {stageStates.map((stage, index) => (
            <li
              key={stage.label}
              aria-current={stage.state === 'current' ? 'step' : undefined}
              className={`rounded-lg border px-3 py-3 ${stage.state === 'done' ? 'border-ok-line bg-ok-soft/60' : stage.state === 'current' ? 'border-info-line bg-info-soft' : 'border-line bg-card'}`}
            >
              <span className="type-caption block text-ink-3">
                {stage.state === 'done'
                  ? 'Done'
                  : stage.state === 'current'
                    ? 'Current'
                    : `Step ${index + 1}`}
              </span>
              <span className="type-label-m mt-1 block text-ink">{stage.label}</span>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel
        title={
          trip.tripStatus === TripStatusEnum.HELD
            ? 'Trip held'
            : trip.tripStatus === TripStatusEnum.DELIVERED
              ? 'Delivered'
              : trip.tripStatus === TripStatusEnum.NOT_STARTED
                ? 'Trip not started'
                : 'On the road'
        }
        extra={
          latest ? (
            <span className="type-caption text-ink-3">Updated {formatTime(latest.receivedAt)}</span>
          ) : undefined
        }
      >
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="type-h3 m-0 text-ink">
              {latest?.checkpointName
                ? `${latest.checkpointName} · ${eventLabels[latest.kind]}`
                : trip.clearanceReady
                  ? 'Waiting for the first checkpoint'
                  : 'Departure is waiting for clearance'}
            </p>
            <p className="type-body-s mb-0 mt-2 text-ink-2">
              {latest
                ? `Last confirmed update ${formatTime(latest.occurredAt)}. Between checkpoints, the position stays here; no estimated location is shown.`
                : 'The trip position will appear after the escort records a checkpoint.'}
            </p>
          </div>
          <div className="rounded-lg bg-sunken px-5 py-4 md:min-w-52">
            <span className="type-body-s block text-ink-3">Next checkpoint</span>
            <strong className="type-h4 mt-1 block text-ink">
              {trip.tripStatus === TripStatusEnum.HELD
                ? 'Waiting for the coordinator'
                : (next?.name ?? 'No remaining checkpoint')}
            </strong>
            <span className="type-data text-ink-2">
              {trip.tripStatus === TripStatusEnum.HELD
                ? 'No arrival estimate while the trip is held'
                : next
                  ? `Planned ${formatTime(next.plannedAt)}`
                  : (trip.destination ?? 'Destination')}
            </span>
          </div>
        </div>
      </Panel>
      <Panel title="Route progress">
        {route.length ? (
          <div className="overflow-x-auto pb-2">
            <RouteStrip stops={route} gate={trip.clearanceReady ? 'clear' : 'locked'} />
          </div>
        ) : (
          <p className="type-body-s m-0 text-ink-3">The confirmed route has no checkpoints yet.</p>
        )}
      </Panel>
      {welfare && (
        <Panel
          title="Latest condition log"
          extra={
            <span className="type-caption text-ink-3">
              {formatTime(welfare.occurredAt)} · {welfare.recordedBy ?? 'Escort'}
            </span>
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {welfare.conditions.map((condition) => (
              <div
                key={condition.horseId}
                className="rounded-lg border border-line bg-card px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="type-h4 text-ink">{condition.horseName}</strong>
                  <Chip tone={conditionTone(condition.condition)}>
                    {sentence(condition.condition)}
                  </Chip>
                </div>
                <p className="type-body-s mb-0 mt-2 text-ink-2">
                  {[
                    condition.drinking === null
                      ? null
                      : condition.drinking
                        ? 'Drinking'
                        : 'Not drinking',
                    condition.eating === null ? null : condition.eating ? 'Eating' : 'Not eating',
                    condition.note,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'No additional note'}
                </p>
                {condition.photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {condition.photos.map((photo) => (
                      <Photo key={photo.id} photo={photo} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
      <TripRecords trip={trip} />
    </div>
  );
}
