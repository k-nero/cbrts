import { useMemo, useRef, useState } from 'react';
import { Input, Select, Spin, Upload, message } from 'antd';
import type { UploadFile } from 'antd';
import { fileApi } from '@/apis/file';
import PageHeader from '@/components/PageHeader';
import { Button, Callout, Checkbox, Chip, Panel, RouteStrip, StageMark, TimelineStop } from '@/components/ui';
import { useAuth } from '@/hooks/auth';
import { apiErrorMessage } from '@/lib/utils';
import { useFileBlobUrl } from '@/hooks/file';
import { useTrip, useTripRecord, useTrips } from '@/hooks/trip';
import { HorseConditionEnum, TripConditionOptions, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import type {
  HorseCondition,
  TripCondition,
  TripPhoto,
  TripRecordKind,
  TripSummary,
  TripView,
} from '@/interfaces';
import EscortCab from './EscortCab';

const eventLabels: Record<TripRecordKind, string> = {
  [TripRecordKindEnum.LOADED]: 'Loaded',
  [TripRecordKindEnum.DEPARTED]: 'Departed',
  [TripRecordKindEnum.ARRIVED_AT_STOP]: 'Arrived at checkpoint',
  [TripRecordKindEnum.CLEARED_BORDER]: 'Customs cleared',
  [TripRecordKindEnum.HELD]: 'On hold',
  [TripRecordKindEnum.LEFT_STOP]: 'Left checkpoint',
  [TripRecordKindEnum.CONDITION_CHECK]: 'Condition check',
  [TripRecordKindEnum.ACCEPTED_BY_AIRLINE]: 'Accepted by airline',
  [TripRecordKindEnum.FLIGHT_DEPARTED]: 'Flight departed',
  [TripRecordKindEnum.FLIGHT_LANDED]: 'Flight landed',
  [TripRecordKindEnum.RELEASED_BY_AIRLINE]: 'Released by airline',
  [TripRecordKindEnum.DELIVERED]: 'Delivered',
  [TripRecordKindEnum.HANDED_OVER]: 'Handed over',
  [TripRecordKindEnum.NOTE]: 'Update',
};
const eventKinds = Object.values(TripRecordKindEnum);
const checkpointKinds = eventKinds.filter((kind) => kind !== TripRecordKindEnum.CONDITION_CHECK);
const kindsByStatus: Record<string, TripRecordKind[]> = {
  NOT_STARTED: [
    TripRecordKindEnum.LOADED,
    TripRecordKindEnum.NOTE,
    TripRecordKindEnum.DEPARTED,
    TripRecordKindEnum.FLIGHT_DEPARTED,
  ],
  DEPARTED: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.CLEARED_BORDER,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.ACCEPTED_BY_AIRLINE,
    TripRecordKindEnum.FLIGHT_DEPARTED,
    TripRecordKindEnum.FLIGHT_LANDED,
    TripRecordKindEnum.RELEASED_BY_AIRLINE,
    TripRecordKindEnum.NOTE,
  ],
  HELD: [TripRecordKindEnum.LEFT_STOP, TripRecordKindEnum.CLEARED_BORDER, TripRecordKindEnum.NOTE],
  ARRIVED: [TripRecordKindEnum.DELIVERED, TripRecordKindEnum.NOTE],
  DELIVERED: [TripRecordKindEnum.HANDED_OVER, TripRecordKindEnum.NOTE],
};
const kindsByStop: Record<string, TripRecordKind[]> = {
  BORDER: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.CLEARED_BORDER,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.NOTE,
  ],
  WELFARE: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.NOTE,
  ],
  DELIVERY: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.DELIVERED,
    TripRecordKindEnum.NOTE,
  ],
  AIRPORT_OUT: [
    TripRecordKindEnum.ACCEPTED_BY_AIRLINE,
    TripRecordKindEnum.FLIGHT_DEPARTED,
    TripRecordKindEnum.NOTE,
  ],
  AIRPORT_IN: [
    TripRecordKindEnum.FLIGHT_LANDED,
    TripRecordKindEnum.RELEASED_BY_AIRLINE,
    TripRecordKindEnum.NOTE,
  ],
  QUARANTINE: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.NOTE,
  ],
};
const conditions = TripConditionOptions;
const timeOptions = { dateStyle: 'medium', timeStyle: 'short' } as const;
const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('en-GB', timeOptions) : 'Not recorded';
const datetimeLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
const errorMessage = (error: unknown) =>
  apiErrorMessage(error, 'The trip update could not be saved.');
/** Status in words (DESIGN.md: a tone plus a word, never a raw enum). */
const sentence = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
const statusTone = (status: string) =>
  status === TripStatusEnum.DELIVERED ? 'ok' : status === TripStatusEnum.HELD ? 'warn' : 'info';
const conditionTone = (condition: HorseCondition) =>
  condition === HorseConditionEnum.OFF_FEED ||
  condition === HorseConditionEnum.STRESSED ||
  condition === HorseConditionEnum.CLIMATE_CHANGE ||
  condition === HorseConditionEnum.CONCERN
    ? 'bad'
    : condition === HorseConditionEnum.WATCH
      ? 'warn'
      : 'ok';
