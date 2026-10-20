import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Select, Spin, Upload, message } from 'antd';
import type { UploadFile } from 'antd';
import { jwtDecode } from 'jwt-decode';
import { fileApi } from '@/apis/file';
import { tripApi } from '@/apis/trip';
import { useAuth } from '@/hooks/auth';
import { useTrip, useTripRecord, useTrips } from '@/hooks/trip';
import { HorseConditionEnum, TripConditionOptions, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import type { HorseCondition, TripRecordInput, TripRecordKind, TripStop } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { selectAccessToken, useAuthStore } from '@/stores/authStore';
import { Button, Callout, Chip, Panel } from '@/components/ui';

const labelByKind: Record<TripRecordKind, string> = {
  LOADED: 'Loaded',
  DEPARTED: 'Departed',
  ARRIVED_AT_STOP: 'Arrived at checkpoint',
  CLEARED_BORDER: 'Customs cleared',
  HELD: 'Held',
  LEFT_STOP: 'Left checkpoint',
  CONDITION_CHECK: 'Condition check',
  ACCEPTED_BY_AIRLINE: 'Accepted by airline',
  FLIGHT_DEPARTED: 'Flight departed',
  FLIGHT_LANDED: 'Flight landed',
  RELEASED_BY_AIRLINE: 'Released by airline',
  DELIVERED: 'Delivered',
  HANDED_OVER: 'Handed over',
  NOTE: 'Trip note',
};

const allowedByStatus: Record<string, TripRecordKind[]> = {
  NOT_STARTED: ['LOADED', 'DEPARTED', 'FLIGHT_DEPARTED', 'NOTE'],
  DEPARTED: [
    'ARRIVED_AT_STOP',
    'CLEARED_BORDER',
    'HELD',
    'LEFT_STOP',
    'ACCEPTED_BY_AIRLINE',
    'FLIGHT_DEPARTED',
    'FLIGHT_LANDED',
    'RELEASED_BY_AIRLINE',
    'NOTE',
  ],
  HELD: ['LEFT_STOP', 'CLEARED_BORDER', 'NOTE'],
  ARRIVED: ['DELIVERED', 'NOTE'],
  DELIVERED: ['HANDED_OVER', 'NOTE'],
};

const allowedByStop: Record<string, TripRecordKind[]> = {
  BORDER: ['ARRIVED_AT_STOP', 'CLEARED_BORDER', 'HELD', 'LEFT_STOP', 'NOTE'],
  WELFARE: ['ARRIVED_AT_STOP', 'HELD', 'LEFT_STOP', 'NOTE'],
  QUARANTINE: ['ARRIVED_AT_STOP', 'HELD', 'LEFT_STOP', 'NOTE'],
  DELIVERY: ['ARRIVED_AT_STOP', 'DELIVERED', 'NOTE'],
  AIRPORT_OUT: ['ACCEPTED_BY_AIRLINE', 'FLIGHT_DEPARTED', 'NOTE'],
  AIRPORT_IN: ['FLIGHT_LANDED', 'RELEASED_BY_AIRLINE', 'NOTE'],
};

type HorseDraft = {
  checked: boolean;
  condition: HorseCondition | null;
  drinking: boolean | null;
  eating: boolean | null;
  note: string;
  photos: UploadFile[];
};

const initialDraft = (): HorseDraft => ({
  checked: false,
  condition: null,
  drinking: null,
  eating: null,
  note: '',
  photos: [],
});

const fmtTime = (value?: string | null) =>
  value ? new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

const timeNow = () => new Date().toISOString();

const localStamp = (value: Date) =>
  value.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

type PendingCabRecord = { jobCode: string; input: TripRecordInput };

function readPending(key: string): PendingCabRecord[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? (value as PendingCabRecord[]) : [];
  } catch {
    return [];
  }
}

const stopTone = (stop: TripStop, current: boolean): 'bad' | 'info' | 'ok' | 'neutral' =>
  stop.latestStatus === TripRecordKindEnum.HELD
    ? 'bad'
    : current
      ? 'info'
      : stop.latestStatus
        ? 'ok'
        : 'neutral';

function eventKindsFor(status: string, stop?: TripStop): TripRecordKind[] {
  const legal = allowedByStatus[status] ?? [];
  const contextual = stop ? (allowedByStop[stop.kind] ?? legal) : legal;
  return legal.filter((kind) => contextual.includes(kind));
}

function statusFor(kind: TripRecordKind): 'bad' | 'ok' | 'info' {
  if (kind === TripRecordKindEnum.HELD) return 'bad';
  if (
    kind === TripRecordKindEnum.CLEARED_BORDER ||
    kind === TripRecordKindEnum.DELIVERED ||
    kind === TripRecordKindEnum.HANDED_OVER
  )
    return 'ok';
  return 'info';
}

