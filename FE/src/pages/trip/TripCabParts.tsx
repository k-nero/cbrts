import { useEffect, useState } from 'react';
import type { UploadFile } from 'antd';
import { Input, Select, Upload } from 'antd';
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
} from '@/components/ui';
import { useAuth, useMe } from '@/hooks/auth';
import type { HorseCondition, TripRecordKind, TripSummary, TripView } from '@/interfaces';
import { HorseConditionEnum, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import {
  conditionTone,
  conditions,
  coordinatorKindsByStatus,
  eventLabels,
  formatClock,
  isStable,
  sentence,
  statusTone,
  stopKindLabel,
  useNow,
} from './trip-utils';

export type Observation = {
  checked: boolean;
  condition: HorseCondition | null;
  drinking: boolean | null;
  eating: boolean | null;
  note: string;
  photos: UploadFile[];
};
export const emptyObservation = (): Observation => ({
  checked: false,
  condition: null,
  drinking: null,
  eating: null,
  note: '',
  photos: [],
});

export function currentStopForTrip(trip: TripView) {
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

export function CabRoute({ trip, activeStopId }: { trip: TripView; activeStopId?: string }) {
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

export function CabHeader({
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

export function ConditionRows({
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