const kindTone = (kind: TripRecordKind) =>
  kind === TripRecordKindEnum.HELD
    ? 'warn'
    : kind === TripRecordKindEnum.CLEARED_BORDER || kind === TripRecordKindEnum.DELIVERED
      ? 'ok'
      : 'info';

function Photo({ photo }: { photo: TripPhoto }) {
  const image = useFileBlobUrl(photo.id);
  return image.url ? (
    <a href={image.url} target="_blank" rel="noreferrer">
      <img src={image.url} alt={photo.fileName} className="size-20 rounded-md object-cover" />
    </a>
  ) : null;
}

function TripRecords({ trip }: { trip: TripView }) {
  const records = useMemo(
    () => [...trip.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [trip.records],
  );
  return (
    <Panel title="Trip journey log">
      {records.length === 0 ? (
        <p className="type-body-s m-0 text-ink-3">No trip updates have been recorded yet.</p>
      ) : (
        <ol className="m-0 list-none divide-y divide-line p-0">
          {records.map((record) => (
            <li key={record.id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="type-body-m">
                  {record.checkpointName ?? 'Trip update'} · {eventLabels[record.kind]}
                </strong>
                <span className="type-data text-ink-3">{formatTime(record.occurredAt)}</span>
              </div>
              {record.text && <p className="type-body-s mb-2 mt-1 text-ink-2">{record.text}</p>}
              {record.documentsShown.length > 0 && (
                <p className="type-body-s mb-2 mt-1 text-ink-2">
                  Documents shown: {record.documentsShown.map((document) => document.name).join(' · ')}
                </p>
              )}
              {record.conditions.map((condition) => (
                <div key={condition.horseId} className="mt-3 rounded-lg bg-raised p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="type-h4">{condition.horseName}</strong>
                    <Chip
                      tone={conditionTone(condition.condition)}
                    >
                      {sentence(condition.condition)}
                    </Chip>
                  </div>
                  <p className="type-body-s mb-0 mt-1 text-ink-2">
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
                      .join(' · ')}
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
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function TripDetails({ trip }: { trip: TripView }) {
  const lastRecord = [...trip.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Trip status">
          <div className="type-h3">{sentence(trip.tripStatus)}</div>
          <p className="type-body-s mb-0 mt-2 text-ink-3">
            Last update:{' '}
            {lastRecord
              ? `${lastRecord.checkpointName ?? 'Trip'} · ${formatTime(lastRecord.occurredAt)}`
              : 'No checkpoint update yet'}
          </p>
        </Panel>
        <Panel title="Planned journey">
          <p className="type-body-m m-0">
            {trip.origin ?? 'Origin not set'} → {trip.destination ?? 'Destination not set'}
          </p>
          <p className="type-body-s mb-0 mt-2 text-ink-3">
            Departure {formatTime(trip.plannedDepartureAt)} · Arrival{' '}
            {formatTime(trip.plannedArrivalAt)}
          </p>
        </Panel>
        <Panel title="Transport">
          <p className="type-body-m m-0">{trip.vehicleCode ?? 'Vehicle not assigned'}</p>
          <p className="type-body-s mb-0 mt-2 text-ink-3">
            {trip.clearanceReady ? 'Clearance ready' : 'Departure is waiting for clearance'}
          </p>
        </Panel>
      </div>
      <Panel title="Route progress">
        {trip.stops.length === 0 ? (
          <p className="type-body-s m-0 text-ink-3">The confirmed route has no checkpoints yet.</p>
        ) : (
          <ol className="m-0 list-none space-y-3 p-0">
            {trip.stops.map((stop) => {
              const stopKind =
                stop.kind === 'BORDER'
                  ? 'border'
                  : stop.kind === 'WELFARE' || stop.kind === 'QUARANTINE'
                    ? 'welfare'
                    : stop.kind === 'DELIVERY' || stop.kind === 'AIRPORT_IN'
                      ? 'delivery'
                      : 'pickup';
              const detail = [
                stop.details,
                stop.latestNote,
                stop.latestRecordedBy ? `Recorded by ${stop.latestRecordedBy}` : null,
              ]
                .filter(Boolean)
                .join(' · ');
              const status = stop.latestStatus ? (
                <Chip tone={kindTone(stop.latestStatus)}>{eventLabels[stop.latestStatus]}</Chip>
              ) : (
                <Chip>Waiting for update</Chip>
              );
              return (
                <li key={stop.id}>
                  <TimelineStop
                    kind={stopKind}
                    stop={`${stop.sequence}. ${stop.name}`}
                    time={
                      stop.latestOccurredAt
                        ? formatTime(stop.latestOccurredAt)
                        : `Planned ${formatTime(stop.plannedAt)}`
                    }
                    details={detail || stop.kind.replaceAll('_', ' ')}
                    status={status}
                  />
                </li>
              );
            })}
          </ol>
        )}
      </Panel>
      <Panel title="Horses on this trip">
        <div className="divide-y divide-line">
          {trip.horses.map((horse) => (
            <div key={horse.id} className="flex justify-between gap-2 py-3">
              <strong className="type-h4">{horse.name}</strong>
              <span className="type-body-s text-ink-3">{horse.stall ?? 'Stall not assigned'}</span>
            </div>
          ))}
        </div>
      </Panel>
      <TripRecords trip={trip} />
    </div>
  );
}

function CustomerTrackingBoard({ trip }: { trip: TripView }) {
  const orderedStops = [...trip.stops].sort((a, b) => a.sequence - b.sequence);
  const records = [...trip.records].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const lastCheckpoint = [...records]
    .reverse()
    .find(
      (record) =>
        record.routeStopId &&
        record.kind !== TripRecordKindEnum.NOTE &&
        record.kind !== TripRecordKindEnum.CONDITION_CHECK,
    );
  const heldRecord =
    trip.tripStatus === TripStatusEnum.HELD
      ? [...records].reverse().find((record) => record.kind === TripRecordKindEnum.HELD)
      : undefined;
  const lastIndex = orderedStops.findIndex((stop) => stop.id === lastCheckpoint?.routeStopId);
  const currentStop = heldRecord?.routeStopId
    ? orderedStops.find((stop) => stop.id === heldRecord.routeStopId)
    : lastCheckpoint?.kind === TripRecordKindEnum.ARRIVED_AT_STOP
      ? orderedStops[lastIndex]
      : orderedStops[lastIndex + 1] ?? orderedStops.find((stop) => !stop.latestStatus);
  const departure = records.find(
    (record) =>
      record.kind === TripRecordKindEnum.DEPARTED ||
      record.kind === TripRecordKindEnum.FLIGHT_DEPARTED,
  );
  const border = orderedStops.find((stop) => stop.kind === 'BORDER');
  const routeStripStops = orderedStops.map((stop) => ({
    name: stop.name,
    kind: stop.kind.replaceAll('_', ' '),
    time: stop.latestOccurredAt
      ? formatTime(stop.latestOccurredAt)
      : stop.plannedAt
        ? `Planned ${formatTime(stop.plannedAt)}`
        : 'Not recorded',
    state:
      stop.id === currentStop?.id
        ? ('current' as const)
        : stop.latestStatus
          ? ('done' as const)
          : ('upcoming' as const),
  }));
  const routeName = `${trip.origin ?? 'Origin not set'} → ${trip.destination ?? 'Destination not set'}`;
  const checkpoints = records.filter(
    (record) =>
      record.routeStopId &&
      record.kind !== TripRecordKindEnum.NOTE &&
      record.kind !== TripRecordKindEnum.CONDITION_CHECK,
  );
  const stageIndex = trip.tripStatus === TripStatusEnum.DELIVERED ? 6 : 5;
  const stages = ['Request', 'Quotation', 'Approval', 'Documents', 'Clearance', 'Trip', 'Handover'];

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Travel pass"
        extra={
          <div className="flex flex-wrap items-center gap-3">
            <StageMark stage={trip.tripStatus === TripStatusEnum.DELIVERED ? 'Handover' : 'Trip'} />
            <Chip tone={statusTone(trip.tripStatus)}>{sentence(trip.tripStatus)}</Chip>
          </div>
        }
      >
        <p className="type-data m-0 text-ink-3">{trip.jobCode}</p>
        <h2 className="type-display-l mb-5 mt-2">{routeName}</h2>
        <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <span className="type-body-s text-ink-3">Departed</span>
            <p className="type-data m-0 mt-1">{departure ? formatTime(departure.occurredAt) : 'Not recorded'}</p>
          </div>
          <div>
            <span className="type-body-s text-ink-3">Border checkpoint</span>
            <p className="type-label-m m-0 mt-1">{border?.name ?? 'Not on route'}</p>
          </div>
          <div>
            <span className="type-body-s text-ink-3">Horses</span>
            <p className="type-label-m m-0 mt-1">{trip.horses.length}</p>
          </div>
          <div>
            <span className="type-body-s text-ink-3">Planned arrival</span>
            <p className="type-data m-0 mt-1">{formatTime(trip.plannedArrivalAt)}</p>
          </div>
        </div>
        {trip.arrivalWindowStart && trip.arrivalWindowEnd && (
          <p className="type-body-s mb-0 mt-4 text-ink-2">
            Arrival window: {formatTime(trip.arrivalWindowStart)}–{formatTime(trip.arrivalWindowEnd)}
          </p>
        )}
      </Panel>

      {heldRecord && (
        <Callout tone="bad" title={`Trip held${heldRecord.checkpointName ? ` at ${heldRecord.checkpointName}` : ''}`}>
          {heldRecord.text || 'The escort recorded that the trip is on hold.'} · {formatTime(heldRecord.occurredAt)}
        </Callout>
      )}

      <Panel title="Route progress">
        {routeStripStops.length === 0 ? (
          <p className="type-body-s m-0 text-ink-3">The confirmed route has no checkpoints yet.</p>
        ) : (
          <div className="overflow-x-auto pb-2">
            <RouteStrip stops={routeStripStops} />
          </div>
        )}
      </Panel>

      <Panel title="Where it stands">
        <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-4 xl:grid-cols-7">
          {stages.map((stage, index) => {
            const done = index < stageIndex || (index === stageIndex && trip.tripStatus === TripStatusEnum.DELIVERED);
            const current = index === stageIndex && trip.tripStatus !== TripStatusEnum.DELIVERED;
            return (
              <li
                key={stage}
                aria-current={current ? 'step' : undefined}
                className={`rounded-md border p-3 ${
                  current
                    ? 'border-info-line bg-info-soft'
                    : done
                      ? 'border-ok-line bg-ok-soft'
                      : 'border-line bg-card'
                }`}
              >
                <span className="type-caption text-ink-3">{index + 1} of {stages.length}</span>
                <p className="type-label-m m-0 mt-1">{stage}</p>
                <p className="type-caption m-0 mt-1 text-ink-3">
                  {done ? 'Complete' : current ? trip.tripStatus === TripStatusEnum.HELD ? 'Held · operations team alerted' : 'Escort records checkpoints' : index === 6 ? 'Customer confirms handover' : 'Complete'}
                </p>
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel title="Recorded checkpoint log">
        {checkpoints.length === 0 ? (
          <p className="type-body-s m-0 text-ink-3">No checkpoint has been recorded yet. The route will update as the escort records progress.</p>
        ) : (
          <ol className="m-0 list-none divide-y divide-line p-0">
            {[...checkpoints].reverse().map((record) => (
              <li key={record.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div>
                  <strong className="type-body-m">{record.checkpointName ?? 'Checkpoint'} · {eventLabels[record.kind]}</strong>
                  {record.text && <p className="type-body-s mb-0 mt-1 text-ink-2">{record.text}</p>}
                  <p className="type-body-s mb-0 mt-1 text-ink-3">Recorded by {record.recordedBy ?? 'trip crew'}</p>
                </div>
                <time className="type-data text-ink-3">{formatTime(record.occurredAt)}</time>
              </li>
            ))}
          </ol>
        )}
      </Panel>
      <TripRecords trip={trip} />
    </div>
  );
}

function CoordinatorTripBoard({ trip }: { trip: TripView }) {
  const orderedStops = [...trip.stops].sort((a, b) => a.sequence - b.sequence);
  const records = [...trip.records].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const latestRecord = records.at(-1);
  const heldRecord =
    trip.tripStatus === TripStatusEnum.HELD
      ? [...records].reverse().find((record) => record.kind === TripRecordKindEnum.HELD)
      : undefined;
  const lastCheckpoint = [...records]
    .reverse()
    .find(
      (record) =>
        record.routeStopId &&
        record.kind !== TripRecordKindEnum.NOTE &&
        record.kind !== TripRecordKindEnum.CONDITION_CHECK,
    );
  const lastStopIndex = orderedStops.findIndex((stop) => stop.id === lastCheckpoint?.routeStopId);
  const heldStop = heldRecord?.routeStopId
    ? orderedStops.find((stop) => stop.id === heldRecord.routeStopId)
    : undefined;
  const lastStop = lastCheckpoint?.routeStopId
    ? orderedStops.find((stop) => stop.id === lastCheckpoint.routeStopId)
    : undefined;
  const activeStop =
    heldStop ??
    (lastCheckpoint?.kind === TripRecordKindEnum.ARRIVED_AT_STOP
      ? lastStop
      : orderedStops[lastStopIndex + 1] ?? orderedStops.find((stop) => !stop.latestStatus));
  const lastConditionRecord = [...records]
    .reverse()
    .find((record) => record.conditions.length > 0);
  const latestConditionByHorse = new Map<string, TripCondition>();
  records.forEach((record) =>
    record.conditions.forEach((condition) => latestConditionByHorse.set(condition.horseId, condition)),
  );
  const horseConditions = trip.horses.map((horse) => ({
    horse,
    condition: latestConditionByHorse.get(horse.id),
  }));
  const soundCount = (lastConditionRecord?.conditions ?? []).filter(
    (condition) =>
      condition.condition === HorseConditionEnum.STABLE || condition.condition === HorseConditionEnum.SOUND,
  ).length;
  const lastRecordedStop = lastStop;
  const nextStop = activeStop;
  const deltaMinutes =
    lastRecordedStop?.plannedAt && lastRecordedStop.latestOccurredAt
      ? Math.round((Date.parse(lastRecordedStop.latestOccurredAt) - Date.parse(lastRecordedStop.plannedAt)) / 60_000)
      : null;
  const delta =
    deltaMinutes === null
      ? '—'
      : deltaMinutes === 0
        ? 'On time'
        : `${deltaMinutes > 0 ? '+' : '−'}${Math.floor(Math.abs(deltaMinutes) / 60)}h ${Math.abs(deltaMinutes) % 60}m`;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Panel title="Against plan at last checkpoint">
          <p className="type-h3 m-0">{delta}</p>
          <p className="type-body-s mb-0 mt-1 text-ink-3">{lastRecordedStop?.name ?? 'No checkpoint recorded'}</p>
        </Panel>
        <Panel title="Arrival window">
          <p className="type-h3 m-0">
            {trip.arrivalWindowStart && trip.arrivalWindowEnd
              ? `${formatTime(trip.arrivalWindowStart)}–${formatTime(trip.arrivalWindowEnd)}`
              : formatTime(trip.plannedArrivalAt)}
          </p>
          <p className="type-body-s mb-0 mt-1 text-ink-3">Planned arrival</p>
        </Panel>
        <Panel title="Next checkpoint">
          <p className="type-h3 m-0">{nextStop?.name ?? 'Route complete'}</p>
          <p className="type-body-s mb-0 mt-1 text-ink-3">
            {heldStop ? 'Trip held here' : nextStop?.plannedAt ? `Planned ${formatTime(nextStop.plannedAt)}` : 'No estimate shown'}
          </p>
        </Panel>
        <Panel title="Horses sound at latest check">
          <p className="type-h3 m-0">{lastConditionRecord ? `${soundCount} of ${trip.horses.length}` : '—'}</p>
          <p className="type-body-s mb-0 mt-1 text-ink-3">
            {lastConditionRecord ? formatTime(lastConditionRecord.occurredAt) : 'No condition log yet'}
          </p>
        </Panel>
      </div>
      <p className="type-body-m m-0 rounded-lg border border-line bg-card px-4 py-3">
        Current leg:{' '}
        <strong>
          {heldStop
            ? `Held at ${heldStop.name}`
            : lastCheckpoint?.kind === TripRecordKindEnum.ARRIVED_AT_STOP
              ? `At ${lastStop?.name ?? 'checkpoint'}`
              : `${lastStop?.name ?? trip.origin ?? 'Origin'} → ${activeStop?.name ?? trip.destination ?? 'Destination'}`}
        </strong>
      </p>

      <Panel title="Checkpoints, planned against recorded">
        {orderedStops.length === 0 ? (
          <p className="type-body-s m-0 text-ink-3">The confirmed route has no checkpoints yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-ink-3">
                  <th className="py-3 pr-4 type-label-s">Checkpoint</th>
                  <th className="py-3 pr-4 type-label-s">Planned</th>
                  <th className="py-3 pr-4 type-label-s">Recorded by</th>
                  <th className="py-3 pr-4 type-label-s">Recorded</th>
                  <th className="py-3 pr-4 type-label-s">Against plan</th>
                  <th className="py-3 type-label-s">Status</th>
                </tr>
              </thead>
              <tbody>
                {orderedStops.map((stop) => {
                  const minutes = stop.plannedAt && stop.latestOccurredAt
                    ? Math.round((Date.parse(stop.latestOccurredAt) - Date.parse(stop.plannedAt)) / 60_000)
                    : null;
                  const variance = minutes === null ? '—' : minutes === 0 ? 'On time' : `${minutes > 0 ? '+' : '−'}${Math.floor(Math.abs(minutes) / 60)}h ${Math.abs(minutes) % 60}m`;
                  return (
                    <tr key={stop.id} className="border-b border-line last:border-0">
                      <td className="py-3 pr-4">
                        <strong className="type-body-m">{stop.name}</strong>
                        <p className="type-body-s m-0 text-ink-3">{stop.kind.replaceAll('_', ' ')}</p>
                      </td>
                      <td className="py-3 pr-4 type-data">{formatTime(stop.plannedAt)}</td>
                      <td className="py-3 pr-4 type-body-s">{stop.latestRecordedBy ?? '—'}</td>
                      <td className="py-3 pr-4 type-data">{formatTime(stop.latestOccurredAt)}</td>
                      <td className="py-3 pr-4 type-data">{variance}</td>
                      <td className="py-3">
                        {stop.latestStatus ? (
                          <Chip tone={kindTone(stop.latestStatus)}>{eventLabels[stop.latestStatus]}</Chip>
                        ) : stop.id === activeStop?.id ? (
                          <Chip tone="info">Next</Chip>
                        ) : (
                          <Chip>Upcoming</Chip>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Escort’s log">
          {records.length === 0 ? (
            <p className="type-body-s m-0 text-ink-3">No trip updates have been recorded yet.</p>
          ) : (
            <ol className="m-0 list-none divide-y divide-line p-0">
              {[...records].reverse().map((record) => (
                <li key={record.id} className="grid gap-1 py-3 sm:grid-cols-[5rem_minmax(0,1fr)_10rem]">
                  <time className="type-data text-ink-3">{formatTime(record.occurredAt)}</time>
                  <span className="type-body-s">
                    {record.checkpointName ?? 'Trip update'} · {eventLabels[record.kind]}
                    {record.text ? ` · ${record.text}` : ''}
                  </span>
                  <span className="type-body-s text-ink-3 sm:text-right">{record.recordedBy ?? 'Unknown recorder'}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Panel title="On board · last condition check">
          {horseConditions.length === 0 ? (
            <p className="type-body-s m-0 text-ink-3">No horses are attached to this trip.</p>
          ) : (
            <div className="divide-y divide-line">
              {horseConditions.map(({ horse, condition }) => (
                <div key={horse.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <strong className="type-body-m">{horse.name}</strong>
                    <p className="type-body-s m-0 text-ink-3">
                      {[horse.stall, condition?.note, condition?.drinking === null || condition?.drinking === undefined ? null : condition.drinking ? 'Drinking' : 'Not drinking', condition?.eating === null || condition?.eating === undefined ? null : condition.eating ? 'Eating' : 'Not eating'].filter(Boolean).join(' · ') || 'No condition recorded'}
                    </p>
                  </div>
                  {condition ? (
                    <Chip tone={conditionTone(condition.condition)}>
                      {sentence(condition.condition)}
                    </Chip>
                  ) : <Chip>No check recorded</Chip>}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 border-t border-line pt-4">
            <strong className="type-body-m">Crew and vehicle</strong>
            <p className="type-body-s mb-0 mt-1 text-ink-3">
              {trip.crew.length ? trip.crew.join(' · ') : 'Crew not assigned'} ·{' '}
              {trip.vehicleCode ?? 'Vehicle not assigned'}
            </p>
          </div>
        </Panel>
      </div>
      <Panel title="If the trip stops">
        <p className="type-body-s m-0 text-ink-2">
          A hold recorded by the cab is shown immediately in the trip status and journey log. The coordinator should contact the cab and follow the incident process for any issue that cannot be recorded there.
        </p>
      </Panel>
      {latestRecord && (
        <p className="type-caption m-0 text-right text-ink-3">Updated from the recorded trip log · {formatTime(latestRecord.occurredAt)}</p>
      )}
    </div>
  );
}

type Observation = {
  checked: boolean;
  condition: HorseCondition | null;
  drinking: boolean | null;
  eating: boolean | null;
  note: string;
  photos: UploadFile[];
};
const emptyObservation = (): Observation => ({
  checked: false,
  condition: null,
  drinking: null,
  eating: null,
  note: '',
  photos: [],
});

function TripWorkspace({
  audience,
  title,
  summary,
  editable = false,
}: {
  audience: 'escort' | 'staff' | 'customer';
  title: string;
  summary: string;
  editable?: boolean;
}) {
  const { logout } = useAuth();
  const [page, setPage] = useState(0);
  const summariesQuery = useTrips(audience, page);
  const summaries = summariesQuery.data?.content ?? [];
  const [code, setCode] = useState('');
  const selectedCode = summaries.some((item) => item.jobCode === code)
    ? code
    : (summaries[0]?.jobCode ?? '');
  const detailQuery = useTrip(audience, selectedCode);
  const trip = detailQuery.data;
  const [kind, setKind] = useState<TripRecordKind>(TripRecordKindEnum.ARRIVED_AT_STOP);
  const [stopId, setStopId] = useState<string>();
  const selectedSummary: TripSummary | undefined = summaries.find(
    (item) => item.jobCode === selectedCode,
  );
  const latestHeldRecord = [...(trip?.records ?? [])]
    .reverse()
    .find((record) => record.kind === TripRecordKindEnum.HELD);
  const selectedStop = trip?.stops.find((stop) => stop.id === stopId);
  const availableCheckpointKinds: TripRecordKind[] = checkpointKinds.filter(
    (value) =>
      (audience !== 'staff' || value !== TripRecordKindEnum.HANDED_OVER) &&
      (kindsByStatus[trip?.tripStatus ?? ''] ?? []).includes(value) &&
      (!selectedStop || (kindsByStop[selectedStop.kind] ?? checkpointKinds).includes(value)),
  );
  const selectedKind = availableCheckpointKinds.includes(kind) ? kind : availableCheckpointKinds[0];
  const [occurredAt, setOccurredAt] = useState(datetimeLocal);
  const [text, setText] = useState('');
  const [conditionByHorse, setConditionByHorse] = useState<Record<string, Observation>>({});
  const clientRefs = useRef<{ checkpoint: string | null; condition: string | null }>({
    checkpoint: null,
    condition: null,
  });
  const uploadedPhotos = useRef(new Map<string, string>());
  const mutation = useTripRecord(audience === 'staff' ? 'staff' : 'escort', selectedCode);
  const [messageApi, contextHolder] = message.useMessage();
  const updateObservation = (horseId: string, update: Partial<Observation>) => {
    setConditionByHorse((current) => ({
      ...current,
      [horseId]: { ...emptyObservation(), ...current[horseId], ...update },
    }));
  };

  const saveCheckpoint = async () => {
    if (!trip) return;
    const clientRef = clientRefs.current.checkpoint ?? crypto.randomUUID();
    clientRefs.current.checkpoint = clientRef;
    try {
      await mutation.mutateAsync({
        routeStopId: stopId ?? null,
        kind: selectedKind ?? kind,
        occurredAt: new Date(occurredAt).toISOString(),
        clientRef,
        text: text || undefined,
      });
      clientRefs.current.checkpoint = null;
      messageApi.success('Trip checkpoint saved.');
      setText('');
      setOccurredAt(datetimeLocal());
    } catch (error) {
      messageApi.error(errorMessage(error));
    }
  };

  const saveConditions = async () => {
    if (!trip) return;
    const checked = trip.horses.flatMap((horse) => {
      const observation = conditionByHorse[horse.id];
      return observation?.checked ? [{ horse, observation }] : [];
    });
    if (checked.length === 0) {
      messageApi.error('Select each horse you actually checked before saving.');
      return;
    }
    if (checked.some(({ observation }) => observation.condition === null)) {
      messageApi.error('Choose an observed condition for every selected horse.');
      return;
    }
    const clientRef = clientRefs.current.condition ?? crypto.randomUUID();
    clientRefs.current.condition = clientRef;
    try {
      const conditions = await Promise.all(
        checked.map(async ({ horse, observation }) => {
          const photoFileIds: string[] = [];
          for (const upload of observation.photos) {
            if (!upload.originFileObj) continue;
            const existingId = uploadedPhotos.current.get(upload.uid);
            if (existingId) {
              photoFileIds.push(existingId);
              continue;
            }
            const id = (await fileApi.upload(upload.originFileObj)).id;
            uploadedPhotos.current.set(upload.uid, id);
            photoFileIds.push(id);
          }
          return {
            horseId: horse.id,
            condition: observation.condition!,
            drinking: observation.drinking,
            eating: observation.eating,
            note: observation.note || undefined,
            photoFileIds,
          };
        }),
      );
      await mutation.mutateAsync({
        routeStopId: stopId ?? null,
        kind: TripRecordKindEnum.CONDITION_CHECK,
        occurredAt: new Date().toISOString(),
        clientRef,
        text: text || undefined,
        conditions,
      });
      clientRefs.current.condition = null;
      uploadedPhotos.current.clear();
      setConditionByHorse({});
      messageApi.success('Horse condition log saved.');
      setText('');
      setOccurredAt(datetimeLocal());
    } catch (error) {
      messageApi.error(errorMessage(error));
    }
  };

  const pageChange = (nextPage: number) => {
    setPage(nextPage);
    setCode('');
    setStopId(undefined);
  };
  return (
    <div className="flex flex-col gap-6">
      {contextHolder}
      <PageHeader
        title={title}
        summary={summary}
        right={
          audience === 'escort' ? (
            <Button variant="secondary" onClick={logout}>
              Sign out
            </Button>
          ) : undefined
        }
      />
      {summariesQuery.isPending && (
        <div className="py-12 text-center">
          <Spin />
        </div>
      )}
      {summariesQuery.isError && (
        <Callout tone="bad" title="The trips could not be loaded">
          {apiErrorMessage(summariesQuery.error, 'Refresh the page to try again.')}
        </Callout>
      )}
      {summariesQuery.data && summariesQuery.data.totalPages === 0 && (
        <Panel>
          <p className="type-body-s m-0 text-ink-2">No trips are available for this account yet.</p>
        </Panel>
      )}
      {summaries.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Select
              aria-label="Select trip"
              value={selectedCode}
              onChange={(value) => {
                setCode(value);
                setStopId(undefined);
              }}
              options={summaries.map((item) => ({
                value: item.jobCode,
                label: `${item.jobCode} · ${item.origin ?? 'Origin'} → ${item.destination ?? 'Destination'}`,
              }))}
              className="min-w-72 flex-1"
            />
            {summariesQuery.data && summariesQuery.data.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={summariesQuery.data.first}
                  onClick={() => pageChange(page - 1)}
                >
                  Previous
                </Button>
                <span className="type-body-s text-ink-3">
                  Page {page + 1} of {summariesQuery.data.totalPages}
                </span>
                <Button
                  size="sm"
                  disabled={summariesQuery.data.last}
                  onClick={() => pageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          {selectedSummary && (
            <Panel
              title={selectedSummary.jobCode}
              extra={
                <Chip tone={statusTone(selectedSummary.tripStatus)}>
                  {sentence(selectedSummary.tripStatus)}
                </Chip>
              }
            >
              <p className="type-body-s m-0 text-ink-3">
                {selectedSummary.origin ?? 'Origin not set'} →{' '}
                {selectedSummary.destination ?? 'Destination not set'} · Last update{' '}
                {formatTime(selectedSummary.lastUpdate)}
              </p>
            </Panel>
          )}
          {detailQuery.isPending && (
            <div className="py-8 text-center">
              <Spin />
            </div>
          )}
          {detailQuery.isError && (
            <Callout tone="bad" title="This trip could not be loaded">
              {apiErrorMessage(detailQuery.error, 'Refresh the page to try again.')}
            </Callout>
          )}
          {audience === 'customer' && trip && (
            <Callout tone="info" title="Progress follows recorded checkpoints">
              You see the last checkpoint the escort or coordinator recorded, with its time. It
              refreshes on its own.
            </Callout>
          )}
          {editable && trip && (
            <Panel
              title={
                audience === 'escort'
                  ? 'Report checkpoint and horse condition'
                  : 'Update progress by checkpoint'
              }
            >
              {!trip.clearanceReady && (
                <Callout className="mb-4" tone="bad" title="Departure locked">
                  Departure can be recorded once the transport specialist clears the dossier.
                </Callout>
              )}
              {audience === 'escort' && trip.tripStatus === TripStatusEnum.HELD && (
                <Callout className="mb-4" tone="bad" title="Trip on hold">
                  {latestHeldRecord?.text || 'The trip is on hold.'} ·{' '}
                  {latestHeldRecord
                    ? formatTime(latestHeldRecord.occurredAt)
                    : 'Reason not recorded'}
                </Callout>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <label className="type-body-s flex flex-col gap-2">
                  Checkpoint
                  <Select
                    value={stopId}
                    onChange={setStopId}
                    allowClear
                    placeholder="Trip-wide update"
                    options={trip.stops.map((stop) => ({ value: stop.id, label: stop.name }))}
                  />
                </label>
                <label className="type-body-s flex flex-col gap-2">
                  Checkpoint status
                  <Select
                    value={selectedKind}
                    onChange={setKind}
                    options={availableCheckpointKinds.map((value) => ({
                      value,
                      label: eventLabels[value],
                    }))}
                  />
                </label>
                <label className="type-body-s flex flex-col gap-2">
                  Recorded time
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={(event) => setOccurredAt(event.target.value)}
                    className="h-8 rounded-md border border-line-strong bg-input px-2"
                  />
                </label>
                <label className="type-body-s flex flex-col gap-2">
                  Update note
                  <Input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    maxLength={500}
                    placeholder="What happened at this checkpoint?"
                  />
                </label>
              </div>
              {audience === 'escort' && (
                <div className="mt-5 divide-y divide-line">
                  {trip.horses.map((horse) => {
                    const observation = conditionByHorse[horse.id] ?? emptyObservation();
                    return (
                      <section key={horse.id} className="grid gap-3 py-4 md:grid-cols-2">
                        <div>
                          <strong className="type-h4">{horse.name}</strong>
                          <p className="type-body-s m-0 text-ink-3">
                            {horse.stall ?? 'Stall not assigned'}
                          </p>
                        </div>
                        <Checkbox
                          label="I checked this horse"
                          checked={observation.checked}
                          onChange={(event) =>
                            updateObservation(horse.id, { checked: event.target.checked })
                          }
                        />
                        <Select
                          aria-label={`${horse.name} condition`}
                          allowClear
                          placeholder="Observed condition"
                          value={observation.condition ?? undefined}
                          onChange={(condition?: HorseCondition) =>
                            updateObservation(horse.id, { condition: condition ?? null })
                          }
                          options={conditions.map((condition) => ({
                            value: condition,
                            label: sentence(condition),
                          }))}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          {(['drinking', 'eating'] as const).map((field) => (
                            <label key={field} className="type-body-s flex flex-col gap-1">
                              {field === 'drinking' ? 'Drinking' : 'Eating'}
                              <Select
                                allowClear
                                placeholder="Not recorded"
                                value={
                                  observation[field] === null
                                    ? undefined
                                    : observation[field]
                                      ? 'YES'
                                      : 'NO'
                                }
                                onChange={(value?: 'YES' | 'NO') =>
                                  updateObservation(horse.id, {
                                    [field]: value === undefined ? null : value === 'YES',
                                  })
                                }
                                options={[
                                  { value: 'YES', label: 'Yes' },
                                  { value: 'NO', label: 'No' },
                                ]}
                              />
                            </label>
                          ))}
                        </div>
                        <Input
                          value={observation.note}
                          onChange={(event) =>
                            updateObservation(horse.id, { note: event.target.value })
                          }
                          maxLength={500}
                          placeholder="Condition note (optional)"
                        />
                        <Upload
                          accept="image/jpeg,image/png,image/heic,image/heif"
                          multiple
                          maxCount={8}
                          fileList={observation.photos}
                          beforeUpload={() => false}
                          onChange={({ fileList }) =>
                            updateObservation(horse.id, { photos: fileList })
                          }
                        >
                          <Button type="button" size="sm" leadingIcon="upload">
                            Attach photos
                          </Button>
                        </Upload>
                      </section>
                    );
                  })}
                </div>
              )}
              {/* One gold action on the cab (the condition log); the office view has none, it only records (DESIGN.md, Trip tab). */}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button
                  variant={audience === 'staff' ? 'secondary' : 'primary'}
                  disabled={
                    mutation.isPending ||
                    !selectedKind ||
                    (((selectedKind ?? kind) === TripRecordKindEnum.DEPARTED ||
                      (selectedKind ?? kind) === TripRecordKindEnum.FLIGHT_DEPARTED) &&
                      !trip.clearanceReady)
                  }
                  onClick={saveCheckpoint}
                >
                  {mutation.isPending ? 'Saving…' : 'Save checkpoint'}
                </Button>
                {audience === 'escort' && (
                  <Button
                    variant="primary"
                    disabled={
                      mutation.isPending ||
                      !trip.horses.some((horse) => conditionByHorse[horse.id]?.checked)
                    }
                    onClick={saveConditions}
                  >
                    Save checked horse conditions
                  </Button>
                )}
              </div>
            </Panel>
          )}
          {trip &&
            (audience === 'staff' ? (
              <CoordinatorTripBoard trip={trip} />
            ) : audience === 'customer' ? (
              <CustomerTrackingBoard trip={trip} />
            ) : (
              <TripDetails trip={trip} />
            ))}
        </>
      )}
    </div>
  );
}

export function CustomerTripPage() {
  return (
    <TripWorkspace
      audience="customer"
      title="Trip tracking"
      summary="Follow recorded checkpoints and horse condition updates for your club's trips."
    />
  );
}
export function StaffTripPage() {
  return (
    <TripWorkspace
      audience="staff"
      editable
      title="Trip progress"
      summary="Track journeys and record progress by confirmed route checkpoint."
    />
  );
}
export function EscortTripPage() {
  return <EscortCab />;
}
