import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { UploadFile } from 'antd';
import { Col, Flex, Input, Row, message, Select, Spin, Upload } from 'antd';

import { HandoverAnswer } from './HandoverAnswer';
import { HandoverPanel } from './HandoverPanel';
import { HandoverRecord } from './HandoverRecord';
import { ReportEmergency } from './ReportEmergency';
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

// The handover has its own panel (US-F6-01), with each horse's condition and the receiver's confirmation.
const checkpointKinds = eventKinds.filter(
  (kind) => kind !== TripRecordKindEnum.CONDITION_CHECK && kind !== TripRecordKindEnum.HANDED_OVER,
);

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
  // A notification opens tracking on its job (/tracking?job=CBRT-…); a trip lists under any of its jobs.
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('job') ?? '');
  const selectedCode =
    summaries.find((item) => item.jobCode === code || item.jobCodes.includes(code))?.jobCode ??
    summaries[0]?.jobCode ??
    '';
  // One part of a job an incident split across trips (US-F5-06); the cab always shows the part its crew rides.
  const [partId, setPartId] = useState<string>();
  const shownPart = audience === 'escort' ? undefined : partId;
  const detailQuery = useTrip(audience, selectedCode, shownPart);
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
  const mutation = useTripRecord(
    audience === 'staff' ? 'staff' : 'escort',
    selectedCode,
    audience === 'staff' ? shownPart : undefined,
  );
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
    <Flex vertical gap={24}>
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
          <Flex wrap align="center" justify="space-between" gap={12}>
            <Select
              aria-label="Select trip"
              value={selectedCode}
              onChange={(value) => {
                setCode(value);
                setPartId(undefined);
                setStopId(undefined);
              }}
              options={summaries.map((item) => ({
                value: item.jobCode,
                // The escort's row is a trip: its TRP code and every job on the trailer.
                label: `${item.tripCode ? `${item.tripCode} · ${item.jobCodes.join(', ')}` : item.jobCode} · ${item.origin ?? 'Origin'} → ${item.destination ?? 'Destination'}`,
              }))}
              className="min-w-72 flex-1"
            />
            {summariesQuery.data && summariesQuery.data.totalPages > 1 && (
              <Flex align="center" gap={8}>
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
              </Flex>
            )}
          </Flex>
          {selectedSummary && (
            <Panel
              title={
                selectedSummary.tripCode
                  ? `${selectedSummary.tripCode} · ${selectedSummary.jobCodes.join(', ')}`
                  : trip?.tripCode
                    ? `${selectedSummary.jobCode} · ${trip.tripCode}`
                    : selectedSummary.jobCode
              }
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
          {audience === 'escort' && trip && <ReportEmergency trip={trip} />}
          {editable &&
            audience !== 'customer' &&
            trip &&
            trip.tripStatus === TripStatusEnum.DELIVERED &&
            !trip.handover?.handedOverAt && (
              <HandoverPanel
                trip={trip}
                audience={audience}
                code={selectedCode}
                tripId={audience === 'staff' ? shownPart : undefined}
              />
            )}
          {audience === 'customer' && trip && <HandoverAnswer trip={trip} />}
          {trip && <HandoverRecord trip={trip} />}
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
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Flex component="label" vertical gap={8} className="type-body-s">
                    Checkpoint
                    <Select
                      value={stopId}
                      onChange={setStopId}
                      allowClear
                      placeholder="Trip-wide update"
                      options={trip.stops.map((stop) => ({
                        value: stop.id,
                        label: stop.jobCode ? `${stop.name} · ${stop.jobCode}` : stop.name,
                      }))}
                    />
                  </Flex>
                </Col>
                <Col xs={24} md={12}>
                  <Flex component="label" vertical gap={8} className="type-body-s">
                    Checkpoint status
                    <Select
                      value={kind}
                      onChange={setKind}
                      options={checkpointKinds.map((value) => ({
                        value,
                        label: eventLabels[value],
                      }))}
                    />
                  </Flex>
                </Col>
                <Col xs={24} md={12}>
                  <Flex component="label" vertical gap={8} className="type-body-s">
                    Recorded time
                    <input
                      type="datetime-local"
                      value={occurredAt}
                      onChange={(event) => setOccurredAt(event.target.value)}
                      className="h-8 rounded-md border border-line-strong bg-input px-2"
                    />
                  </Flex>
                </Col>
                <Col xs={24} md={12}>
                  <Flex component="label" vertical gap={8} className="type-body-s">
                    Update note
                    <Input
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      maxLength={500}
                      placeholder="What happened at this checkpoint?"
                    />
                  </Flex>
                </Col>
              </Row>
              {audience === 'escort' && (
                <div className="mt-5 divide-y divide-line">
                  {trip.horses.map((horse) => {
                    const observation = conditionByHorse[horse.id] ?? emptyObservation();
                    return (
                      <section key={horse.id} className="py-4">
                        <Row gutter={[12, 12]}>
                          <Col xs={24} md={12}>
                            <div>
                              <strong className="type-h4">{horse.name}</strong>
                              <p className="type-body-s m-0 text-ink-3">
                                {horse.stall ?? 'Stall not assigned'}
                              </p>
                            </div>
                          </Col>
                          <Col xs={24} md={12}>
                            <Checkbox
                              label="I checked this horse"
                              checked={observation.checked}
                              onChange={(event) =>
                                updateObservation(horse.id, { checked: event.target.checked })
                              }
                            />
                          </Col>
                          <Col xs={24} md={12}>
                            <Select
                              aria-label={`${horse.name} condition`}
                              className="w-full"
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
                          </Col>
                          <Col xs={24} md={12}>
                            <Row gutter={[12, 12]}>
                              {(['drinking', 'eating'] as const).map((field) => (
                                <Col key={field} span={12}>
                                  <Flex component="label" vertical gap={4} className="type-body-s">
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
                                  </Flex>
                                </Col>
                              ))}
                            </Row>
                          </Col>
                          <Col xs={24} md={12}>
                            <Input
                              value={observation.note}
                              onChange={(event) =>
                                updateObservation(horse.id, { note: event.target.value })
                              }
                              maxLength={500}
                              placeholder="Condition note (optional)"
                            />
                          </Col>
                          <Col xs={24} md={12}>
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
                          </Col>
                        </Row>
                      </section>
                    );
                  })}
                </div>
              )}
              {/* One gold action on the cab (the condition log); the office view has none, it only records (DESIGN.md, Trip tab). */}
              <div className="mt-4">
                <Flex wrap justify="end" gap={8}>
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
                </Flex>
              </div>
            </Panel>
          )}
          {trip && (
            <TripDetails
              trip={trip}
              audience={audience}
              onShowPart={(id) => {
                setPartId(id);
                setStopId(undefined);
              }}
            />
          )}
        </>
      )}
    </Flex>
  );
}
