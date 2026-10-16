import { useMemo, useRef, useState } from 'react';
import { Input, Select, Spin, Upload, message } from 'antd';
import type { UploadFile } from 'antd';
import { fileApi } from '@/apis/file';
import PageHeader from '@/components/PageHeader';
import { Button, Callout, Checkbox, Chip, Panel, TimelineStop } from '@/components/ui';
import { apiErrorMessage } from '@/lib/utils';
import { useFileBlobUrl } from '@/hooks/file';
import { useTrip, useTripRecord, useTrips } from '@/hooks/trip';
import { HorseConditionEnum, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import type {
  HorseCondition,
  TripPhoto,
  TripRecordKind,
  TripSummary,
  TripView,
} from '@/interfaces';

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
const conditions = Object.values(HorseConditionEnum);
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
              {record.conditions.map((condition) => (
                <div key={condition.horseId} className="mt-3 rounded-lg bg-raised p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="type-h4">{condition.horseName}</strong>
                    <Chip
                      tone={
                        condition.condition === HorseConditionEnum.CONCERN
                          ? 'bad'
                          : condition.condition === HorseConditionEnum.WATCH
                            ? 'warn'
                            : 'ok'
                      }
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
        kind,
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
        occurredAt: new Date(occurredAt).toISOString(),
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
  const selectedSummary: TripSummary | undefined = summaries.find(
    (item) => item.jobCode === selectedCode,
  );

  return (
    <div className="flex flex-col gap-6">
      {contextHolder}
      <PageHeader title={title} summary={summary} />
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
                    value={kind}
                    onChange={setKind}
                    options={checkpointKinds.map((value) => ({ value, label: eventLabels[value] }))}
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
                  disabled={
                    mutation.isPending ||
                    ((kind === TripRecordKindEnum.DEPARTED ||
                      kind === TripRecordKindEnum.FLIGHT_DEPARTED) &&
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
          {trip && <TripDetails trip={trip} />}
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
  return (
    <TripWorkspace
      audience="escort"
      editable
      title="Cab trip log"
      summary="Record assigned trip checkpoints and each horse's observed condition."
    />
  );
}