function RouteStrip({ stops, activeStopId }: { stops: TripStop[]; activeStopId?: string }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {stops.map((stop, index) => {
        const current = stop.id === activeStopId;
        const tone = stopTone(stop, current);
        return (
          <article
            key={stop.id}
            className={`min-w-56 flex-1 rounded-xl border p-4 ${
              tone === 'bad'
                ? 'border-bad-line bg-bad-soft'
                : current
                  ? 'border-info-line bg-info-soft'
                  : 'border-line bg-card'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="type-label-s text-ink-3">
                {index + 1} · {stop.kind.replaceAll('_', ' ')}
              </span>
              {stop.latestStatus && (
                <Chip tone={statusFor(stop.latestStatus)}>{labelByKind[stop.latestStatus]}</Chip>
              )}
            </div>
            <h2 className="type-h4 mb-1 mt-3">{stop.name}</h2>
            <p className="type-data-l m-0">{fmtTime(stop.latestOccurredAt ?? stop.plannedAt)}</p>
            <p className="type-body-s mb-0 mt-1 text-ink-3">
              {stop.latestNote || (current ? 'Current checkpoint' : stop.details || 'Planned stop')}
            </p>
          </article>
        );
      })}
    </div>
  );
}

function HorseConditionRow({
  horse,
  value,
  onChange,
}: {
  horse: { id: string; name: string; stall: string | null };
  value: HorseDraft;
  onChange: (patch: Partial<HorseDraft>) => void;
}) {
  return (
    <div className="grid gap-3 border-t border-line px-5 py-4 lg:grid-cols-[minmax(140px,1fr)_minmax(250px,auto)_minmax(260px,1fr)] lg:items-center">
      <div>
        <h3 className="type-h4 m-0">{horse.name}</h3>
        <p className="type-body-s m-0 text-ink-3">{horse.stall ?? 'Stall not assigned'}</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={`${horse.name} condition`}>
        {TripConditionOptions.map((condition) => (
          <button
            key={condition}
            type="button"
            aria-pressed={value.condition === condition}
            onClick={() =>
              onChange(
                value.condition === condition
                  ? { checked: false, condition: null }
                  : { checked: true, condition },
              )
            }
            className={`inline-flex min-h-12 items-center gap-2 rounded-md border px-4 type-label-m ${
              value.condition === condition
                ? condition === HorseConditionEnum.OFF_FEED
                  ? 'border-bad bg-bad-soft text-bad'
                  : condition === HorseConditionEnum.STABLE
                    ? 'border-ok bg-ok-soft text-ok'
                    : 'border-warn bg-warn-soft text-warn'
                : 'border-line-strong bg-input text-ink-2'
            }`}
          >
            {value.condition === condition && <span aria-hidden="true">✓</span>}
            {condition
              .replaceAll('_', ' ')
              .toLowerCase()
              .replace(/^./, (letter) => letter.toUpperCase())}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {(['drinking', 'eating'] as const).map((item) => (
          <label
            key={item}
            className="type-body-s flex min-h-12 cursor-pointer items-center gap-2 rounded-md border border-line-strong bg-input px-3"
          >
            <input
              type="checkbox"
              checked={value[item] === true}
              onChange={(event) => onChange({ checked: true, [item]: event.target.checked })}
              className="size-6 accent-ink"
            />
            {item === 'drinking' ? 'Drinking' : 'Eating'}
          </label>
        ))}
        <input
          aria-label={`${horse.name} note`}
          value={value.note}
          onChange={(event) => onChange({ checked: true, note: event.target.value })}
          placeholder="Condition note (optional)"
          maxLength={500}
          className="type-body-s h-12 min-w-48 flex-1 rounded-md border border-line-strong bg-input px-3 text-ink placeholder:text-ink-3"
        />
      </div>
      <Upload
        accept="image/jpeg,image/png,image/heic,image/heif"
        multiple
        maxCount={8}
        fileList={value.photos}
        beforeUpload={() => false}
        onChange={({ fileList }) => onChange({ checked: true, photos: fileList })}
      >
        <Button type="button" size="sm" leadingIcon="upload">
          Attach condition photos
        </Button>
      </Upload>
    </div>
  );
}

export default function EscortCab() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore(selectAccessToken);
  let accountKey = 'unknown';
  try {
    accountKey = accessToken
      ? (jwtDecode<{ sub?: string }>(accessToken).sub ?? 'unknown')
      : 'unknown';
  } catch {
    /* A malformed token is rejected by the API; it must not share another account's queue. */
  }
  const queueKey = `ef.cab.pending.${accountKey}`;
  const summariesQuery = useTrips('escort', 0);
  const trips = summariesQuery.data?.content ?? [];
  const [code, setCode] = useState('');
  const selectedCode = trips.some((trip) => trip.jobCode === code)
    ? code
    : (trips[0]?.jobCode ?? '');
  const tripQuery = useTrip('escort', selectedCode);
  const trip = tripQuery.data;
  const [selectedStopId, setSelectedStopId] = useState<string>();
  const [cabTask, setCabTask] = useState<'checkpoint' | 'condition'>('checkpoint');
  const [shownDocumentIds, setShownDocumentIds] = useState<string[]>([]);
  const [kind, setKind] = useState<TripRecordKind>(TripRecordKindEnum.ARRIVED_AT_STOP);
  const [note, setNote] = useState('');
  const [drafts, setDrafts] = useState<Record<string, HorseDraft>>({});
  const [now, setNow] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState<PendingCabRecord[]>(() => readPending(queueKey));
  const [holdCleared, setHoldCleared] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [uploadingConditions, setUploadingConditions] = useState(false);
  const mutation = useTripRecord('escort', selectedCode);
  const requestRef = useRef<string | null>(null);
  const uploadedPhotos = useRef(new Map<string, string>());
  const syncingQueue = useRef(false);

  useEffect(() => {
    setDrafts({});
    setNote('');
    setSelectedStopId(undefined);
    setCabTask('checkpoint');
    setHoldCleared(false);
  }, [selectedCode]);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = 'light';
    root.style.colorScheme = 'light';
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      if (previous) root.dataset.theme = previous;
      else delete root.dataset.theme;
      root.style.colorScheme = previous ?? '';
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(queueKey, JSON.stringify(pending));
    } catch {
      messageApi.error(
        'The tablet could not store pending trip updates. Free some browser storage and try again.',
      );
    }
  }, [messageApi, pending, queueKey]);

  useEffect(() => {
    if (!isOnline || pending.length === 0 || syncingQueue.current) return;
    let cancelled = false;
    syncingQueue.current = true;
    void (async () => {
      let remaining = [...pending];
      for (const item of pending) {
        if (cancelled || !navigator.onLine) break;
        try {
          await tripApi.record('escort', item.jobCode, item.input);
          if (cancelled) break;
          remaining = remaining.filter((record) => record.input.clientRef !== item.input.clientRef);
          await queryClient.invalidateQueries({ queryKey: ['trips'] });
          await queryClient.invalidateQueries({ queryKey: ['trip', 'escort', item.jobCode] });
        } catch (error) {
          messageApi.error(
            apiErrorMessage(error, 'A saved cab update could not sync. It remains on this tablet.'),
          );
          break;
        }
      }
      if (!cancelled) setPending(remaining);
      syncingQueue.current = false;
    })();
    return () => {
      cancelled = true;
    };
  }, [isOnline, messageApi, pending, queryClient]);

  const latestHeld = [...(trip?.records ?? [])]
    .reverse()
    .find((record) => record.kind === TripRecordKindEnum.HELD);
  const activeStop = useMemo(() => {
    if (!trip) return undefined;
    if (trip.tripStatus === TripStatusEnum.HELD && latestHeld?.routeStopId) {
      return trip.stops.find((stop) => stop.id === latestHeld.routeStopId);
    }
    const next = trip.stops.find((stop) => !stop.latestStatus);
    return trip.stops.find((stop) => stop.id === selectedStopId) ?? next ?? trip.stops.at(-1);
  }, [trip, selectedStopId, latestHeld]);
  useEffect(() => {
    setShownDocumentIds([]);
  }, [activeStop?.id, selectedCode]);
  const selectedKinds = eventKindsFor(trip?.tripStatus ?? '', activeStop);
  const selectedKind = selectedKinds.includes(kind) ? kind : selectedKinds[0];
  const loadedRecord = [...(trip?.records ?? [])]
    .reverse()
    .find((record) => record.kind === TripRecordKindEnum.LOADED);
  const trailerMinutes = loadedRecord
    ? Math.max(
        0,
        Math.floor((now.getTime() - new Date(loadedRecord.occurredAt).getTime()) / 60_000),
      )
    : null;
  const restDueAt = loadedRecord
    ? new Date(new Date(loadedRecord.occurredAt).getTime() + 6 * 60 * 60_000)
    : null;
  const checkedHorses = trip?.horses.filter((horse) => drafts[horse.id]?.checked) ?? [];
  const welfareMode = activeStop?.kind === 'WELFARE' || activeStop?.kind === 'QUARANTINE';
  const baselineMode = trip?.tripStatus === TripStatusEnum.NOT_STARTED;
  const deliveryMode =
    activeStop?.kind === 'DELIVERY' && trip?.tripStatus === TripStatusEnum.ARRIVED;
  const handoverMode =
    activeStop?.kind === 'DELIVERY' && trip?.tripStatus === TripStatusEnum.DELIVERED;
  const heldMode = trip?.tripStatus === TripStatusEnum.HELD;
  const headerStatus = trip
    ? heldMode
      ? 'Held'
      : trip.tripStatus === 'NOT_STARTED'
        ? 'Loading'
        : trip.tripStatus
    : 'Loading';

  const updateDraft = (horseId: string, patch: Partial<HorseDraft>) => {
    setDrafts((current) => ({
      ...current,
      [horseId]: { ...initialDraft(), ...current[horseId], ...patch },
    }));
  };

  const persistRecord = async (
    recordKind: TripRecordKind,
    conditions?: TripRecordInput['conditions'],
    textOverride?: string,
    receiver?: Pick<TripRecordInput, 'receiverName' | 'receiverSignature'>,
    documentsShown?: string[],
  ): Promise<boolean> => {
    if (!trip) return false;
    requestRef.current ??= crypto.randomUUID();
    const input: TripRecordInput = {
      routeStopId: activeStop?.id ?? null,
      kind: recordKind,
      occurredAt: timeNow(),
      clientRef: requestRef.current,
      text: textOverride?.trim() || note.trim() || undefined,
      conditions,
      documentsShown,
      ...receiver,
    };
    if (!isOnline) {
      const queued = [...pending, { jobCode: selectedCode, input }];
      setPending(queued);
      requestRef.current = null;
      setNote('');
      if (conditions) setDrafts({});
      messageApi.info('Saved on this tablet. It will send when the connection returns.');
      return true;
    }
    try {
      await mutation.mutateAsync(input);
      requestRef.current = null;
      setNote('');
      messageApi.success(`${labelByKind[recordKind]} saved.`);
      if (conditions) setDrafts({});
      return true;
    } catch (error) {
      if (!navigator.onLine) {
        setPending((current) => [...current, { jobCode: selectedCode, input }]);
        requestRef.current = null;
        messageApi.info('Connection lost. Saved on this tablet and queued to send.');
        return true;
      }
      messageApi.error(apiErrorMessage(error, 'The trip update could not be saved.'));
      return false;
    }
  };

  const saveConditions = async () => {
    if (checkedHorses.length === 0) {
      messageApi.error('Select each horse you actually checked before saving.');
      return;
    }
    if (!isOnline && checkedHorses.some((horse) => (drafts[horse.id]?.photos.length ?? 0) > 0)) {
      messageApi.error('Photos need a connection to upload. Save the condition log without photos or reconnect first.');
      return;
    }
    if (checkedHorses.some((horse) => !drafts[horse.id]?.condition)) {
      messageApi.error('Choose a condition for each selected horse.');
      return;
    }
    setUploadingConditions(true);
    try {
      const conditions = await Promise.all(
        checkedHorses.map(async (horse) => {
          const draft = drafts[horse.id] ?? initialDraft();
          const photoFileIds = await Promise.all(
            draft.photos.map(async (photo) => {
              if (!photo.originFileObj) return undefined;
              const existingId = uploadedPhotos.current.get(photo.uid);
              if (existingId) return existingId;
              const fileId = (await fileApi.upload(photo.originFileObj)).id;
              uploadedPhotos.current.set(photo.uid, fileId);
              return fileId;
            }),
          );
          return {
            horseId: horse.id,
            condition: draft.condition!,
            drinking: draft.drinking,
            eating: draft.eating,
            note: draft.note.trim() || undefined,
            photoFileIds: photoFileIds.filter((id): id is string => Boolean(id)),
          };
        }),
      );
      const saved = await persistRecord(TripRecordKindEnum.CONDITION_CHECK, conditions);
      if (saved) uploadedPhotos.current.clear();
    } catch (error) {
      messageApi.error(apiErrorMessage(error, 'Condition photos could not be uploaded.'));
    } finally {
      setUploadingConditions(false);
    }
  };

  const applyAllSound = () => {
    if (!trip) return;
    setDrafts(
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

  const saveCheckpoint = () => {
    if (!selectedKind) return;
    if (
      (selectedKind === TripRecordKindEnum.DEPARTED ||
        selectedKind === TripRecordKindEnum.FLIGHT_DEPARTED) &&
      !trip?.clearanceReady
    ) {
      messageApi.error(
        'Departure can be recorded once the transport specialist clears the dossier.',
      );
      return;
    }
    void persistRecord(selectedKind);
  };

  const conditionTask = welfareMode || baselineMode || (heldMode && Boolean(activeStop));
  const departureEvent =
    selectedKind === TripRecordKindEnum.DEPARTED ||
    selectedKind === TripRecordKindEnum.FLIGHT_DEPARTED;
  const heldBorder = heldMode && activeStop?.kind === 'BORDER';
  const dockLabel =
    conditionTask && cabTask === 'condition'
      ? `Save condition log · ${checkedHorses.length} checked`
      : heldMode
        ? holdCleared
          ? heldBorder
            ? 'Record customs clearance'
            : 'Record leaving stop'
          : 'Save a trip note'
        : selectedKind
          ? `${labelByKind[selectedKind]} · ${fmtTime(now.toISOString())}`
          : 'No available trip action';
  const dockDisabled = conditionTask && cabTask === 'condition'
    ? mutation.isPending || uploadingConditions || checkedHorses.length === 0
    : heldMode
      ? mutation.isPending || (holdCleared ? !isOnline : !note.trim())
      : mutation.isPending ||
        !selectedKind ||
        (departureEvent && !trip?.clearanceReady) ||
        (selectedKind === TripRecordKindEnum.HELD && !note.trim());
  const saveDockAction = () => {
    if (conditionTask && cabTask === 'condition') void saveConditions();
    else if (heldMode && holdCleared) {
      const recordKind = heldBorder
        ? TripRecordKindEnum.CLEARED_BORDER
        : TripRecordKindEnum.LEFT_STOP;
      void persistRecord(
        recordKind,
        undefined,
        undefined,
        undefined,
        recordKind === TripRecordKindEnum.CLEARED_BORDER ? shownDocumentIds : undefined,
      );
    } else if (heldMode) void persistRecord(TripRecordKindEnum.NOTE);
    else if (selectedKind === TripRecordKindEnum.CLEARED_BORDER)
      void persistRecord(selectedKind, undefined, undefined, undefined, shownDocumentIds);
    else saveCheckpoint();
  };

  if (summariesQuery.isPending)
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <Spin size="large" />
      </div>
    );
  if (summariesQuery.isError)
    return (
      <div className="mx-auto max-w-3xl p-8">
        <Callout tone="bad" title="Assigned trips could not be loaded">
          {apiErrorMessage(summariesQuery.error, 'Refresh the page to try again.')}
        </Callout>
      </div>
    );
  if (trips.length === 0)
    return (
      <div data-theme="light" className="min-h-screen bg-canvas p-8">
        <Panel title="No assigned trips">
          <p className="type-body-m m-0">Your assigned trips will appear here.</p>
        </Panel>
      </div>
    );

  const title = heldMode
    ? 'Trip on hold'
    : handoverMode
      ? 'Hand over the horses'
      : deliveryMode
        ? 'Arrival condition'
        : baselineMode
          ? 'Loading baseline · horse condition'
          : welfareMode
            ? 'Condition of each horse'
            : (activeStop?.name ?? 'Trip checkpoint');
  const subtitle = heldMode
    ? 'The coordinator has been alerted. Record any welfare checks while the trip is stopped.'
    : deliveryMode
      ? 'Record each horse’s arrival condition before handing them over.'
      : welfareMode
        ? 'Check the horses in their stalls. Record the ones you actually examined.'
        : (activeStop?.details ?? 'Record the next confirmed event on the route.');

  return (
    <main data-theme="light" className="min-h-screen bg-canvas pb-28 text-ink">
      {contextHolder}
      <header className="sticky top-0 z-20 border-b border-line bg-card px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4">
          {trips.length > 1 ? (
            <Select
              aria-label="Select trip"
              value={selectedCode}
              onChange={setCode}
              options={trips.map((item) => ({
                value: item.jobCode,
                label: `${item.jobCode} · ${item.origin ?? 'Origin'} → ${item.destination ?? 'Destination'}`,
              }))}
              className="min-w-64 flex-1"
            />
          ) : (
            <strong className="type-data-l">{selectedCode}</strong>
          )}
          <p className="type-body-m m-0 hidden flex-1 text-ink-2 md:block">
            {trip?.origin ?? 'Origin'} → {trip?.destination ?? 'Destination'}
          </p>
          <Chip tone={heldMode ? 'bad' : trip?.tripStatus === 'DELIVERED' ? 'ok' : 'info'}>
            {headerStatus}
          </Chip>
          <span className={`type-label-s ${pending.length || !isOnline ? 'text-warn' : 'text-ok'}`}>
            {!isOnline
              ? `Offline · ${pending.length} waiting to send`
              : pending.length
                ? `${pending.length} record${pending.length === 1 ? '' : 's'} waiting to send`
                : 'Online · all records sent'}
          </span>
          <time className="type-data-l">{localStamp(now)}</time>
          <Button size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>

      {tripQuery.isPending ? (
        <div className="p-16 text-center">
          <Spin size="large" />
        </div>
      ) : tripQuery.isError ? (
        <div className="mx-auto max-w-3xl p-8">
          <Callout tone="bad" title="Trip could not be loaded">
            {apiErrorMessage(tripQuery.error, 'Refresh the page to try again.')}
          </Callout>
        </div>
      ) : (
        trip && (
          <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-5 md:px-8">
            <RouteStrip stops={trip.stops} activeStopId={activeStop?.id} />
            {!trip.clearanceReady && trip.tripStatus === TripStatusEnum.NOT_STARTED && (
              <Callout tone="bad" title="Departure locked">
                Departure can be recorded once the transport specialist clears the dossier.
              </Callout>
            )}
            {heldMode && (
              <Callout
                tone="bad"
                title={`Yến was alerted${latestHeld ? ` at ${fmtTime(latestHeld.occurredAt)}` : ''}`}
              >
                <span>{latestHeld?.text || 'The trip is on hold.'}</span>
                <p className="mb-0 mt-2">
                  {loadedRecord
                    ? `On the trailer for ${Math.floor((trailerMinutes ?? 0) / 60)} h ${(trailerMinutes ?? 0) % 60} min. `
                    : 'Loading time not recorded. '}
                  {restDueAt
                    ? `Unload to rest by ${fmtTime(restDueAt.toISOString())}; horses need a rest at least every 6 hours.`
                    : 'Record loading to start the 6-hour trailer rest timer.'}
                </p>
              </Callout>
            )}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <Panel
                title={title}
                extra={
                  activeStop ? (
                    <span className="type-data text-ink-3">
                      {activeStop.kind.replaceAll('_', ' ')}
                    </span>
                  ) : null
                }
              >
                <p className="type-body-m mb-5 mt-0 text-ink-2">{subtitle}</p>
                {trip.stops.length > 0 && (
                  <label className="mb-5 flex max-w-xl flex-col gap-2 type-label-m">
                    Checkpoint
                    <Select
                      value={activeStop?.id}
                      onChange={(value) => setSelectedStopId(value)}
                      options={trip.stops.map((stop) => ({
                        value: stop.id,
                        label: `${stop.name} · ${stop.kind.replaceAll('_', ' ')}`,
                      }))}
                    />
                  </label>
                )}

                {activeStop?.kind === 'BORDER' && trip.documents.length > 0 && (
                  <section className="mb-5 overflow-hidden rounded-lg border border-line">
                    <div className="p-4">
                      <h2 className="type-h4 m-0">Documents at the border</h2>
                      <p className="type-body-s m-0 text-ink-3">
                        Select the documents you show when recording customs clearance at this crossing.
                      </p>
                    </div>
                    {trip.documents.map((document, index) => (
                      <label
                        key={`${document.name}-${document.horseName ?? 'shipment'}-${index}`}
                        className="flex min-h-12 flex-wrap items-center gap-3 border-t border-line px-4 py-3 type-body-m has-[:disabled]:opacity-60"
                      >
                        <input
                          type="checkbox"
                          aria-label={`Shown at border: ${document.name}${document.horseName ? ` · ${document.horseName}` : ''}`}
                          checked={shownDocumentIds.includes(document.id)}
                          disabled={
                            selectedKind !== TripRecordKindEnum.CLEARED_BORDER &&
                            !(heldMode && holdCleared && activeStop?.kind === 'BORDER')
                          }
                          onChange={(event) =>
                            setShownDocumentIds((current) =>
                              event.target.checked
                                ? [...current, document.id]
                                : current.filter((id) => id !== document.id),
                            )
                          }
                          className="size-6 accent-ink"
                        />
                        <span className="type-body-m flex-1">
                          {document.name}{document.horseName ? ` · ${document.horseName}` : ''}
                          {document.reference ? ` · ${document.reference}` : ''}
                        </span>
                        <Chip tone={document.status === 'CLEARED' && document.validity === 'GREEN' ? 'ok' : document.status === 'REJECTED' || document.validity === 'RED' ? 'bad' : 'warn'}>
                          {sentence(document.status)}{document.validity ? ` · ${sentence(document.validity)}` : ''}
                        </Chip>
                      </label>
                    ))}
                  </section>
                )}

                {conditionTask && (
                  <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Cab task">
                    <button
                      type="button"
                      aria-pressed={cabTask === 'checkpoint'}
                      onClick={() => setCabTask('checkpoint')}
                      className={`min-h-12 rounded-md border px-4 type-label-m ${cabTask === 'checkpoint' ? 'border-info bg-info-soft text-info' : 'border-line-strong bg-input text-ink-2'}`}
                    >
                      Checkpoint update
                    </button>
                    <button
                      type="button"
                      aria-pressed={cabTask === 'condition'}
                      onClick={() => setCabTask('condition')}
                      className={`min-h-12 rounded-md border px-4 type-label-m ${cabTask === 'condition' ? 'border-info bg-info-soft text-info' : 'border-line-strong bg-input text-ink-2'}`}
                    >
                      Horse condition
                    </button>
                  </div>
                )}

                {(welfareMode || baselineMode || (heldMode && activeStop)) && cabTask === 'condition' && (
                  <section className="overflow-hidden rounded-lg border border-line">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <h2 className="type-h4 m-0">
                          {baselineMode ? 'Loading baseline' : 'Horse condition'}
                        </h2>
                        <p className="type-body-s m-0 text-ink-3">
                          Select each horse you examined. Record stable, off feed, stressed or climate change, with a note if needed.
                        </p>
                      </div>
                      {!deliveryMode && (
                        <Button className="min-h-12" onClick={applyAllSound}>
                          All stable · drinking · eating
                        </Button>
                      )}
                    </div>
                    {trip.horses.map((horse) => (
                      <HorseConditionRow
                        key={horse.id}
                        horse={horse}
                        value={drafts[horse.id] ?? initialDraft()}
                        onChange={(patch) => updateDraft(horse.id, patch)}
                      />
                    ))}
                    {!heldMode && (
                      <div className="border-t border-line px-5 py-4">
                        <label className="type-label-m flex flex-col gap-2">
                          Stop note (optional)
                          <textarea
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            maxLength={500}
                            rows={2}
                            placeholder="Add context for this condition check"
                            className="type-body-s rounded-md border border-line-strong bg-input p-3 text-ink placeholder:text-ink-3"
                          />
                        </label>
                      </div>
                    )}
                    <p className="type-body-s m-0 border-t border-line px-5 py-3 text-ink-3">
                      Save this append-only condition record from the action dock at the bottom of the screen.
                    </p>
                  </section>
                )}

                {(deliveryMode || handoverMode) && (
                  <DeliveryTask
                    mode={handoverMode ? 'handover' : 'arrival'}
                    horses={trip.horses}
                    canRecordDelivery={trip.horses.every((horse) =>
                      trip.records.some(
                        (record) =>
                          record.kind === TripRecordKindEnum.CONDITION_CHECK &&
                          record.routeStopId === activeStop?.id &&
                          record.conditions.some((condition) => condition.horseId === horse.id),
                      ),
                    )}
                    onSaveConditions={(conditions) =>
                      persistRecord(TripRecordKindEnum.CONDITION_CHECK, conditions)
                    }
                    onRecordDelivery={() => void persistRecord(TripRecordKindEnum.DELIVERED)}
                    onSaveHandover={(receiverName, receiverSignature) =>
                      void persistRecord(
                        TripRecordKindEnum.HANDED_OVER,
                        undefined,
                        `Received by ${receiverName}. Signature captured on the tablet.`,
                        { receiverName, receiverSignature },
                      )
                    }
                    saving={mutation.isPending}
                    online={isOnline}
                  />
                )}

                {!deliveryMode && !handoverMode && !heldMode && (!conditionTask || cabTask === 'checkpoint') && (
                  <section className="grid gap-4 md:grid-cols-2">
                    <label className="type-label-m flex flex-col gap-2">
                      Checkpoint event
                      <div className="flex flex-wrap gap-2" role="group" aria-label="Checkpoint outcome">
                        {selectedKinds.map((value) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={selectedKind === value}
                            onClick={() => setKind(value)}
                            className={`min-h-12 rounded-md border px-4 type-label-m ${
                              selectedKind === value
                                ? 'border-info bg-info-soft text-info'
                                : 'border-line-strong bg-input text-ink-2'
                            }`}
                          >
                            {labelByKind[value]}
                          </button>
                        ))}
                      </div>
                    </label>
                    <label className="type-label-m flex flex-col gap-2">
                      Recorded at
                      <input
                        readOnly
                        value={localStamp(now)}
                        className="type-data h-10 rounded-md border border-line-strong bg-input px-3 text-ink"
                      />
                    </label>
                    <label className="type-label-m flex flex-col gap-2 md:col-span-2">
                      What happened?{' '}
                      {selectedKind === TripRecordKindEnum.HELD
                        ? '(required reason)'
                        : '(optional)'}
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder={
                          selectedKind === TripRecordKindEnum.HELD
                            ? 'Describe why the trip is held and what the horses need.'
                            : 'Add a short checkpoint note.'
                        }
                        className="type-body-s rounded-md border border-line-strong bg-input p-3 text-ink placeholder:text-ink-3"
                      />
                    </label>
                  </section>
                )}

                {heldMode && (
                  <section className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="type-label-m flex flex-col gap-2 md:col-span-2">
                      Welfare note or concern
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Record water, feed or a horse condition update."
                        className="type-body-s rounded-md border border-line-strong bg-input p-3 text-ink placeholder:text-ink-3"
                      />
                    </label>
                    <label className="type-body-s flex min-h-12 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={holdCleared}
                        onChange={(event) => setHoldCleared(event.target.checked)}
                      />
                      Yến has cleared this hold
                    </label>
                  </section>
                )}
              </Panel>

              <aside className="flex flex-col gap-5">
                <Panel
                  title="On board"
                  extra={
                    <span className="type-label-s text-ink-3">{trip.horses.length} horses</span>
                  }
                >
                  <ul className="m-0 list-none divide-y divide-line p-0">
                    {trip.horses.map((horse) => (
                      <li key={horse.id} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <strong className="type-body-m">{horse.name}</strong>
                          <p className="type-body-s m-0 text-ink-3">
                            {horse.stall ?? 'Stall not assigned'}
                          </p>
                        </div>
                        <Chip>
                          {drafts[horse.id]?.checked && drafts[horse.id].condition
                            ? sentence(drafts[horse.id].condition)
                            : 'Not checked'}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                </Panel>
                <Panel title="Next checkpoint">
                  {activeStop ? (
                    <>
                      <h3 className="type-h3 m-0">{activeStop.name}</h3>
                      <p className="type-body-s mb-0 mt-2 text-ink-2">
                        {activeStop.details || activeStop.kind.replaceAll('_', ' ')}
                      </p>
                      <p className="type-data mt-3">Planned {fmtTime(activeStop.plannedAt)}</p>
                    </>
                  ) : (
                    <p className="type-body-s m-0 text-ink-3">No route stops are assigned.</p>
                  )}
                </Panel>
                <Panel title="Latest trip records">
                  <ol className="m-0 list-none divide-y divide-line p-0">
                    {[...(trip.records ?? [])]
                      .reverse()
                      .slice(0, 5)
                      .map((record) => (
                        <li key={record.id} className="py-3">
                          <div className="flex items-center justify-between gap-2">
                            <strong className="type-body-s">{labelByKind[record.kind]}</strong>
                            <time className="type-data text-ink-3">
                              {fmtTime(record.occurredAt)}
                            </time>
                          </div>
                          {record.text && (
                            <p className="type-body-s mb-0 mt-1 text-ink-2">{record.text}</p>
                          )}
                        </li>
                      ))}
                  </ol>
                </Panel>
              </aside>
            </div>
          </div>
        )
      )}
      {trip && !deliveryMode && !handoverMode && (
        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-card px-4 py-3 shadow-lg md:px-8">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
            <div>
              <p className="type-label-m m-0">{dockLabel}</p>
              <p className="type-body-s m-0 text-ink-3">
              {conditionTask && cabTask === 'condition'
                  ? 'Append-only welfare record · saved locally when offline'
                  : `Record for ${activeStop?.name ?? trip.destination ?? 'this trip'} · ${isOnline ? 'changes sync to the trip log' : 'will sync when connected'}`}
              </p>
            </div>
            <Button
              variant="primary"
              className="min-h-16 min-w-60 text-base"
              disabled={dockDisabled}
              onClick={saveDockAction}
            >
              {mutation.isPending || uploadingConditions ? 'Saving…' : dockLabel}
            </Button>
          </div>
        </footer>
      )}
    </main>
  );
}

function DeliveryTask({
  mode,
  horses,
  canRecordDelivery,
  onSaveConditions,
  onRecordDelivery,
  onSaveHandover,
  saving,
  online,
}: {
  mode: 'arrival' | 'handover';
  horses: Array<{ id: string; name: string; stall: string | null }>;
  canRecordDelivery: boolean;
  onSaveConditions: (conditions: TripRecordInput['conditions']) => Promise<boolean>;
  onRecordDelivery: () => void;
  onSaveHandover: (receiverName: string, receiverSignature: string) => void;
  saving: boolean;
  online: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [receiver, setReceiver] = useState('');
  const [signatureReady, setSignatureReady] = useState(false);
  const [arrival, setArrival] = useState<Record<string, HorseDraft>>({});
  const uploadedArrivalPhotos = useRef(new Map<string, string>());
  const [handed, setHanded] = useState<Record<string, boolean>>({});
  const checked = horses.filter((horse) => arrival[horse.id]?.checked);
  const [arrivalError, setArrivalError] = useState('');
  const [uploadingArrivalPhotos, setUploadingArrivalPhotos] = useState(false);
  const signature = (event: PointerEvent<HTMLCanvasElement>, begin: boolean) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * (canvas.width / bounds.width);
    const y = (event.clientY - bounds.top) * (canvas.height / bounds.height);
    if (begin) {
      context.beginPath();
      context.moveTo(x, y);
      drawing.current = true;
      canvas.setPointerCapture(event.pointerId);
    } else if (drawing.current) {
      context.lineWidth = 2.5;
      context.lineCap = 'round';
      context.lineTo(x, y);
      context.stroke();
      setSignatureReady(true);
    }
  };
  const saveArrivalConditions = async () => {
    if (!horses.every((horse) => arrival[horse.id]?.checked && arrival[horse.id]?.condition)) {
      setArrivalError('Choose an arrival condition for every horse before saving.');
      return;
    }
    if (!online && horses.some((horse) => (arrival[horse.id]?.photos.length ?? 0) > 0)) {
      setArrivalError('Photos need a connection to upload. Reconnect before saving arrival photos.');
      return;
    }
    setArrivalError('');
    setUploadingArrivalPhotos(true);
    try {
      const conditions = await Promise.all(
        horses.map(async (horse) => {
          const value = arrival[horse.id] ?? initialDraft();
          const photoFileIds = await Promise.all(
            value.photos.map(async (photo) =>
              {
                if (!photo.originFileObj) return undefined;
                const existingId = uploadedArrivalPhotos.current.get(photo.uid);
                if (existingId) return existingId;
                const fileId = (await fileApi.upload(photo.originFileObj)).id;
                uploadedArrivalPhotos.current.set(photo.uid, fileId);
                return fileId;
              },
            ),
          );
          return {
            horseId: horse.id,
            condition: value.condition!,
            drinking: value.drinking,
            eating: value.eating,
            note: value.note.trim() || undefined,
            photoFileIds: photoFileIds.filter((id): id is string => Boolean(id)),
          };
        }),
      );
      const saved = await onSaveConditions(conditions);
      if (saved) uploadedArrivalPhotos.current.clear();
    } catch (error) {
      setArrivalError(apiErrorMessage(error, 'Arrival photos could not be uploaded.'));
    } finally {
      setUploadingArrivalPhotos(false);
    }
  };
  if (mode === 'arrival')
    return (
      <div className="mt-5 flex flex-col gap-5">
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="p-4">
            <h2 className="type-h4 m-0">Arrival condition</h2>
            <p className="type-body-s m-0 text-ink-3">
              Record each horse’s condition as it comes off the trailer.
            </p>
          </div>
          {horses.map((horse) => {
            const value = arrival[horse.id] ?? initialDraft();
            return (
              <HorseConditionRow
                key={horse.id}
                horse={horse}
                value={value}
                onChange={(patch) =>
                  setArrival((current) => ({
                    ...current,
                    [horse.id]: { ...initialDraft(), ...current[horse.id], ...patch },
                  }))
                }
              />
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="type-body-s text-ink-3">
            {checked.length} of {horses.length} horses checked
          </span>
        </div>
        {arrivalError && <p role="alert" className="type-body-s m-0 text-bad">{arrivalError}</p>}
        {!canRecordDelivery && (
          <p className="type-body-s m-0 text-ink-3">
            Record every horse’s arrival condition. The cab dock will then let you record delivery.
          </p>
        )}
        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-card px-4 py-3 shadow-lg md:px-8">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
            <div>
              <p className="type-label-m m-0">
                {canRecordDelivery ? 'Arrival condition recorded for every horse' : `${checked.length} of ${horses.length} horses checked`}
              </p>
              <p className="type-body-s m-0 text-ink-3">
                {canRecordDelivery ? 'Record the arrival checkpoint to complete the trip.' : 'Condition entries and photos become append-only trip records.'}
              </p>
            </div>
            {canRecordDelivery ? (
              <Button
                variant="primary"
                className="min-h-16 min-w-60 text-base"
                disabled={saving || !online}
                onClick={onRecordDelivery}
              >
                Record delivery · {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </Button>
            ) : (
              <Button
                variant="primary"
                className="min-h-16 min-w-60 text-base"
                disabled={saving || uploadingArrivalPhotos || checked.length !== horses.length}
                onClick={() => void saveArrivalConditions()}
              >
                {uploadingArrivalPhotos ? 'Uploading photos…' : 'Save arrival condition'}
              </Button>
            )}
          </div>
        </footer>
      </div>
    );

  return (
    <div className="mt-5 flex flex-col gap-5">
      <div className="rounded-lg border border-line bg-raised p-4">
        <strong className="type-body-m">What happens next</strong>
        <p className="type-body-s mb-0 mt-1 text-ink-2">
          The customer can confirm the handover or report a problem. If they do not reply by the
          stated due date, the handover is accepted on this record.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="type-label-m flex flex-col gap-2">
          Received by
          <input
            value={receiver}
            onChange={(event) => setReceiver(event.target.value)}
            maxLength={120}
            placeholder="Receiving groom’s full name"
            className="type-body-m h-12 rounded-md border border-line-strong bg-input px-3 text-ink placeholder:text-ink-3"
          />
        </label>
        <div>
          <span className="type-label-m">Signature on this tablet</span>
          <canvas
            ref={canvasRef}
            width={680}
            height={180}
            className="mt-2 h-32 w-full touch-none rounded-md border border-line-strong bg-input"
            onPointerDown={(event) => signature(event, true)}
            onPointerMove={(event) => signature(event, false)}
            onPointerUp={() => {
              drawing.current = false;
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="type-body-s text-ink-3">
              {signatureReady ? 'Signature captured' : 'Ask the receiver to sign above'}
            </span>
            <Button
              size="sm"
              onClick={() => {
                const canvas = canvasRef.current;
                canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
                setSignatureReady(false);
              }}
            >
              Clear signature
            </Button>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="p-4">
          <h2 className="type-h4 m-0">Handed over</h2>
          <p className="type-body-s m-0 text-ink-3">
            Confirm every horse was handed to the receiver.
          </p>
        </div>
        {horses.map((horse) => (
          <label
            key={horse.id}
            className="flex min-h-12 items-center gap-3 border-t border-line px-4 py-3 type-body-m"
          >
            <input
              type="checkbox"
              checked={handed[horse.id] ?? false}
              onChange={(event) =>
                setHanded((current) => ({ ...current, [horse.id]: event.target.checked }))
              }
            />
            {horse.name}
            <span className="type-body-s text-ink-3">{horse.stall ?? 'Stall not assigned'}</span>
          </label>
        ))}
      </div>
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-card px-4 py-3 shadow-lg md:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="type-label-m m-0">Hand over the horses</p>
            <p className="type-body-s m-0 text-ink-3">
              Receiver name, signature and every horse must be confirmed.
            </p>
          </div>
          <Button
            variant="primary"
            className="min-h-16 min-w-60 text-base"
            disabled={
              saving ||
              !receiver.trim() ||
              !signatureReady ||
              !horses.every((horse) => handed[horse.id])
            }
            onClick={() =>
              onSaveHandover(receiver.trim(), canvasRef.current?.toDataURL('image/png') ?? '')
            }
          >
            {saving
              ? 'Saving…'
              : `Record handover · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
          </Button>
        </div>
      </footer>
    </div>
  );
}
