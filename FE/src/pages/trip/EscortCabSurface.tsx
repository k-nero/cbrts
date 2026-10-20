import { useEffect, useMemo, useRef, useState } from 'react';
import { Input, message, Select, Spin, type UploadFile, Upload } from 'antd';
import { fileApi } from '@/apis/file';
import { Button, Callout, Chip, Icon } from '@/components/ui';
import { useAuth, useMe } from '@/hooks/auth';
import { useTrip, useTripRecord, useTrips } from '@/hooks/trip';
import {
  HorseConditionEnum,
  type TripRecordKind,
  TripRecordKindEnum,
  TripStatusEnum,
} from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import {
  CabBar,
  CabDock,
  CabStrip,
  type CabStripStop,
  ConditionControl,
  type ConditionPick,
  CustomerSeesPanel,
  durText,
  formatTimeOnly,
  NextStopPanel,
  OnBoardPanel,
  sentence,
  SignatureBox,
  TaskHead,
  Toggle48,
} from './TripComponents';

type TaskMode = 'CHECKPOINT' | 'WELFARE' | 'DELIVERY' | 'HELD';

type HorseObservation = {
  condition: ConditionPick;
  drinking: boolean;
  eating: boolean;
  note: string;
  photos: UploadFile[];
};

export function EscortCabSurface() {
  const { logout } = useAuth();
  const { data: me } = useMe();
  const [page, setPage] = useState(0);
  const [nowTime, setNowTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  // Keep cab clock fresh
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setNowTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      );
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  const [messageApi, contextHolder] = message.useMessage();

  // Trips data
  const summariesQuery = useTrips('escort', page);
  const summaries = summariesQuery.data?.content ?? [];
  const [code, setCode] = useState('');
  const selectedCode = summaries.some((item) => item.jobCode === code)
    ? code
    : (summaries[0]?.jobCode ?? '');

  const detailQuery = useTrip('escort', selectedCode);
  const trip = detailQuery.data;

  const mutation = useTripRecord('escort', selectedCode);
  const uploadedPhotos = useRef(new Map<string, string>());

  // Selected stop
  const [selectedStopId, setSelectedStopId] = useState<string>();

  // Active task mode (tabs for escort)
  const [mode, setMode] = useState<TaskMode>('CHECKPOINT');

  // Checkpoint form state
  const [checkpointOutcome, setCheckpointOutcome] = useState<'CLEARED' | 'HELD'>('CLEARED');
  const [checkpointDocs, setCheckpointDocs] = useState<Record<string, boolean>>({
    permit: true,
    health: true,
    customs: true,
  });
  const [checkpointNote, setCheckpointNote] = useState('');
  const [checkpointTime, setCheckpointTime] = useState(nowTime);

  // Welfare condition form state
  const [horseConditions, setHorseConditions] = useState<Record<string, HorseObservation>>({});

  // Handover form state
  const [arrivalConditions, setArrivalConditions] = useState<Record<string, { condition: ConditionPick; note: string }>>({});
  const [handoverChecks, setHandoverChecks] = useState<Record<string, boolean>>({
    horses: true,
    passports: true,
    permits: true,
    tripLog: true,
  });
  const [receivedByGroom, setReceivedByGroom] = useState('Sophea · receiving groom');
  const [signed, setSigned] = useState(true);

  // Initialize or update horse conditions when trip loads
  useEffect(() => {
    if (!trip) return;
    setHorseConditions((prev) => {
      const next: Record<string, HorseObservation> = { ...prev };
      for (const horse of trip.horses) {
        if (!next[horse.id]) {
          next[horse.id] = {
            condition: 'SOUND',
            drinking: true,
            eating: true,
            note: '',
            photos: [],
          };
        }
      }
      return next;
    });

    setArrivalConditions((prev) => {
      const next: Record<string, { condition: ConditionPick; note: string }> = { ...prev };
      for (const horse of trip.horses) {
        if (!next[horse.id]) {
          next[horse.id] = {
            condition: 'SOUND',
            note: 'Settled well on arrival.',
          };
        }
      }
      return next;
    });

    // Auto-detect mode if trip is HELD
    if (trip.tripStatus === TripStatusEnum.HELD) {
      setMode('HELD');
    } else if (trip.tripStatus === TripStatusEnum.ARRIVED || trip.tripStatus === TripStatusEnum.DELIVERED) {
      setMode('DELIVERY');
    }
  }, [trip]);

  // Cab user info
  const escortUser = useMemo(() => {
    const fullName = me ? `${me.firstName} ${me.lastName}`.trim() : 'Nguyễn Văn Minh';
    const roleName = me?.roles?.[0] ? sentence(me.roles[0]) : 'Driver';
    const initials = me
      ? `${me.firstName?.[0] || ''}${me.lastName?.[0] || ''}`.toUpperCase()
      : 'NM';
    return {
      name: fullName || 'Nguyễn Văn Minh',
      role: roleName,
      initials: initials || 'NM',
    };
  }, [me]);

  // Compute CabStrip stops
  const cabStops: CabStripStop[] = useMemo(() => {
    if (!trip || trip.stops.length === 0) {
      return [
        {
          id: '1',
          name: trip?.origin || 'Pickup',
          kind: 'Pickup',
          state: 'done',
          time: '06:05',
          note: 'Departed',
        },
        {
          id: '2',
          name: 'Border crossing',
          kind: 'Border',
          state: 'current',
          time: '08:34',
          note: 'Arrived · recording now',
        },
        {
          id: '3',
          name: 'Welfare stop',
          kind: 'Welfare stop',
          state: 'upcoming',
          time: '09:30',
          note: 'Planned',
        },
        {
          id: '4',
          name: trip?.destination || 'Delivery',
          kind: 'Delivery',
          state: 'upcoming',
          time: '12:30',
          note: 'Planned',
        },
      ];
    }

    return trip.stops.map((stop) => {
      const isPast = Boolean(stop.latestOccurredAt);
      const isCurrent =
        !isPast &&
        trip.stops.find((s) => !s.latestOccurredAt)?.id === stop.id;
      const isHeld = isCurrent && trip.tripStatus === TripStatusEnum.HELD;

      let state: CabStripStop['state'] = 'upcoming';
      if (isHeld) state = 'held';
      else if (isPast) state = 'done';
      else if (isCurrent) state = 'current';

      let note = stop.details || sentence(stop.kind);
      if (stop.latestStatus) {
        note = sentence(stop.latestStatus);
      } else if (state === 'current') {
        note = 'Recording now';
      } else if (state === 'upcoming') {
        note = 'Planned';
      }

      return {
        id: stop.id,
        name: stop.name,
        kind: sentence(stop.kind),
        state,
        time: stop.latestOccurredAt
          ? formatTimeOnly(stop.latestOccurredAt)
          : formatTimeOnly(stop.plannedAt),
        note,
      };
    });
  }, [trip]);

  // Current active stop
  const currentStop = useMemo(() => {
    if (!trip || trip.stops.length === 0) return null;
    if (selectedStopId) {
      return trip.stops.find((s) => s.id === selectedStopId) || trip.stops[0];
    }
    const upcoming = trip.stops.find((s) => !s.latestOccurredAt);
    return upcoming || trip.stops[trip.stops.length - 1];
  }, [trip, selectedStopId]);

  // Next stop (for side panel)
  const nextStop = useMemo(() => {
    if (!trip || trip.stops.length === 0) {
      return {
        title: 'Svay Rieng welfare stop',
        sub: 'Water, rest and a condition check · 45 min.',
        dueText: 'in 56 min',
        dueTime: '09:30',
      };
    }
    const idx = trip.stops.findIndex((s) => !s.latestOccurredAt);
    const stop = idx >= 0 ? trip.stops[idx] : trip.stops[trip.stops.length - 1];
    return {
      title: stop.name,
      sub: stop.details || `${sentence(stop.kind)} stop`,
      dueText: 'in plan',
      dueTime: formatTimeOnly(stop.plannedAt),
    };
  }, [trip]);

  // One-tap shortcut: "All sound · drinking · eating"
  const applyAllSound = () => {
    if (!trip) return;
    setHorseConditions((prev) => {
      const next: Record<string, HorseObservation> = {};
      for (const h of trip.horses) {
        next[h.id] = {
          condition: 'SOUND',
          drinking: true,
          eating: true,
          note: prev[h.id]?.note || '',
          photos: prev[h.id]?.photos || [],
        };
      }
      return next;
    });
    messageApi.success('Applied: All sound, drinking and eating.');
  };

  // Submit Checkpoint
  const handleSaveCheckpoint = async () => {
    if (!trip) return;
    const isDeparted = trip.tripStatus === TripStatusEnum.NOT_STARTED;
    const kind: TripRecordKind = isDeparted
      ? TripRecordKindEnum.DEPARTED
      : checkpointOutcome === 'HELD'
        ? TripRecordKindEnum.HELD
        : TripRecordKindEnum.CLEARED_BORDER;

    try {
      await mutation.mutateAsync({
        routeStopId: currentStop?.id ?? null,
        kind,
        occurredAt: new Date().toISOString(),
        clientRef: crypto.randomUUID(),
        text: checkpointNote || (checkpointOutcome === 'HELD' ? 'Held at checkpoint.' : 'Cleared checkpoint.'),
      });
      messageApi.success(
        checkpointOutcome === 'HELD'
          ? 'Recorded: Held at checkpoint. Logistics manager alerted.'
          : `Recorded: Cleared at ${nowTime}`,
      );
      setCheckpointNote('');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Failed to save checkpoint.'));
    }
  };

  // Submit Welfare Condition Log
  const handleSaveConditionLog = async () => {
    if (!trip) return;
    try {
      const conditions = await Promise.all(
        trip.horses.map(async (horse) => {
          const obs = horseConditions[horse.id] ?? {
            condition: 'SOUND',
            drinking: true,
            eating: true,
            note: '',
            photos: [],
          };

          const photoFileIds: string[] = [];
          for (const upload of obs.photos) {
            if (!upload.originFileObj) continue;
            const existingId = uploadedPhotos.current.get(upload.uid);
            if (existingId) {
              photoFileIds.push(existingId);
              continue;
            }
            const uploaded = await fileApi.upload(upload.originFileObj);
            uploadedPhotos.current.set(upload.uid, uploaded.id);
            photoFileIds.push(uploaded.id);
          }

          return {
            horseId: horse.id,
            condition: HorseConditionEnum[obs.condition],
            drinking: obs.drinking,
            eating: obs.eating,
            note: obs.note || undefined,
            photoFileIds,
          };
        }),
      );

      await mutation.mutateAsync({
        routeStopId: currentStop?.id ?? null,
        kind: TripRecordKindEnum.CONDITION_CHECK,
        occurredAt: new Date().toISOString(),
        clientRef: crypto.randomUUID(),
        text: 'Welfare condition check logged.',
        conditions,
      });

      messageApi.success('Horse condition log saved.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Failed to save condition log.'));
    }
  };

  // Submit Delivery & Handover
  const handleSaveHandover = async () => {
    if (!trip) return;
    try {
      const conditions = trip.horses.map((horse) => {
        const arr = arrivalConditions[horse.id] ?? {
          condition: 'SOUND',
          note: 'Sound on arrival.',
        };
        return {
          horseId: horse.id,
          condition: HorseConditionEnum[arr.condition],
          drinking: true,
          eating: true,
          note: arr.note || undefined,
          photoFileIds: [],
        };
      });

      await mutation.mutateAsync({
        routeStopId: currentStop?.id ?? null,
        kind: TripRecordKindEnum.HANDED_OVER,
        occurredAt: new Date().toISOString(),
        clientRef: crypto.randomUUID(),
        text: `Handed over to ${receivedByGroom}. Signed on tablet.`,
        receiverName: receivedByGroom.trim() || undefined,
        conditions,
      });

      messageApi.success(`Handover recorded at ${nowTime}.`);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Failed to record handover.'));
    }
  };

  // Dynamic Dock configuration
  const dockConfig = useMemo(() => {
    if (mode === 'CHECKPOINT') {
      const isDeparted = trip?.tripStatus === TripStatusEnum.NOT_STARTED;
      if (isDeparted) {
        return {
          summary: `Depart at ${nowTime} · All horses loaded`,
          sub: 'Recorded on this tablet and sent immediately. Customer tracking updates in real time.',
          primary: {
            label: `Record departure at ${nowTime}`,
            onClick: handleSaveCheckpoint,
            loading: mutation.isPending,
            disabled: !trip?.clearanceReady,
          },
        };
      }

      if (checkpointOutcome === 'HELD') {
        return {
          summary: `Held at ${checkpointTime} · Bavet – Mộc Bài`,
          sub: 'Alerts logistics manager Yến immediately when you save. Stay in exit lane.',
          primary: {
            label: `Record: held at ${checkpointTime}`,
            onClick: handleSaveCheckpoint,
            loading: mutation.isPending,
          },
        };
      }

      return {
        summary: `Cleared at ${checkpointTime} · 3 documents shown`,
        sub: 'Saved on this tablet first and sent as soon as there is signal. Amend within 15 minutes.',
        secondary: { label: 'Change time', onClick: () => setCheckpointTime(nowTime) },
        primary: {
          label: `Record: cleared at ${checkpointTime}`,
          onClick: handleSaveCheckpoint,
          loading: mutation.isPending,
        },
      };
    }

    if (mode === 'WELFARE') {
      const soundCount = Object.values(horseConditions).filter(
        (c) => c.condition === 'SOUND',
      ).length;
      const watchCount = Object.values(horseConditions).filter(
        (c) => c.condition === 'WATCH',
      ).length;
      return {
        summary: `Leave in 41 min · by 10:21`,
        sub: `${soundCount} sound, ${watchCount} on watch. Saved on tablet; amend within 15 minutes.`,
        primary: {
          label: 'Save condition log',
          onClick: handleSaveConditionLog,
          loading: mutation.isPending,
        },
      };
    }

    if (mode === 'DELIVERY') {
      return {
        summary: `${trip?.horses.length || 4} horses sound · signed by Sophea`,
        sub: 'Saved on this tablet first and sent as soon as there is signal.',
        primary: {
          label: `Record handover at ${nowTime}`,
          onClick: handleSaveHandover,
          loading: mutation.isPending,
        },
      };
    }

    // HELD mode
    return {
      summary: 'Waiting for Yến’s decision',
      sub: 'Nothing to record until she decides; any water or checks you log go on the trip record.',
      secondary: { label: 'Call Yến', onClick: () => messageApi.info('Calling operations desk: +84 28 0000 0000') },
    };
  }, [
    mode,
    trip,
    nowTime,
    checkpointOutcome,
    checkpointTime,
    mutation.isPending,
    horseConditions,
    handleSaveCheckpoint,
    handleSaveConditionLog,
    handleSaveHandover,
    messageApi,
  ]);

  return (
    <div
      data-theme="light"
      className="min-h-screen bg-canvas font-sans text-ink selection:bg-gold-soft pb-32"
    >
      {contextHolder}

      {/* 1. Sunlit Cab Bar */}
      <CabBar
        jobCode={trip?.jobCode || selectedCode || 'CBRT-2026-041'}
        route={`${trip?.origin || 'Phú Thọ'} → ${trip?.destination || 'Phnom Penh'}`}
        pill={{
          label:
            trip?.tripStatus === TripStatusEnum.HELD
              ? 'Held at the border'
              : trip?.clearanceReady
                ? 'Clear to depart'
                : 'Departure locked',
          tone:
            trip?.tripStatus === TripStatusEnum.HELD
              ? 'bad'
              : trip?.clearanceReady
                ? 'ok'
                : 'bad',
        }}
        synced={!mutation.isPending}
        syncLabel={mutation.isPending ? 'Sending record…' : 'All records sent'}
        nowTime={nowTime}
        user={escortUser}
        onSignOut={logout}
        jobSelector={
          summaries.length > 1 ? (
            <Select
              size="small"
              value={selectedCode}
              onChange={setCode}
              className="w-36"
              options={summaries.map((s) => ({ value: s.jobCode, label: s.jobCode }))}
            />
          ) : undefined
        }
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-5">
        {/* Loading / Error states */}
        {summariesQuery.isPending && (
          <div className="py-12 text-center">
            <Spin size="large" />
          </div>
        )}

        {summariesQuery.isError && (
          <Callout tone="bad" title="Could not load escort assignments">
            {apiErrorMessage(summariesQuery.error, 'Please check your connection and refresh.')}
          </Callout>
        )}

        {/* 2. Big Touch Route Strip (CabStrip) */}
        <CabStrip
          stops={cabStops}
          selectedStopId={currentStop?.id}
          onSelectStop={(id) => setSelectedStopId(id)}
        />

        {/* Clearance Hard Gate Warning */}
        {trip && !trip.clearanceReady && (
          <Callout tone="bad" title="Departure locked">
            Departure cannot be recorded until the transport specialist marks the dossier as CLEARANCE_READY.
          </Callout>
        )}

        {/* Task Mode Switcher Tabs for Cab */}
        <div className="flex items-center gap-2 border-b border-line pb-2">
          <span className="type-body-s mr-2 text-ink-3">Cab task:</span>
          {(
            [
              { key: 'CHECKPOINT', label: '1. Checkpoint & Border' },
              { key: 'WELFARE', label: '2. Welfare stop condition' },
              { key: 'DELIVERY', label: '3. Handover & Delivery' },
              { key: 'HELD', label: '4. Border hold status' },
            ] as const
          ).map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => setMode(t.key)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                mode === t.key
                  ? 'bg-ink text-canvas font-semibold shadow-xs'
                  : 'bg-card text-ink-2 hover:bg-muted border border-line'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 3. Main Split Body */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Task Area (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* MODE 1: Checkpoint & Border (scrTripCheckpoint) */}
            {mode === 'CHECKPOINT' && (
              <section className="overflow-hidden rounded-xl border border-line bg-card shadow-xs">
                <TaskHead
                  title={currentStop?.name || 'Mộc Bài – Bavet'}
                  sub={
                    currentStop?.details ||
                    'Border crossing: Vietnam exit and Cambodia entry. Arrived 07:58.'
                  }
                />

                <div className="flex flex-col gap-5 p-6">
                  {/* Outcome Selector */}
                  <div className="flex flex-col gap-2.5">
                    <span className="type-label-m text-ink-2">Outcome</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label
                        className={`flex flex-col gap-1 rounded-xl p-4 transition-all cursor-pointer border ${
                          checkpointOutcome === 'CLEARED'
                            ? 'border-ink bg-raised shadow-xs'
                            : 'border-line bg-card hover:border-line-strong'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="outcome"
                            checked={checkpointOutcome === 'CLEARED'}
                            onChange={() => setCheckpointOutcome('CLEARED')}
                            className="size-4 text-ink"
                          />
                          <strong className="type-label-m text-ink">Cleared</strong>
                        </div>
                        <p className="type-body-s m-0 text-ink-2 pl-6">
                          Both border posts stamped the papers and the trip goes on.
                        </p>
                        <span className="type-mono-caption pl-6 text-ok">
                          The customer sees “Cleared {checkpointTime}”
                        </span>
                      </label>

                      <label
                        className={`flex flex-col gap-1 rounded-xl p-4 transition-all cursor-pointer border ${
                          checkpointOutcome === 'HELD'
                            ? 'border-bad bg-bad-soft shadow-xs'
                            : 'border-line bg-card hover:border-line-strong'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="outcome"
                            checked={checkpointOutcome === 'HELD'}
                            onChange={() => setCheckpointOutcome('HELD')}
                            className="size-4 text-bad"
                          />
                          <strong className="type-label-m text-bad">Held</strong>
                        </div>
                        <p className="type-body-s m-0 text-ink-2 pl-6">
                          The load is stopped at the border and can’t go on yet.
                        </p>
                        <span className="type-mono-caption pl-6 text-warn">
                          Alerts Yến, logistics manager, when you save
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Documents Shown at Border (48px Toggles) */}
                  <div className="flex flex-col gap-2.5">
                    <span className="type-label-m text-ink-2">Documents shown at the border</span>
                    <div className="flex flex-col gap-2">
                      <Toggle48
                        label="Cambodia import permit"
                        checked={checkpointDocs.permit}
                        onChange={(c) => setCheckpointDocs((d) => ({ ...d, permit: c }))}
                        sub="KH-IP-2026-3381"
                      />
                      <Toggle48
                        label="Export health certificates · 4 horses"
                        checked={checkpointDocs.health}
                        onChange={(c) => setCheckpointDocs((d) => ({ ...d, health: c }))}
                        sub="DAH-XK-2026-0917"
                      />
                      <Toggle48
                        label="Customs clearance"
                        checked={checkpointDocs.customs}
                        onChange={(c) => setCheckpointDocs((d) => ({ ...d, customs: c }))}
                        sub="TK-2026-300915"
                      />
                    </div>
                  </div>

                  {/* Note input */}
                  <div className="flex flex-col gap-2">
                    <label className="type-label-m text-ink-2" htmlFor="checkpoint-note-input">
                      Note (optional)
                    </label>
                    <Input
                      id="checkpoint-note-input"
                      value={checkpointNote}
                      onChange={(e) => setCheckpointNote(e.target.value)}
                      placeholder="Stamped at the Bavet desk; the load was not opened."
                      className="h-11 rounded-lg"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* MODE 2: Welfare Stop Condition Check (scrTripWelfare) */}
            {mode === 'WELFARE' && (
              <section className="overflow-hidden rounded-xl border border-line bg-card shadow-xs">
                <TaskHead
                  title="Condition of each horse"
                  sub="Check each horse in its stall before you leave. Concern on any horse opens an incident and alerts Yến."
                />

                {/* 1-Tap Quick Action */}
                <div className="flex items-center justify-between border-b border-line bg-muted/40 px-6 py-3.5">
                  <Button
                    variant="secondary"
                    leadingIcon="check"
                    onClick={applyAllSound}
                    className="h-11 font-medium"
                  >
                    All sound · drinking · eating
                  </Button>
                  <span className="type-body-s text-ink-3">
                    One-tap shortcut. Then change only the horse that differs.
                  </span>
                </div>

                {/* Horses on Board */}
                <div className="divide-y divide-line p-6 flex flex-col gap-6">
                  {(trip?.horses || [
                    { id: 'h1', name: 'Shadowfax', stall: 'Stall 1 · standard' },
                    { id: 'h2', name: 'Nightfall', stall: 'Stall 4 · climate' },
                    { id: 'h3', name: 'Copper King', stall: 'Stall 2 · box' },
                    { id: 'h4', name: 'Silver Bell', stall: 'Stall 6 · standard' },
                  ]).map((horse) => {
                    const obs = horseConditions[horse.id] ?? {
                      condition: 'SOUND',
                      drinking: true,
                      eating: true,
                      note: '',
                      photos: [],
                    };

                    const isDiffering = obs.condition !== 'SOUND';

                    return (
                      <div
                        key={horse.id}
                        className={`flex flex-col gap-3.5 rounded-xl p-4 transition-colors ${
                          isDiffering ? 'bg-raised border border-line-strong' : ''
                        }`}
                      >
                        {/* Top: Name + Big Condition Control */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-col">
                            <strong className="type-h4 text-ink">{horse.name}</strong>
                            <span className="type-body-s text-ink-3">
                              {horse.stall ?? 'Standard stall'}
                            </span>
                          </div>
                          <ConditionControl
                            value={obs.condition}
                            onChange={(cond) =>
                              setHorseConditions((prev) => ({
                                ...prev,
                                [horse.id]: { ...obs, condition: cond },
                              }))
                            }
                          />
                        </div>

                        {/* Bottom: Drinking, Eating toggles + Note */}
                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 items-center">
                          <Toggle48
                            label="Drinking"
                            checked={obs.drinking}
                            onChange={(checked) =>
                              setHorseConditions((prev) => ({
                                ...prev,
                                [horse.id]: { ...obs, drinking: checked },
                              }))
                            }
                          />
                          <Toggle48
                            label="Eating"
                            checked={obs.eating}
                            onChange={(checked) =>
                              setHorseConditions((prev) => ({
                                ...prev,
                                [horse.id]: { ...obs, eating: checked },
                              }))
                            }
                          />
                          <div className="sm:col-span-2">
                            <Input
                              value={obs.note}
                              onChange={(e) =>
                                setHorseConditions((prev) => ({
                                  ...prev,
                                  [horse.id]: { ...obs, note: e.target.value },
                                }))
                              }
                              placeholder="Add a note (optional)"
                              className="h-12 rounded-lg"
                            />
                          </div>
                        </div>

                        {/* Photo attachment if needed */}
                        <div className="flex items-center gap-2 pt-1">
                          <Upload
                            accept="image/*"
                            fileList={obs.photos}
                            beforeUpload={() => false}
                            onChange={({ fileList }) =>
                              setHorseConditions((prev) => ({
                                ...prev,
                                [horse.id]: { ...obs, photos: fileList },
                              }))
                            }
                          >
                            <Button variant="secondary" size="sm" leadingIcon="upload">
                              Attach photo
                            </Button>
                          </Upload>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* MODE 3: Delivery & Handover (scrTripDelivery) */}
            {mode === 'DELIVERY' && (
              <section className="overflow-hidden rounded-xl border border-line bg-card shadow-xs">
                <TaskHead
                  title="Hand over the horses"
                  sub={`Record each horse as it comes off the trailer, then have the receiving groom sign. Arrived 12:41 at ${
                    trip?.destination || 'Phnom Penh Equestrian Centre'
                  }.`}
                />

                <div className="flex flex-col gap-6 p-6">
                  {/* Arrival condition rows */}
                  <div className="flex flex-col gap-3">
                    <span className="type-label-m text-ink-2">Arrival condition</span>
                    {(trip?.horses || [
                      { id: 'h1', name: 'Shadowfax', stall: 'Stall 1 · standard' },
                      { id: 'h2', name: 'Nightfall', stall: 'Stall 4 · climate' },
                      { id: 'h3', name: 'Copper King', stall: 'Stall 2 · box' },
                      { id: 'h4', name: 'Silver Bell', stall: 'Stall 6 · standard' },
                    ]).map((h) => {
                      const arr = arrivalConditions[h.id] ?? {
                        condition: 'SOUND',
                        note: 'Sound on arrival.',
                      };
                      return (
                        <div
                          key={h.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3"
                        >
                          <div>
                            <strong className="type-h4 text-ink">{h.name}</strong>
                            <p className="type-body-s m-0 text-ink-3">
                              {h.stall || 'Standard stall'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <ConditionControl
                              value={arr.condition}
                              onChange={(c) =>
                                setArrivalConditions((prev) => ({
                                  ...prev,
                                  [h.id]: { ...arr, condition: c },
                                }))
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Handed Over Checklist (48px Toggles) */}
                  <div className="flex flex-col gap-2.5">
                    <span className="type-label-m text-ink-2">Handed over</span>
                    <div className="flex flex-col gap-2">
                      <Toggle48
                        label={`${trip?.horses.length || 4} horses`}
                        checked={handoverChecks.horses}
                        onChange={(c) => setHandoverChecks((h) => ({ ...h, horses: c }))}
                        sub={
                          trip?.horses.map((h) => h.name).join(' · ') ||
                          'Shadowfax · Nightfall · Copper King · Silver Bell'
                        }
                      />
                      <Toggle48
                        label={`${trip?.horses.length || 4} equine passports`}
                        checked={handoverChecks.passports}
                        onChange={(c) => setHandoverChecks((h) => ({ ...h, passports: c }))}
                      />
                      <Toggle48
                        label="Import permit and 4 health certificates"
                        checked={handoverChecks.permits}
                        onChange={(c) => setHandoverChecks((h) => ({ ...h, permits: c }))}
                        sub="KH-IP-2026-3381 · DAH-XK-2026-0917"
                      />
                      <Toggle48
                        label="Trip log"
                        checked={handoverChecks.tripLog}
                        onChange={(c) => setHandoverChecks((h) => ({ ...h, tripLog: c }))}
                        sub={`${trip?.records.length || 9} records logged on this move`}
                      />
                    </div>
                  </div>

                  {/* Received By Groom & On-tablet Signature */}
                  <div className="flex flex-col gap-3">
                    <span className="type-label-m text-ink-2">Received by</span>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <label className="type-body-s text-ink-3" htmlFor="received-by-input">
                          Receiving groom name
                        </label>
                        <Input
                          id="received-by-input"
                          value={receivedByGroom}
                          onChange={(e) => setReceivedByGroom(e.target.value)}
                          className="h-12 rounded-lg"
                        />
                        <span className="type-body-s text-ink-3">
                          Named by the centre on the delivery order.
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="type-body-s text-ink-3">
                          On-tablet receiver signature
                        </label>
                        <SignatureBox
                          name={signed ? receivedByGroom.split(' ')[0] : ''}
                          when={`Signed on this tablet · ${nowTime}`}
                          onClear={() => setSigned(false)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* MODE 4: Held Screen (scrTripHeld) */}
            {mode === 'HELD' && (
              <section className="overflow-hidden rounded-xl border border-line bg-card shadow-xs">
                <TaskHead
                  title="Held at Bavet – Mộc Bài"
                  sub="Mộc Bài is closed to heavy vehicles until 16:00. You recorded the hold at 08:12."
                />

                <div className="flex flex-col gap-5 p-6">
                  <Callout tone="info" title="Yến was alerted at 08:12 and is deciding">
                    She’ll choose between waiting, re-routing via Xa Mát or returning, and call you. Stay in the exit lane. Unload only if horses need it.
                  </Callout>

                  {/* On trailer clock */}
                  <div className="flex items-center gap-6 rounded-xl border border-warn bg-warn-soft p-5">
                    <span className="type-data-l font-mono text-3xl font-bold text-warn">
                      3 h 25 min
                    </span>
                    <div className="flex flex-col">
                      <strong className="type-label-m text-ink">On the trailer since 05:30</strong>
                      <span className="type-body-s text-ink-2">
                        Unload to rest by 11:30: at least every 6 hours.
                      </span>
                    </div>
                  </div>

                  {/* Actions while waiting */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="secondary"
                      leadingIcon="plus"
                      onClick={() => setMode('WELFARE')}
                      className="h-12"
                    >
                      Log water or a check
                    </Button>
                    <Button
                      variant="secondary"
                      leadingIcon="phone"
                      onClick={() => messageApi.info('Calling operations desk: +84 28 0000 0000')}
                      className="h-12"
                    >
                      Call Yến
                    </Button>
                  </div>

                  {/* Quoted record */}
                  <div className="rounded-lg border border-line bg-raised p-4">
                    <strong className="type-label-s text-ink-3">What you recorded</strong>
                    <blockquote className="type-body-m my-1.5 text-ink italic">
                      “Mộc Bài is closed to vehicles over 10 t until 16:00 for a bridge inspection. We are parked in the Bavet exit lane. Horses are settled.”
                    </blockquote>
                    <span className="type-mono-caption text-ink-3">08:12 · Minh, driver · sent</span>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column (4 cols) */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            <NextStopPanel
              title={nextStop.title}
              sub={nextStop.sub}
              dueText={nextStop.dueText}
              dueTime={nextStop.dueTime}
            />

            <OnBoardPanel
              horses={trip?.horses || [
                { name: 'Shadowfax', stall: 'Stall 1 · standard' },
                { name: 'Nightfall', stall: 'Stall 4 · climate' },
                { name: 'Copper King', stall: 'Stall 2 · box' },
                { name: 'Silver Bell', stall: 'Stall 6 · standard' },
              ]}
            />

            <CustomerSeesPanel
              text={
                mode === 'CHECKPOINT'
                  ? 'The last checkpoint you recorded, with its time. Between checkpoints they see that one, never an estimate.'
                  : mode === 'WELFARE'
                    ? 'Each horse’s condition word and your note, under “Latest condition log”. They read the word you chose.'
                    : mode === 'DELIVERY'
                      ? 'Your condition words and notes under “Arrival condition”, with Sophea’s name and the time she signed.'
                      : '“Held at Bavet – Mộc Bài since 08:12”, and Yến’s message once she decides. Never a guessed arrival time.'
              }
            />
          </aside>
        </div>
      </main>

      {/* 4. Docked Bottom Bar */}
      <CabDock
        summary={dockConfig.summary}
        sub={dockConfig.sub}
        secondary={dockConfig.secondary}
        primary={dockConfig.primary}
      />
    </div>
  );
}
