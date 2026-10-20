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
import { useTrip, useTripRecord, useTrips } from '@/hooks/trip';
import { HorseConditionEnum, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import type {
  HorseCondition,
  TripRecordKind,
  TripStatus,
  TripSummary,
  TripView,
} from '@/interfaces';
import { useThemeStore } from '@/stores/themeStore';
import { TripRecords } from './TripRecords';
import { EscortCab } from './EscortCab';
import {
  CabHeader,
  CabRoute,
  ConditionRows,
  currentStopForTrip,
  emptyObservation,
} from './TripCabParts';
import type { Observation } from './TripCabParts';
import { CoordinatorTripContent } from './CoordinatorTripContent';
import { CustomerTripContent } from './CustomerTripContent';
import {
  coordinatorKindsByStatus,
  conditions,
  datetimeLocal,
  elapsedLabel,
  errorMessage,
  eventLabels,
  escortEventsByStop,
  formatClock,
  formatTime,
  lastConditionRecord,
  lastRecord,
  sentence,
  stopKindLabel,
  useNow,
} from './trip-utils';
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
    return (
      <EscortCab
        now={now}
        trip={trip}
        summaries={summaries}
        meQuery={meQuery}
        selectedCode={selectedCode}
        setCode={setCode}
        setStopId={setStopId}
        logout={logout}
        mutation={mutation}
        isOnline={isOnline}
        summariesQuery={summariesQuery}
        detailQuery={detailQuery}
        page={page}
        pageChange={pageChange}
        tripPicker={tripPicker}
        activeStop={activeStop}
        selectedStop={selectedStop}
        nextStop={nextStop}
        taskMode={taskMode}
        kind={kind}
        setKind={setKind}
        occurredAt={occurredAt}
        setRecordTime={setRecordTime}
        text={text}
        setText={setText}
        documentsShown={documentsShown}
        setDocumentsShown={setDocumentsShown}
        receiverName={receiverName}
        setReceiverName={setReceiverName}
        showConditionForm={showConditionForm}
        setShowConditionForm={setShowConditionForm}
        conditionByHorse={conditionByHorse}
        updateObservation={updateObservation}
        applyAllStable={applyAllStable}
        conditionLog={conditionLog}
        chosenHorseCount={chosenHorseCount}
        allHorsesChecked={allHorsesChecked}
        saveCheckpoint={saveCheckpoint}
        saveConditions={saveConditions}
        saveHandover={saveHandover}
        saveStopDeparture={saveStopDeparture}
        contextHolder={contextHolder}
      />
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
