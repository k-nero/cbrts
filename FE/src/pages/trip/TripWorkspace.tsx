import { useRef, useState } from 'react';
import type { UploadFile } from 'antd';
import { Input, message, Select, Spin, Upload } from 'antd';

import { TripDetails } from './TripDetails';
import { eventLabels, formatTime, sentence } from './tripFormat';

import { fileApi } from '@/apis/file';
import PageHeader from '@/components/PageHeader';
import { Button, Callout, Checkbox, Chip, Panel } from '@/components/ui';
import { useAuth } from '@/hooks/auth';
import { apiErrorMessage } from '@/lib/utils';
import { useTrip, useTripRecord, useTrips } from '@/hooks/trip';
import type { HorseCondition, TripRecordKind, TripSummary } from '@/interfaces';
import { HorseConditionEnum, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';

const eventKinds = Object.values(TripRecordKindEnum);

const checkpointKinds = eventKinds.filter((kind) => kind !== TripRecordKindEnum.CONDITION_CHECK);

const conditions = Object.values(HorseConditionEnum);

const datetimeLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const errorMessage = (error: unknown) =>
  apiErrorMessage(error, 'The trip update could not be saved.');

const statusTone = (status: string) =>
  status === TripStatusEnum.DELIVERED ? 'ok' : status === TripStatusEnum.HELD ? 'warn' : 'info';

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

export function TripWorkspace({
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
  const [occurredAt, setOccurredAt] = useState(datetimeLocal);
  const [text, setText] = useState('');
  const [receiverName, setReceiverName] = useState('');
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
        receiverName:
          kind === TripRecordKindEnum.HANDED_OVER ? receiverName.trim() || undefined : undefined,
      });
      clientRefs.current.checkpoint = null;
      messageApi.success('Trip checkpoint saved.');
      setText('');
      setReceiverName('');
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
                {kind === TripRecordKindEnum.HANDED_OVER && (
                  <label className="type-body-s flex flex-col gap-2">
                    Received by
                    <Input
                      value={receiverName}
                      onChange={(event) => setReceiverName(event.target.value)}
                      maxLength={120}
                      placeholder="Name of the receiving person"
                    />
                  </label>
                )}
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
                      !trip.clearanceReady) ||
                    (kind === TripRecordKindEnum.HANDED_OVER && !receiverName.trim())
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
