import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfigProvider, Input, message, Select, Spin, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { fileApi } from '@/apis/file';
import PageHeader from '@/components/PageHeader';
import {
  Button,
  Callout,
  Checkbox,
  Chip,
  Icon,
  OptionCard,
  Panel,
  RouteStrip,
  StageMark,
  StatTile,
} from '@/components/ui';
import { useAuth, useMe } from '@/hooks/auth';
import { themeAntd } from '@/config/themeConfig';
import { apiErrorMessage } from '@/lib/utils';
import { useFileBlobUrl } from '@/hooks/file';
import { useTrip, useTripRecord, useTrips } from '@/hooks/trip';
import { HorseConditionEnum, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import type {
  HorseCondition,
  TripPhoto,
  TripRecordKind,
  TripStatus,
  TripSummary,
  TripView,
} from '@/interfaces';
import { useThemeStore } from '@/stores/themeStore';

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
const coordinatorKindsByStatus: Record<TripStatus, TripRecordKind[]> = {
  [TripStatusEnum.NOT_STARTED]: [
    TripRecordKindEnum.LOADED,
    TripRecordKindEnum.DEPARTED,
    TripRecordKindEnum.FLIGHT_DEPARTED,
    TripRecordKindEnum.NOTE,
  ],
  [TripStatusEnum.DEPARTED]: [
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
  [TripStatusEnum.HELD]: [
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.CLEARED_BORDER,
    TripRecordKindEnum.NOTE,
  ],
  [TripStatusEnum.ARRIVED]: [TripRecordKindEnum.DELIVERED, TripRecordKindEnum.NOTE],
  [TripStatusEnum.DELIVERED]: [TripRecordKindEnum.HANDED_OVER, TripRecordKindEnum.NOTE],
};
const conditions: HorseCondition[] = [
  HorseConditionEnum.STABLE,
  HorseConditionEnum.OFF_FEED,
  HorseConditionEnum.STRESSED,
  HorseConditionEnum.CLIMATE_CHANGE,
];
const timeOptions = { dateStyle: 'medium', timeStyle: 'short' } as const;
const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('en-GB', timeOptions) : 'Not recorded';
const formatClock = (value: string | null) =>
  value ? new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
const datetimeLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
const useNow = (intervalMs = 30_000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
};
const errorMessage = (error: unknown) =>
  apiErrorMessage(error, 'The trip update could not be saved.');
/** Status in words (DESIGN.md: a tone plus a word, never a raw enum). */
const sentence = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
const statusTone = (status: string) =>
  status === TripStatusEnum.DELIVERED ? 'ok' : status === TripStatusEnum.HELD ? 'bad' : 'info';
const kindTone = (kind: TripRecordKind) =>
  kind === TripRecordKindEnum.HELD
    ? 'bad'
    : kind === TripRecordKindEnum.CLEARED_BORDER || kind === TripRecordKindEnum.DELIVERED
      ? 'ok'
      : 'info';
const conditionTone = (condition: HorseCondition | null | undefined) =>
  condition === HorseConditionEnum.CONCERN
    ? 'bad'
    : condition === HorseConditionEnum.WATCH ||
        condition === HorseConditionEnum.OFF_FEED ||
        condition === HorseConditionEnum.STRESSED ||
        condition === HorseConditionEnum.CLIMATE_CHANGE
      ? 'warn'
      : condition === HorseConditionEnum.STABLE || condition === HorseConditionEnum.SOUND
        ? 'ok'
        : 'neutral';
const isStable = (condition: HorseCondition) =>
  condition === HorseConditionEnum.STABLE || condition === HorseConditionEnum.SOUND;
const stopKindLabel = (kind: string) =>
  kind === 'PICKUP'
    ? 'Pickup'
    : kind === 'BORDER'
      ? 'Border'
      : kind === 'WELFARE' || kind === 'QUARANTINE'
        ? 'Welfare stop'
        : kind === 'DELIVERY' || kind === 'AIRPORT_IN'
          ? 'Delivery'
          : kind.replaceAll('_', ' ').toLowerCase();
const lastRecord = (trip: TripView) =>
  [...trip.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
const lastCheckpointRecord = (trip: TripView) =>
  [...trip.records]
    .filter((record) => record.routeStopId !== null)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
const lastConditionRecord = (trip: TripView) =>
  [...trip.records]
    .filter(
      (record) => record.kind === TripRecordKindEnum.CONDITION_CHECK && record.conditions.length,
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
const minutesBetween = (planned: string | null, recorded: string | null) => {
  if (!planned || !recorded) return null;
  return Math.round((new Date(recorded).getTime() - new Date(planned).getTime()) / 60_000);
};
const durationLabel = (minutes: number) => {
  const abs = Math.abs(minutes);
  const value =
    abs >= 60 ? `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ''}` : `${abs} min`;
  return minutes === 0 ? 'On time' : `${minutes > 0 ? '+' : '−'}${value}`;
};
const elapsedLabel = (minutes: number) => {
  const abs = Math.max(0, minutes);
  return `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ''}`;
};

const escortEventsByStop: Record<string, TripRecordKind[]> = {
  PICKUP: [TripRecordKindEnum.LOADED, TripRecordKindEnum.DEPARTED, TripRecordKindEnum.NOTE],
  BORDER: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.CLEARED_BORDER,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.NOTE,
  ],
  WELFARE: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.NOTE,
  ],
  QUARANTINE: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.NOTE,
  ],
  AIRPORT_OUT: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.ACCEPTED_BY_AIRLINE,
    TripRecordKindEnum.FLIGHT_DEPARTED,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.NOTE,
  ],
  AIRPORT_IN: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.FLIGHT_LANDED,
    TripRecordKindEnum.RELEASED_BY_AIRLINE,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.NOTE,
  ],
  DELIVERY: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.DELIVERED,
    TripRecordKindEnum.NOTE,
  ],
};

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
                  Documents shown:{' '}
                  {record.documentsShown
                    .map(
                      (id) =>
                        trip.stops
                          .flatMap((stop) => stop.borderDocuments)
                          .find((document) => document.id === id)?.label,
                    )
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {record.conditions.map((condition) => (
                <div key={condition.horseId} className="mt-3 rounded-lg bg-raised p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="type-h4">{condition.horseName}</strong>
                    <Chip tone={conditionTone(condition.condition)}>
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

function currentStopForTrip(trip: TripView) {
  const records = [...trip.records].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const latest = records.at(-1);
  const held = [...records]
    .reverse()
    .find((record) => record.kind === TripRecordKindEnum.HELD && record.routeStopId);
  if (trip.tripStatus === TripStatusEnum.HELD && held) {
    return trip.stops.find((stop) => stop.id === held.routeStopId) ?? trip.stops[0];
  }
  if (trip.tripStatus === TripStatusEnum.ARRIVED || trip.tripStatus === TripStatusEnum.DELIVERED) {
    return [...trip.stops].reverse().find((stop) => stop.kind === 'DELIVERY') ?? trip.stops.at(-1);
  }
  if (
    latest?.routeStopId &&
    (latest.kind === TripRecordKindEnum.ARRIVED_AT_STOP ||
      latest.kind === TripRecordKindEnum.CONDITION_CHECK)
  ) {
    const stop = trip.stops.find((item) => item.id === latest.routeStopId);
    if (
      stop &&
      ['WELFARE', 'QUARANTINE', 'BORDER', 'AIRPORT_OUT', 'AIRPORT_IN'].includes(stop.kind)
    )
      return stop;
  }
  return trip.stops.find((stop) => !stop.latestOccurredAt) ?? trip.stops.at(-1);
}

function CabRoute({ trip, activeStopId }: { trip: TripView; activeStopId?: string }) {
  const stops = trip.stops.map((stop) => {
    const isHeld =
      stop.latestStatus === TripRecordKindEnum.HELD && trip.tripStatus === TripStatusEnum.HELD;
    const state =
      isHeld || stop.id === activeStopId ? 'current' : stop.latestOccurredAt ? 'done' : 'upcoming';
    const status = stop.latestStatus
      ? eventLabels[stop.latestStatus]
      : stop.plannedAt
        ? `Planned ${formatClock(stop.plannedAt)}`
        : 'Waiting for update';
    return { stop, isHeld, state, status };
  });
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card p-4 lg:p-5">
      {stops.length ? (
        <ol
          className="m-0 grid list-none gap-3 p-0"
          style={{
            gridTemplateColumns: `repeat(${stops.length}, minmax(188px, 1fr))`,
            minWidth: `${Math.max(800, stops.length * 200)}px`,
          }}
        >
          {stops.map(({ stop, isHeld, state, status }) => (
            <li
              key={stop.id}
              aria-current={state === 'current' ? 'step' : undefined}
              className={`flex min-h-36 flex-col gap-2 rounded-xl border p-4 ${isHeld ? 'border-bad-line bg-bad-soft' : state === 'current' ? 'border-info-line bg-info-soft' : state === 'done' ? 'border-ok-line bg-ok-soft/60' : 'border-line-strong bg-input'}`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${isHeld ? 'bg-bad' : state === 'done' ? 'bg-ok' : state === 'current' ? 'bg-info' : 'border-2 border-line-strong'}`}
                />
                <span className="type-label-m text-ink">{stop.name}</span>
              </span>
              <span className="type-body-s text-ink-2">{stopKindLabel(stop.kind)}</span>
              <span className="type-data-l mt-auto text-ink">
                {stop.latestOccurredAt
                  ? formatClock(stop.latestOccurredAt)
                  : formatClock(stop.plannedAt)}
              </span>
              <span
                className={`type-body-s ${isHeld ? 'text-bad' : state === 'current' ? 'text-info' : 'text-ink-3'}`}
              >
                {status}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="type-body-s m-0 text-ink-3">The confirmed route has no checkpoints yet.</p>
      )}
      <div
        className={`mt-4 flex items-center gap-2 border-t border-line pt-3 type-body-s ${trip.clearanceReady ? 'text-ok' : 'text-bad'}`}
      >
        <Icon name={trip.clearanceReady ? 'unlock' : 'lock'} size={16} />
        <span>
          Clearance {trip.clearanceReady ? 'clear' : 'locked'}
          {!trip.clearanceReady && ' · departure cannot be recorded until the dossier is cleared'}
        </span>
      </div>
    </div>
  );
}

function CabHeader({
  trip,
  trips,
  me,
  selectedCode,
  onTripChange,
  onLogout,
  saving,
  isOnline,
}: {
  trip?: TripView;
  trips: TripSummary[];
  me?: ReturnType<typeof useMe>['data'];
  selectedCode: string;
  onTripChange: (code: string) => void;
  onLogout: () => void;
  saving: boolean;
  isOnline: boolean;
}) {
  const now = useNow();
  const selected = trips.find((item) => item.jobCode === selectedCode);
  const initials = `${me?.firstName?.[0] ?? ''}${me?.lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line bg-card px-6 py-4 lg:px-8">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
        {trip ? (
          <>
            <span className="type-data text-ink-2">{trip.jobCode}</span>
            <span className="type-h4 text-ink">
              {trip.origin ?? 'Origin'} → {trip.destination ?? 'Destination'}
            </span>
            <StageMark stage="Trip" />
            <Chip tone={statusTone(trip.tripStatus)}>{sentence(trip.tripStatus)}</Chip>
          </>
        ) : (
          <span className="type-h4 text-ink">Escort cab</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`type-label-s ${saving ? 'text-warn' : isOnline ? 'text-ok' : 'text-bad'}`}
        >
          <Icon name={saving ? 'clock' : isOnline ? 'check' : 'lock'} size={16} />
          <span className="ml-1.5">
            {saving
              ? 'Sending update'
              : isOnline
                ? 'Online · updates synced'
                : 'Offline · updates cannot sync'}
          </span>
        </span>
        <span className="type-data-l text-ink">{formatClock(new Date(now).toISOString())}</span>
        {trips.length > 1 && (
          <Select
            aria-label="Select assigned trip"
            value={selectedCode}
            onChange={onTripChange}
            className="min-w-64"
            options={trips.map((item) => ({
              value: item.jobCode,
              label: `${item.jobCode} · ${item.origin ?? 'Origin'} → ${item.destination ?? 'Destination'}`,
            }))}
          />
        )}
        <div className="flex items-center gap-2 border-l border-line pl-3">
          <span className="grid size-9 place-items-center rounded-full bg-muted type-label-s text-ink-2">
            {initials || 'E'}
          </span>
          <span className="hidden min-w-24 sm:block">
            <span className="type-label-s block text-ink">
              {me ? `${me.firstName} ${me.lastName}` : 'Escort'}
            </span>
            <span className="type-caption text-ink-3">
              {me?.roles.includes('ESCORT') ? 'Escort' : 'Trip crew'}
            </span>
          </span>
          <Button size="sm" variant="ghost" onClick={onLogout}>
            Sign out
          </Button>
        </div>
      </div>
      {selected && trips.length === 1 && <span className="sr-only">{selected.jobCode}</span>}
    </header>
  );
}

function ConditionRows({
  trip,
  observations,
  onChange,
  onAllStable,
  arrival = false,
}: {
  trip: TripView;
  observations: Record<string, Observation>;
  onChange: (horseId: string, update: Partial<Observation>) => void;
  onAllStable: () => void;
  arrival?: boolean;
}) {
  return (
    <div>
      {!arrival && (
        <div className="flex flex-wrap items-center gap-3 px-6 py-4">
          <Button size="md" className="min-h-12" leadingIcon="check" onClick={onAllStable}>
            All stable · drinking · eating
          </Button>
          <span className="type-body-s text-ink-3">Then change only the horse that differs.</span>
        </div>
      )}
      <div className="divide-y divide-line border-t border-line">
        {trip.horses.map((horse) => {
          const observation = observations[horse.id] ?? emptyObservation();
          return (
            <section
              key={horse.id}
              className={`grid gap-4 px-6 py-5 xl:grid-cols-[minmax(200px,1fr)_auto] ${observation.condition && !isStable(observation.condition) ? 'bg-raised' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="type-h4 m-0 text-ink">{horse.name}</h3>
                  <p className="type-body-s m-0 mt-1 text-ink-3">
                    {horse.stall ?? 'Stall not assigned'}
                  </p>
                </div>
                {!arrival && (
                  <Checkbox
                    className="min-h-12 rounded-lg border border-line-strong px-4"
                    label="I checked this horse"
                    checked={observation.checked}
                    onChange={(event) => onChange(horse.id, { checked: event.target.checked })}
                  />
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label={`${horse.name} observed condition`}
                >
                  {conditions.map((condition) => {
                    const selected = observation.condition === condition;
                    const tone = conditionTone(condition);
                    const toneClass =
                      tone === 'bad'
                        ? 'border-bad-line bg-bad-soft text-bad'
                        : tone === 'warn'
                          ? 'border-warn-line bg-warn-soft text-warn'
                          : 'border-ok-line bg-ok-soft text-ok';
                    return (
                      <button
                        key={condition}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          onChange(horse.id, { checked: arrival || observation.checked, condition })
                        }
                        className={`focus-ring min-h-12 rounded-lg border px-4 type-label-m ${selected ? toneClass : 'border-line-strong bg-input text-ink-2'}`}
                      >
                        {selected && <Icon name="check" size={15} />} {sentence(condition)}
                      </button>
                    );
                  })}
                </div>
                {!arrival && (
                  <div className="grid grid-cols-2 gap-3">
                    {(['drinking', 'eating'] as const).map((field) => (
                      <label key={field} className="type-body-s flex flex-col gap-1.5 text-ink-2">
                        {field === 'drinking' ? 'Drinking' : 'Eating'}
                        <Select
                          size="large"
                          aria-label={`${horse.name} ${field}`}
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
                            onChange(horse.id, {
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
                )}
                <Input
                  size="large"
                  value={observation.note}
                  onChange={(event) => onChange(horse.id, { note: event.target.value })}
                  maxLength={500}
                  placeholder="Condition note (optional)"
                  aria-label={`${horse.name} condition note`}
                  className="md:col-span-2"
                />
                {!arrival && (
                  <Upload
                    accept="image/jpeg,image/png,image/heic,image/heif"
                    multiple
                    maxCount={8}
                    fileList={observation.photos}
                    beforeUpload={() => false}
                    onChange={({ fileList }) => onChange(horse.id, { photos: fileList })}
                  >
                    <Button size="sm" leadingIcon="upload">
                      Attach photos
                    </Button>
                  </Upload>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CoordinatorTripContent({ trip }: { trip: TripView }) {
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

function CustomerTripContent({ trip }: { trip: TripView }) {
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
  const now = useNow();
  const { logout } = useAuth();
  const meQuery = useMe();
  const [page, setPage] = useState(0);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
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
  const [documentsShown, setDocumentsShown] = useState<string[]>([]);
  const [occurredAt, setOccurredAt] = useState(datetimeLocal);
  const occurredAtEdited = useRef(false);
  const [text, setText] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [showConditionForm, setShowConditionForm] = useState(false);
  const [conditionByHorse, setConditionByHorse] = useState<Record<string, Observation>>({});
  const clientRefs = useRef<{ checkpoint: string | null; condition: string | null }>({
    checkpoint: null,
    condition: null,
  });
  const uploadedPhotos = useRef(new Map<string, string>());
  const seenCustomerRecords = useRef<{ code: string; ids: Set<string> } | null>(null);
  const mutation = useTripRecord(audience === 'staff' ? 'staff' : 'escort', selectedCode);
  const [messageApi, contextHolder] = message.useMessage();
  const setRecordTime = (value: string) => {
    occurredAtEdited.current = true;
    setOccurredAt(value);
  };
  const occurredAtForSave = () =>
    occurredAtEdited.current ? new Date(occurredAt).toISOString() : new Date().toISOString();
  const refreshRecordTime = () => {
    occurredAtEdited.current = false;
    setOccurredAt(datetimeLocal());
  };
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!occurredAtEdited.current) setOccurredAt(datetimeLocal());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);
  useEffect(() => {
    if (audience !== 'customer' || !trip) return;
    const ids = new Set(trip.records.map((record) => record.id));
    const previous = seenCustomerRecords.current;
    if (!previous || previous.code !== selectedCode) {
      seenCustomerRecords.current = { code: selectedCode, ids };
      return;
    }
    const unseen = trip.records
      .filter((record) => !previous.ids.has(record.id))
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    seenCustomerRecords.current = { code: selectedCode, ids };
    unseen.forEach((record) => {
      if (record.kind === TripRecordKindEnum.CLEARED_BORDER) {
        messageApi.success(
          `Customs cleared at ${record.checkpointName ?? 'the border'} · ${formatClock(record.occurredAt)}.`,
        );
      }
      const stop = trip.stops.find((item) => item.id === record.routeStopId);
      if (record.kind === TripRecordKindEnum.ARRIVED_AT_STOP && stop?.kind === 'DELIVERY') {
        messageApi.info(
          `Your horses arrived at the handover point, ${stop.name} · ${formatClock(record.occurredAt)}.`,
        );
      }
    });
  }, [audience, messageApi, selectedCode, trip]);
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
        routeStopId: audience === 'staff' ? (stopId ?? null) : (selectedStop?.id ?? null),
        kind,
        occurredAt: occurredAtForSave(),
        clientRef,
        text: text || undefined,
        documentsShown,
      });
      clientRefs.current.checkpoint = null;
      messageApi.success('Trip checkpoint saved.');
      setText('');
      setDocumentsShown([]);
      refreshRecordTime();
    } catch (error) {
      messageApi.error(errorMessage(error));
    }
  };

  const saveHandover = async () => {
    if (!trip) return;
    const name = receiverName.trim();
    if (!name) {
      messageApi.error('Enter the receiving person’s name before recording handover.');
      return;
    }
    const clientRef = clientRefs.current.checkpoint ?? crypto.randomUUID();
    clientRefs.current.checkpoint = clientRef;
    try {
      await mutation.mutateAsync({
        routeStopId: selectedStop?.id ?? null,
        kind: TripRecordKindEnum.HANDED_OVER,
        occurredAt: new Date().toISOString(),
        clientRef,
        text: `Received by ${name}.`,
      });
      clientRefs.current.checkpoint = null;
      messageApi.success('Handover recorded.');
      setReceiverName('');
      refreshRecordTime();
    } catch (error) {
      messageApi.error(errorMessage(error));
    }
  };

  const saveStopDeparture = async () => {
    if (!trip || !selectedStop) return;
    const clientRef = clientRefs.current.checkpoint ?? crypto.randomUUID();
    clientRefs.current.checkpoint = clientRef;
    try {
      await mutation.mutateAsync({
        routeStopId: selectedStop.id,
        kind: TripRecordKindEnum.LEFT_STOP,
        occurredAt: new Date().toISOString(),
        clientRef,
      });
      clientRefs.current.checkpoint = null;
      messageApi.success('Stop departure saved.');
      refreshRecordTime();
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
      messageApi.error('Select at least one horse you actually checked before saving.');
      return;
    }
    if (taskMode === 'delivery' && checked.length !== trip.horses.length) {
      messageApi.error('Check every horse on arrival before recording the delivery condition.');
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
        routeStopId: selectedStop?.id ?? null,
        kind: TripRecordKindEnum.CONDITION_CHECK,
        occurredAt: new Date().toISOString(),
        clientRef,
        text: text || undefined,
        conditions,
      });
      clientRefs.current.condition = null;
      uploadedPhotos.current.clear();
      setConditionByHorse({});
      setShowConditionForm(false);
      messageApi.success('Horse condition log saved.');
      setText('');
      refreshRecordTime();
    } catch (error) {
      messageApi.error(errorMessage(error));
    }
  };

  const applyAllStable = () => {
    if (!trip) return;
    setConditionByHorse(
      Object.fromEntries(
        trip.horses.map((horse) => [
          horse.id,
          {
            checked: true,
            condition: HorseConditionEnum.STABLE,
            drinking: true,
            eating: true,
            note: '',
            photos: [],
          },
        ]),
      ),
    );
  };

  const pageChange = (nextPage: number) => {
    setPage(nextPage);
    setCode('');
    setStopId(undefined);
  };
  useEffect(() => {
    setStopId(undefined);
    setReceiverName('');
    setShowConditionForm(false);
  }, [selectedCode]);
  const activeStop = trip ? currentStopForTrip(trip) : undefined;
  const selectedStop = trip
    ? (trip.stops.find((stop) => stop.id === stopId) ?? activeStop)
    : undefined;
  const isAtWelfareConditionStop =
    (selectedStop?.kind === 'WELFARE' || selectedStop?.kind === 'QUARANTINE') &&
    (selectedStop.latestStatus === TripRecordKindEnum.ARRIVED_AT_STOP ||
      selectedStop.latestStatus === TripRecordKindEnum.CONDITION_CHECK);
  const baseTaskMode = !trip
    ? 'checkpoint'
    : trip.tripStatus === TripStatusEnum.HELD
      ? 'held'
      : trip.tripStatus === TripStatusEnum.ARRIVED
        ? 'delivery'
        : trip.tripStatus === TripStatusEnum.DELIVERED
          ? trip.records.some((record) => record.kind === TripRecordKindEnum.HANDED_OVER)
            ? 'complete'
            : 'handover'
          : isAtWelfareConditionStop
            ? 'condition'
            : 'checkpoint';
  const taskMode =
    showConditionForm &&
    trip?.tripStatus !== TripStatusEnum.ARRIVED &&
    trip?.tripStatus !== TripStatusEnum.DELIVERED
      ? 'condition'
      : baseTaskMode;
  useEffect(() => {
    occurredAtEdited.current = false;
    setOccurredAt(datetimeLocal());
    setDocumentsShown([]);
  }, [audience, selectedCode, taskMode, selectedStop?.id]);
  const currentLog = trip ? lastRecord(trip) : undefined;
  const conditionLog = trip ? lastConditionRecord(trip) : undefined;
  const activeStopIndex =
    trip && activeStop ? trip.stops.findIndex((stop) => stop.id === activeStop.id) : -1;
  const nextStop = trip && activeStopIndex >= 0 ? trip.stops[activeStopIndex + 1] : undefined;
  const chosenHorseCount = trip
    ? trip.horses.filter(
        (horse) => conditionByHorse[horse.id]?.checked && conditionByHorse[horse.id]?.condition,
      ).length
    : 0;
  const allHorsesChecked = Boolean(trip?.horses.length) && chosenHorseCount === trip?.horses.length;

  useEffect(() => {
    if (!selectedStop) return;
    const defaultKind =
      selectedStop.kind === 'BORDER'
        ? TripRecordKindEnum.CLEARED_BORDER
        : selectedStop.kind === 'DELIVERY' && trip?.tripStatus === TripStatusEnum.ARRIVED
          ? TripRecordKindEnum.DELIVERED
          : selectedStop.kind === 'PICKUP'
            ? TripRecordKindEnum.DEPARTED
            : TripRecordKindEnum.ARRIVED_AT_STOP;
    setKind(defaultKind);
  }, [selectedStop?.id, trip?.tripStatus]);

  useEffect(() => {
    if (audience !== 'staff' || !trip) return;
    const allowed = coordinatorKindsByStatus[trip.tripStatus];
    const preferred = {
      [TripStatusEnum.NOT_STARTED]: trip.clearanceReady
        ? TripRecordKindEnum.DEPARTED
        : TripRecordKindEnum.LOADED,
      [TripStatusEnum.DEPARTED]: TripRecordKindEnum.ARRIVED_AT_STOP,
      [TripStatusEnum.HELD]: TripRecordKindEnum.LEFT_STOP,
      [TripStatusEnum.ARRIVED]: TripRecordKindEnum.DELIVERED,
      [TripStatusEnum.DELIVERED]: TripRecordKindEnum.HANDED_OVER,
    }[trip.tripStatus];
    if (!allowed.includes(kind)) setKind(preferred);
  }, [audience, trip?.tripStatus, trip?.clearanceReady, kind]);

  useEffect(() => {
    if (audience !== 'escort') return;
    const root = document.documentElement;
    root.dataset.theme = 'light';
    root.style.colorScheme = 'light';
    return () => {
      const mode = useThemeStore.getState().mode;
      root.dataset.theme = mode;
      root.style.colorScheme = mode;
    };
  }, [audience]);

  const tripPicker =
    summaries.length > 1 ? (
      <label className="type-body-s flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="sr-only">Select trip</span>
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
          className="min-w-72"
        />
      </label>
    ) : null;

  if (audience === 'escort') {
    const heldRecord = trip
      ? [...trip.records]
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
          .find((record) => record.kind === TripRecordKindEnum.HELD)
      : undefined;
    const loadedRecord = trip?.records.find(
      (record) =>
        record.kind === TripRecordKindEnum.LOADED || record.kind === TripRecordKindEnum.DEPARTED,
    );
    const trailerElapsedMinutes = loadedRecord
      ? Math.max(0, Math.floor((now - new Date(loadedRecord.occurredAt).getTime()) / 60_000))
      : null;
    const restDueAt = loadedRecord
      ? new Date(new Date(loadedRecord.occurredAt).getTime() + 6 * 60 * 60_000)
      : null;
    const hoursOnTrailer =
      trailerElapsedMinutes === null
        ? null
        : `${Math.floor(trailerElapsedMinutes / 60)} h${trailerElapsedMinutes % 60 ? ` ${trailerElapsedMinutes % 60} min` : ''}`;
    const eventOptions = (
      escortEventsByStop[selectedStop?.kind ?? ''] ?? [
        TripRecordKindEnum.ARRIVED_AT_STOP,
        TripRecordKindEnum.LEFT_STOP,
        TripRecordKindEnum.HELD,
        TripRecordKindEnum.NOTE,
      ]
    )
      .filter(
        (event) => trip !== undefined && coordinatorKindsByStatus[trip.tripStatus].includes(event),
      )
      .filter(
        (event) =>
          (event !== TripRecordKindEnum.DEPARTED && event !== TripRecordKindEnum.FLIGHT_DEPARTED) ||
          trip?.clearanceReady === true,
      );
    const departureLocked =
      (kind === TripRecordKindEnum.DEPARTED || kind === TripRecordKindEnum.FLIGHT_DEPARTED) &&
      !trip?.clearanceReady;
    const canDeliver = Boolean(
      conditionLog && conditionLog.routeStopId === selectedStop?.id && chosenHorseCount === 0,
    );

    return (
      <ConfigProvider theme={themeAntd.light}>
        <main className="min-h-screen bg-canvas text-ink">
          {contextHolder}
          <CabHeader
            trip={trip}
            trips={summaries}
            me={meQuery.data}
            selectedCode={selectedCode}
            onTripChange={(value) => {
              setCode(value);
              setStopId(undefined);
            }}
            onLogout={logout}
            saving={mutation.isPending}
            isOnline={isOnline}
          />
          <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-5 py-5 pb-32 lg:px-8 lg:py-6">
            {summariesQuery.isPending && (
              <div className="py-12 text-center">
                <Spin size="large" />
              </div>
            )}
            {summariesQuery.isError && (
              <Callout tone="bad" title="The assigned trips could not be loaded">
                {apiErrorMessage(summariesQuery.error, 'Refresh the page to try again.')}
              </Callout>
            )}
            {summariesQuery.data?.totalPages === 0 && (
              <Panel>
                <p className="type-body-s m-0 text-ink-2">
                  No assigned trips are available for this account yet.
                </p>
              </Panel>
            )}
            {trip && (
              <>
                {summariesQuery.data && summariesQuery.data.totalPages > 1 && (
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      disabled={summariesQuery.data.first}
                      onClick={() => pageChange(page - 1)}
                    >
                      Previous trips
                    </Button>
                    <span className="type-body-s text-ink-3">
                      Page {page + 1} of {summariesQuery.data.totalPages}
                    </span>
                    <Button
                      size="sm"
                      disabled={summariesQuery.data.last}
                      onClick={() => pageChange(page + 1)}
                    >
                      Next trips
                    </Button>
                  </div>
                )}
                <CabRoute
                  trip={trip}
                  activeStopId={taskMode === 'complete' ? undefined : activeStop?.id}
                />
                {detailQuery.isPending && (
                  <div className="py-6 text-center">
                    <Spin />
                  </div>
                )}
                {detailQuery.isError && (
                  <Callout tone="bad" title="This trip could not be loaded">
                    {apiErrorMessage(detailQuery.error, 'Refresh the page to try again.')}
                  </Callout>
                )}
                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
                  <Panel
                    title={
                      taskMode === 'condition'
                        ? 'Condition of each horse'
                        : taskMode === 'delivery'
                          ? 'Record arrival condition'
                          : taskMode === 'handover'
                            ? 'Hand over the horses'
                            : taskMode === 'complete'
                              ? 'Handover recorded'
                              : taskMode === 'held'
                                ? 'Trip held'
                                : 'Record this checkpoint'
                    }
                    extra={
                      selectedStop ? (
                        <Chip tone={trip.tripStatus === TripStatusEnum.HELD ? 'bad' : 'info'}>
                          {selectedStop.name}
                        </Chip>
                      ) : undefined
                    }
                    flush
                  >
                    {taskMode === 'checkpoint' && (
                      <>
                        {!trip.clearanceReady && (
                          <div className="px-6 pt-5">
                            <Callout tone="bad" title="Departure locked">
                              Departure can be recorded once the transport specialist clears the
                              dossier.
                            </Callout>
                          </div>
                        )}
                        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
                          <label className="type-body-s flex flex-col gap-2 text-ink-2">
                            Checkpoint
                            <Select
                              size="large"
                              value={selectedStop?.id}
                              onChange={(value) => setStopId(value)}
                              options={trip.stops.map((stop) => ({
                                value: stop.id,
                                label: `${stop.name} · ${stopKindLabel(stop.kind)}`,
                              }))}
                            />
                          </label>
                          {selectedStop?.kind === 'BORDER' ? (
                            <div className="flex flex-col gap-2 text-ink-2">
                              <span className="type-body-s">Outcome</span>
                              <div className="grid gap-3 sm:grid-cols-2">
                                {[
                                  {
                                    kind: TripRecordKindEnum.CLEARED_BORDER,
                                    description:
                                      'Record customs clearance and continue to the next checkpoint.',
                                    icon: 'check' as const,
                                  },
                                  {
                                    kind: TripRecordKindEnum.HELD,
                                    description:
                                      'Stop the trip here and record why the horses must wait.',
                                    icon: 'alert' as const,
                                  },
                                ]
                                  .filter((option) => eventOptions.includes(option.kind))
                                  .map((option) => (
                                    <OptionCard
                                      key={option.kind}
                                      selected={kind === option.kind}
                                      title={eventLabels[option.kind]}
                                      description={option.description}
                                      icon={option.icon}
                                      className="min-h-32"
                                      onChange={(selected) => selected && setKind(option.kind)}
                                    />
                                  ))}
                              </div>
                            </div>
                          ) : (
                            <label className="type-body-s flex flex-col gap-2 text-ink-2">
                              Checkpoint status
                              <Select
                                size="large"
                                value={kind}
                                onChange={setKind}
                                options={eventOptions.map((value) => ({
                                  value,
                                  label: eventLabels[value],
                                }))}
                              />
                            </label>
                          )}
                          {selectedStop?.kind === 'BORDER' &&
                            selectedStop.borderDocuments.length > 0 && (
                              <fieldset className="flex flex-col gap-3 border-0 p-0 md:col-span-2">
                                <legend className="type-body-s mb-2 text-ink-2">
                                  Documents shown at this border
                                </legend>
                                <div className="grid gap-2 md:grid-cols-2">
                                  {selectedStop.borderDocuments.map((document) => (
                                    <div
                                      key={document.id}
                                      className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-line bg-raised px-4 py-3"
                                    >
                                      <Checkbox
                                        checked={documentsShown.includes(document.id)}
                                      disabled={mutation.isPending}
                                        onChange={(event) =>
                                          setDocumentsShown((current) =>
                                            event.target.checked
                                              ? [...current, document.id]
                                              : current.filter((id) => id !== document.id),
                                          )
                                        }
                                        label={document.label}
                                      />
                                      <span className="type-label-s shrink-0 text-ink-3">
                                        {document.readyToShow
                                          ? 'Ready to show'
                                          : `${sentence(document.status)} · ${sentence(document.validity ?? 'unknown')}`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </fieldset>
                            )}
                          <label className="type-body-s flex flex-col gap-2 text-ink-2">
                            Recorded time
                            <input
                              type="datetime-local"
                              value={occurredAt}
                              onChange={(event) => setRecordTime(event.target.value)}
                              className="h-12 rounded-md border border-line-strong bg-input px-3 type-data text-ink"
                            />
                          </label>
                          <label className="type-body-s flex flex-col gap-2 text-ink-2">
                            Update note
                            <Input
                              size="large"
                              value={text}
                              onChange={(event) => setText(event.target.value)}
                              maxLength={500}
                              placeholder={
                                kind === TripRecordKindEnum.HELD
                                  ? 'Explain why the trip is held'
                                  : 'What happened at this checkpoint?'
                              }
                            />
                          </label>
                          {kind === TripRecordKindEnum.HELD && (
                            <div className="md:col-span-2">
                              <Callout tone="bad" title="This records a hold">
                                The update will appear in the journey log. Include the reason and
                                the exact place so operations can respond.
                              </Callout>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {(taskMode === 'condition' ||
                      taskMode === 'delivery' ||
                      taskMode === 'held') && (
                      <>
                        {taskMode === 'held' && (
                          <div className="space-y-4 px-6 pt-5">
                            <Callout
                              tone="bad"
                              title={`Held${selectedStop ? ` at ${selectedStop.name}` : ''}`}
                            >
                              {heldRecord?.text ??
                                'The trip is held. Keep the horses safe and wait for the coordinator’s decision before continuing.'}
                            </Callout>
                            {hoursOnTrailer !== null && (
                              <div
                                className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border px-5 py-4 ${restDueAt && now >= restDueAt.getTime() ? 'border-bad-line bg-bad-soft' : 'border-warn-line bg-warn-soft'}`}
                              >
                                <div>
                                  <span className="type-label-m block text-ink">
                                    On the trailer since{' '}
                                    {formatTime(loadedRecord?.occurredAt ?? null)}
                                  </span>
                                  <span className="type-body-s text-ink-2">
                                    Unload to rest by{' '}
                                    {formatClock(restDueAt?.toISOString() ?? null)} · at least every
                                    6 hours.
                                  </span>
                                </div>
                                <span
                                  className={`type-data-l ${restDueAt && now >= restDueAt.getTime() ? 'text-bad' : 'text-warn'}`}
                                >
                                  {hoursOnTrailer}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {taskMode === 'delivery' && (
                          <div className="px-6 pt-5">
                            <Callout tone="info" title="At the delivery checkpoint">
                              Check each horse on arrival, then record the delivery. The customer
                              will see the recorded condition and time.
                            </Callout>
                          </div>
                        )}
                        <ConditionRows
                          trip={trip}
                          observations={conditionByHorse}
                          onChange={
                            taskMode === 'delivery'
                              ? (horseId, update) =>
                                  updateObservation(horseId, {
                                    ...update,
                                    checked: true,
                                    drinking: null,
                                    eating: null,
                                  })
                              : updateObservation
                          }
                          onAllStable={applyAllStable}
                          arrival={taskMode === 'delivery'}
                        />
                        {conditionLog && (
                          <div className="mx-6 mb-5 rounded-lg bg-sunken px-4 py-3">
                            <span className="type-label-s text-ink">
                              Previous check · {formatTime(conditionLog.occurredAt)}
                            </span>
                            <p className="type-body-s m-0 mt-1 text-ink-2">
                              {conditionLog.conditions
                                .map((item) => `${item.horseName}: ${sentence(item.condition)}`)
                                .join(' · ')}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    {taskMode === 'handover' && (
                      <div className="space-y-5 px-6 py-6">
                        <Callout tone="ok" title="Delivery recorded">
                          Record who received the horses. This is added to the append-only journey
                          log.
                        </Callout>
                        <label className="type-body-s flex max-w-xl flex-col gap-2 text-ink-2">
                          Received by
                          <Input
                            size="large"
                            value={receiverName}
                            onChange={(event) => setReceiverName(event.target.value)}
                            maxLength={120}
                            placeholder="Name of the receiving person"
                          />
                        </label>
                        <div className="max-w-2xl rounded-lg border border-line-strong bg-input px-5 py-4">
                          <span className="type-body-s text-ink-3">
                            Receiving signature preview
                          </span>
                          <div className="flex h-20 items-end border-b border-line-strong pb-2">
                            <span className="font-display text-3xl italic text-ink">
                              {receiverName.trim() || 'Receiving person'}
                            </span>
                          </div>
                          <span className="type-caption mt-2 block text-ink-3">
                            Recorded with the recipient’s name on this tablet
                          </span>
                        </div>
                        {trip.horses.map((horse) => (
                          <div
                            key={horse.id}
                            className="flex items-center justify-between border-t border-line py-3"
                          >
                            <span className="type-label-m text-ink">{horse.name}</span>
                            <span className="type-body-s text-ink-3">
                              {horse.stall ?? 'Stall not assigned'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {taskMode === 'complete' && (
                      <div className="px-6 py-6">
                        <Callout tone="ok" title="Handover recorded">
                          The receiving person and handover time are saved in the trip journey log.
                        </Callout>
                        <div className="mt-5">
                          <TripRecords trip={trip} />
                        </div>
                      </div>
                    )}
                  </Panel>

                  <aside className="flex flex-col gap-5">
                    <Panel title={taskMode === 'held' ? 'What happens next' : 'Next checkpoint'}>
                      {taskMode === 'held' ? (
                        <p className="type-body-s m-0 text-ink-2">
                          Wait for the coordinator’s decision. You can still record water and
                          welfare checks; do not move the load until the hold is released.
                        </p>
                      ) : (
                        <>
                          <h3 className="type-h3 m-0 text-ink">
                            {nextStop?.name ??
                              selectedStop?.name ??
                              trip.destination ??
                              'Route complete'}
                          </h3>
                          <p className="type-body-s mb-0 mt-2 text-ink-2">
                            {nextStop?.details ??
                              selectedStop?.details ??
                              'Follow the confirmed route and record each checkpoint.'}
                          </p>
                          <p className="type-data mt-4 text-info">
                            {nextStop?.plannedAt
                              ? `Planned ${formatTime(nextStop.plannedAt)}`
                              : 'No estimate between recorded checkpoints'}
                          </p>
                        </>
                      )}
                    </Panel>
                    <Panel title="On board">
                      <div className="divide-y divide-line">
                        {trip.horses.map((horse) => (
                          <div
                            key={horse.id}
                            className="flex items-center justify-between gap-3 py-3"
                          >
                            <div>
                              <strong className="type-label-m block text-ink">{horse.name}</strong>
                              <span className="type-body-s text-ink-3">
                                {horse.stall ?? 'Stall not assigned'}
                              </span>
                            </div>
                            <span className="type-caption text-ink-3">
                              {conditionLog?.conditions.find((item) => item.horseId === horse.id)
                                ? sentence(
                                    conditionLog.conditions.find(
                                      (item) => item.horseId === horse.id,
                                    )!.condition,
                                  )
                                : 'No check yet'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 border-t border-line pt-3">
                        <span className="type-body-s text-ink-3">Vehicle</span>
                        <span className="type-data ml-3 text-ink">
                          {trip.vehicleCode ?? 'Not assigned'}
                        </span>
                      </div>
                    </Panel>
                    {currentLog && (
                      <Panel title="Previous trip update">
                        <p className="type-body-s m-0 text-ink-2">
                          {currentLog.text ?? eventLabels[currentLog.kind]}
                        </p>
                        <span className="type-caption mt-3 block text-ink-3">
                          {currentLog.recordedBy ?? 'Escort'} · {formatTime(currentLog.occurredAt)}
                        </span>
                      </Panel>
                    )}
                    <Panel title="What the customer sees">
                      <p className="type-body-s m-0 text-ink-2">
                        {currentLog?.checkpointName
                          ? `The last confirmed update at ${currentLog.checkpointName}, recorded ${formatTime(currentLog.occurredAt)}.`
                          : 'The customer sees no position until a checkpoint is recorded.'}
                      </p>
                      <p className="type-body-s mb-0 mt-2 text-ink-3">
                        Positions come from recorded checkpoints, never an estimate.
                      </p>
                    </Panel>
                  </aside>
                </div>
              </>
            )}
          </div>
          {trip && (
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line-strong bg-card/95 px-5 py-4 backdrop-blur lg:px-8">
              <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="type-label-m m-0 text-ink">
                    {taskMode === 'held'
                      ? 'Waiting for the coordinator’s decision'
                      : taskMode === 'condition'
                        ? `${chosenHorseCount} of ${trip.horses.length} horses checked`
                        : taskMode === 'delivery'
                          ? canDeliver
                            ? 'Arrival condition saved'
                            : `${chosenHorseCount} of ${trip.horses.length} arrival checks complete`
                          : taskMode === 'handover'
                            ? receiverName.trim()
                              ? `Ready to record handover to ${receiverName.trim()}`
                              : 'Add the receiving person to complete handover'
                            : taskMode === 'complete'
                              ? 'Handover saved'
                              : `${selectedStop?.name ?? 'Checkpoint'} · ${eventLabels[kind]}`}
                  </p>
                  <p className="type-body-s m-0 mt-1 text-ink-3">
                    Saved to the trip journey log for the coordinator and customer.
                  </p>
                </div>
                {taskMode === 'held' ? (
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={mutation.isPending || chosenHorseCount === 0}
                    onClick={saveConditions}
                  >
                    {mutation.isPending ? 'Saving…' : 'Save welfare check'}
                  </Button>
                ) : taskMode === 'condition' ? (
                  <div className="flex flex-wrap gap-3">
                    {showConditionForm && (
                      <Button
                        variant="secondary"
                        size="md"
                        disabled={mutation.isPending}
                        onClick={() => setShowConditionForm(false)}
                      >
                        Back to checkpoint
                      </Button>
                    )}
                    {conditionLog?.routeStopId === selectedStop?.id && (
                      <Button
                        variant="secondary"
                        size="md"
                        disabled={mutation.isPending || chosenHorseCount > 0}
                        onClick={saveStopDeparture}
                      >
                        Record leaving stop
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="md"
                      className="!h-16"
                      disabled={mutation.isPending || chosenHorseCount === 0}
                      onClick={saveConditions}
                    >
                      {mutation.isPending ? 'Saving…' : 'Save condition log'}
                    </Button>
                  </div>
                ) : taskMode === 'delivery' && !canDeliver ? (
                  <Button
                    variant="primary"
                    size="md"
                    className="!h-16"
                    disabled={mutation.isPending || !allHorsesChecked}
                    onClick={saveConditions}
                  >
                    {mutation.isPending ? 'Saving…' : 'Save arrival condition'}
                  </Button>
                ) : taskMode === 'handover' ? (
                  <Button
                    variant="primary"
                    size="md"
                    className="!h-16"
                    disabled={mutation.isPending || !receiverName.trim()}
                    onClick={saveHandover}
                  >
                    {mutation.isPending ? 'Saving…' : 'Record handover'}
                  </Button>
                ) : taskMode === 'complete' ? (
                  <Chip tone="ok">Complete</Chip>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {trip.tripStatus !== TripStatusEnum.DELIVERED && (
                      <Button
                        variant="secondary"
                        size="md"
                        disabled={mutation.isPending}
                        onClick={() => setShowConditionForm(true)}
                      >
                        Log horse condition
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="md"
                      className="!h-16"
                      disabled={mutation.isPending || departureLocked || !selectedStop}
                      onClick={saveCheckpoint}
                    >
                      {mutation.isPending
                        ? 'Saving…'
                        : taskMode === 'delivery'
                          ? 'Record delivery'
                          : `Record: ${eventLabels[kind]}`}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </ConfigProvider>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {contextHolder}
      <PageHeader
        title={title}
        summary={summary}
        right={
          audience === 'staff' ? (
            <Button variant="secondary" onClick={() => setShowUpdateForm((shown) => !shown)}>
              {showUpdateForm ? 'Close update form' : 'Record progress'}
            </Button>
          ) : undefined
        }
      />
      {tripPicker}
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
      {summariesQuery.data?.totalPages === 0 && (
        <Panel>
          <p className="type-body-s m-0 text-ink-2">No trips are available for this account yet.</p>
        </Panel>
      )}
      {summariesQuery.data && summariesQuery.data.totalPages > 1 && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            disabled={summariesQuery.data.first}
            onClick={() => pageChange(page - 1)}
          >
            Previous trips
          </Button>
          <span className="type-body-s text-ink-3">
            Page {page + 1} of {summariesQuery.data.totalPages}
          </span>
          <Button
            size="sm"
            disabled={summariesQuery.data.last}
            onClick={() => pageChange(page + 1)}
          >
            Next trips
          </Button>
        </div>
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
      {trip && audience === 'staff' && (
        <>
          {editable && showUpdateForm && (
            <Panel
              title="Update progress by checkpoint"
              extra={
                <span className="type-caption text-ink-3">
                  Recorded updates are visible to the customer
                </span>
              }
            >
              {!trip.clearanceReady && (
                <Callout className="mb-4" tone="bad" title="Departure locked">
                  Departure can be recorded once the transport specialist clears the dossier.
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
                  Progress status
                  <Select
                    value={kind}
                    onChange={setKind}
                    options={(coordinatorKindsByStatus[trip.tripStatus] ?? []).map((value) => ({
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
                    onChange={(event) => setRecordTime(event.target.value)}
                    className="h-10 rounded-md border border-line-strong bg-input px-2"
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
              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  disabled={
                    mutation.isPending ||
                    ((kind === TripRecordKindEnum.DEPARTED ||
                      kind === TripRecordKindEnum.FLIGHT_DEPARTED) &&
                      !trip.clearanceReady)
                  }
                  onClick={saveCheckpoint}
                >
                  {mutation.isPending ? 'Saving…' : 'Record progress update'}
                </Button>
              </div>
            </Panel>
          )}
          <CoordinatorTripContent trip={trip} />
        </>
      )}
      {trip && audience === 'customer' && <CustomerTripContent trip={trip} />}
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
  return (
    <TripWorkspace
      audience="escort"
      editable
      title="Cab trip log"
      summary="Record assigned trip checkpoints and each horse's observed condition."
    />
  );
}
