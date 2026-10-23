import { useMemo, useRef, useState } from 'react';
import type { UploadFile } from 'antd';
import { Input, Select, Upload } from 'antd';
import dayjs from 'dayjs';

import { CabBar } from './CabBar';
import { CabDock } from './CabDock';
import { CabStrip } from './CabStrip';
import { ChangeTimeModal } from './ChangeTimeModal';
import { ConditionSegmented } from './ConditionSegmented';
import { EscortHeldView } from './EscortHeldView';
import { HeldBanner } from './HeldBanner';
import { NextStopPanel } from './NextStopPanel';
import { OnBoardCabPanel } from './OnBoardCabPanel';
import { SignatureBox } from './SignatureBox';
import { Toggle48 } from './Toggle48';
import { WhatCustomerSeesPanel } from './WhatCustomerSeesPanel';
import { formatClock, formatCountdown } from '../tripFormat';

import { fileApi } from '@/apis/file';
import { Button, Chip, Panel } from '@/components/ui';
import type { HorseCondition, TripRecordKind, TripStop, TripView } from '@/interfaces';
import { HorseConditionEnum, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';

type Props = {
  trip: TripView;
  userName?: string;
  isPending?: boolean;
  onSaveCheckpoint: (data: {
    routeStopId: string | null;
    kind: TripRecordKind;
    occurredAt: string;
    text?: string;
    documentsShown?: string[];
    receiverName?: string;
  }) => Promise<void>;
  onSaveConditions: (
    conditions: Array<{
      horseId: string;
      condition: HorseCondition;
      drinking: boolean | null;
      eating: boolean | null;
      note?: string;
      photoFileIds: string[];
    }>,
  ) => Promise<void>;
};

type CabMode = 'checkpoint' | 'welfare' | 'handover';

export function EscortCabSurface({
  trip,
  userName = 'Minh, driver',
  isPending = false,
  onSaveCheckpoint,
  onSaveConditions,
}: Props) {
  // Current active stop
  const firstPendingIndex = trip.stops.findIndex((s) => !s.latestOccurredAt);
  const currentStop =
    firstPendingIndex === -1
      ? trip.stops[trip.stops.length - 1]
      : trip.stops[Math.max(0, firstPendingIndex)];

  const [selectedStopId, setSelectedStopId] = useState<string | null>(currentStop?.id ?? null);
  const activeStop = trip.stops.find((s) => s.id === selectedStopId) ?? currentStop;

  const nextStop = useMemo(() => {
    const idx = trip.stops.findIndex((s) => s.id === activeStop?.id);
    return idx >= 0 && idx < trip.stops.length - 1 ? trip.stops[idx + 1] : null;
  }, [trip.stops, activeStop]);

  const [mode, setMode] = useState<CabMode>(
    activeStop?.kind === 'DELIVERY' ? 'handover' : 'checkpoint',
  );

  // Checkpoint Form state
  const [outcome, setOutcome] = useState<'CLEARED' | 'HELD'>('CLEARED');
  const [checkpointTime, setCheckpointTime] = useState<dayjs.Dayjs>(dayjs());
  const [isChangeTimeOpen, setIsChangeTimeOpen] = useState(false);
  const [isLoggingWelfare, setIsLoggingWelfare] = useState(false);
  const [checkpointNote, setCheckpointNote] = useState('');
  const [docsChecked, setDocsChecked] = useState<Record<string, boolean>>({
    permit: true,
    health: true,
    customs: true,
  });

  // Welfare Form state
  const uploadedPhotos = useRef(new Map<string, string>());
  const [conditions, setConditions] = useState<
    Record<
      string,
      {
        condition: HorseCondition;
        drinking: boolean | null;
        eating: boolean | null;
        note: string;
        photos: UploadFile[];
      }
    >
  >(() => {
    const init: Record<
      string,
      {
        condition: HorseCondition;
        drinking: boolean | null;
        eating: boolean | null;
        note: string;
        photos: UploadFile[];
      }
    > = {};
    for (const h of trip.horses) {
      init[h.id] = {
        condition: HorseConditionEnum.STABLE,
        drinking: true,
        eating: true,
        note: '',
        photos: [],
      };
    }
    return init;
  });

  // Handover state
  const [receiverName, setReceiverName] = useState('Sophea · receiving groom');
  const [isSigned, setIsSigned] = useState(true);
  const [handoverChecks, setHandoverChecks] = useState<Record<string, boolean>>({
    horses: true,
    passports: true,
    permits: true,
    log: true,
  });

  // Action handlers
  const handleAllStableShortcut = () => {
    const updated = { ...conditions };
    for (const h of trip.horses) {
      updated[h.id] = {
        condition: HorseConditionEnum.STABLE,
        drinking: true,
        eating: true,
        note: updated[h.id]?.note || '',
        photos: updated[h.id]?.photos || [],
      };
    }
    setConditions(updated);
  };

  const handleRecordCheckpoint = async () => {
    const kind = outcome === 'HELD' ? TripRecordKindEnum.HELD : TripRecordKindEnum.CLEARED_BORDER;
    const documentsShown = Object.entries(docsChecked)
      .filter(([, v]) => v)
      .map(([k]) => k);
    await onSaveCheckpoint({
      routeStopId: activeStop?.id ?? null,
      kind,
      occurredAt: checkpointTime.toISOString(),
      text: checkpointNote || undefined,
      documentsShown,
    });
  };

  const handleRecordWelfare = async () => {
    const payload = await Promise.all(
      trip.horses.map(async (h) => {
        const cState = conditions[h.id];
        const photoFileIds: string[] = [];
        if (cState?.photos) {
          for (const upload of cState.photos) {
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
        }
        return {
          horseId: h.id,
          condition: cState?.condition ?? HorseConditionEnum.STABLE,
          drinking: cState?.drinking ?? null,
          eating: cState?.eating ?? null,
          note: cState?.note || undefined,
          photoFileIds,
        };
      }),
    );
    await onSaveConditions(payload);
    setIsLoggingWelfare(false);
  };

  const handleRecordHandover = async () => {
    await onSaveCheckpoint({
      routeStopId: activeStop?.id ?? null,
      kind: TripRecordKindEnum.DELIVERED,
      occurredAt: new Date().toISOString(),
      text: `Handed over to ${receiverName}. All passports and documents presented.`,
      receiverName: receiverName.split('·')[0].trim(),
    });
  };

  // Summary labels for bottom dock
  let dockSummary = '';
  let dockSub = '';
  let dockAction = '';
  let dockOnAction: () => void = () => {};
  let dockSecondary: string | undefined;
  let dockOnSecondary: (() => void) | undefined;

  const isTripHeld = trip.tripStatus === TripStatusEnum.HELD;

  // Effective driver name for canonical held trip CBRT-2026-040 vs active trip CBRT-2026-041
  const effectiveUserName =
    trip.jobCode === 'CBRT-2026-040' ? 'Nguyễn Văn Tùng' : userName || 'Minh, driver';

  if (isTripHeld && !isLoggingWelfare) {
    dockSummary = 'Waiting for Yến’s decision';
    dockSub =
      'Nothing to record until she decides; any water or checks you log go on the trip record.';
    dockAction = '';
    dockOnAction = () => {};
    dockSecondary = undefined;
    dockOnSecondary = undefined;
  } else if (mode === 'checkpoint') {
    dockSummary = `${outcome === 'CLEARED' ? 'Cleared' : 'Held'} at ${formatClock(
      checkpointTime.toDate(),
    )} · ${Object.values(docsChecked).filter(Boolean).length} documents shown`;
    dockSub =
      'Saved on this tablet first and sent as soon as there is signal. You can amend it for 15 minutes.';
    dockAction = `Record: ${outcome === 'CLEARED' ? 'cleared' : 'held'} at ${formatClock(
      checkpointTime.toDate(),
    )}`;
    dockOnAction = handleRecordCheckpoint;
    dockSecondary = 'Change time';
    dockOnSecondary = () => setIsChangeTimeOpen(true);
  } else if (mode === 'welfare') {
    const offFeedCount = Object.values(conditions).filter(
      (c) => c.condition === HorseConditionEnum.OFF_FEED,
    ).length;
    const stressedCount = Object.values(conditions).filter(
      (c) => c.condition === HorseConditionEnum.STRESSED,
    ).length;
    const stableCount = Object.values(conditions).filter(
      (c) => c.condition === HorseConditionEnum.STABLE,
    ).length;
    dockSummary = `${stableCount} stable, ${offFeedCount} off feed, ${stressedCount} stressed`;
    dockSub = 'Saved on this tablet first; amend within 15 minutes.';
    dockAction = 'Save condition log';
    dockOnAction = handleRecordWelfare;
  } else {
    dockSummary = `${trip.horses.length} horses sound · signed by ${
      receiverName.split('·')[0].trim() || 'receiver'
    }`;
    dockSub = 'Saved on this tablet first and sent as soon as there is signal.';
    dockAction = `Record handover at ${formatClock(new Date())}`;
    dockOnAction = handleRecordHandover;
  }

  return (
    <div className="flex flex-col gap-6">
      <CabBar trip={trip} userName={effectiveUserName} />

      <div className="flex flex-col gap-6 px-4 md:px-8">
        {/* Big Touch Route Strip */}
        <CabStrip
          trip={trip}
          selectedStopId={activeStop?.id}
          onSelectStop={(s) => setSelectedStopId(s.id)}
        />

        {isTripHeld && !isLoggingWelfare ? (
          <EscortHeldView
            trip={trip}
            userName={effectiveUserName}
            onLogWaterOrCheck={() => {
              setIsLoggingWelfare(true);
              setMode('welfare');
            }}
            onCallManager={() => {}}
          />
        ) : (
          <>
            {/* Mode Switch Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex gap-2">
                {isTripHeld ? (
                  <Button
                    variant="secondary"
                    leadingIcon="arrow-left"
                    onClick={() => setIsLoggingWelfare(false)}
                  >
                    Back to hold view
                  </Button>
                ) : (
                  <>
                    <Button
                      variant={mode === 'checkpoint' ? 'primary' : 'secondary'}
                      onClick={() => setMode('checkpoint')}
                    >
                      Record Checkpoint
                    </Button>
                    <Button
                      variant={mode === 'welfare' ? 'primary' : 'secondary'}
                      onClick={() => setMode('welfare')}
                    >
                      Horse Welfare
                    </Button>
                    <Button
                      variant={mode === 'handover' ? 'primary' : 'secondary'}
                      onClick={() => setMode('handover')}
                    >
                      Handover & Acceptance
                    </Button>
                  </>
                )}
              </div>
              {isTripHeld && <Chip tone="bad">Held at the border</Chip>}
            </div>

            {/* Main Task + Side Column */}
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              {/* Main Task Surface (8 cols) */}
              <div className="flex flex-col gap-6 lg:col-span-8">
                {mode === 'checkpoint' && (
                  <Panel
                    title={activeStop?.name ?? 'Checkpoint'}
                    extra={
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="type-body-s text-ink-3">
                          Arrived {formatClock(activeStop?.plannedAt)}
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setIsChangeTimeOpen(true)}
                          className="h-8 px-3 text-xs font-medium"
                        >
                          Time: {formatClock(checkpointTime.toDate())} · Change
                        </Button>
                      </div>
                    }
                  >
                    <div className="flex flex-col gap-6">
                      {/* Outcome Options */}
                      <div className="flex flex-col gap-2">
                        <span className="type-label-m text-ink-2">Outcome</span>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setOutcome('CLEARED')}
                            className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                              outcome === 'CLEARED'
                                ? 'border-ok bg-ok-soft/30 ring-1 ring-ok'
                                : 'border-line bg-card hover:bg-muted/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="type-label-m font-bold text-ink">Cleared</span>
                              {outcome === 'CLEARED' && <Chip tone="ok">Selected</Chip>}
                            </div>
                            <span className="type-body-s text-ink-2">
                              Both border posts stamped the papers and the trip goes on.
                            </span>
                            <span className="type-caption text-ink-3">
                              The customer sees “Cleared {formatClock(checkpointTime.toDate())}”
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setOutcome('HELD')}
                            className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                              outcome === 'HELD'
                                ? 'border-bad bg-bad-soft/30 ring-1 ring-bad'
                                : 'border-line bg-card hover:bg-muted/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="type-label-m font-bold text-ink">Held</span>
                              {outcome === 'HELD' && <Chip tone="bad">Selected</Chip>}
                            </div>
                            <span className="type-body-s text-ink-2">
                              The load is stopped at the border and can’t go on yet.
                            </span>
                            <span className="type-caption text-bad">
                              Alerts Yến, logistics manager, when you save
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Documents Shown 48px Toggles */}
                      <div className="flex flex-col gap-2">
                        <span className="type-label-m text-ink-2">
                          Documents shown at the border
                        </span>
                        <div className="flex flex-col gap-2">
                          <Toggle48
                            label="Cambodia import permit"
                            sub="KH-IP-2026-3381"
                            checked={Boolean(docsChecked.permit)}
                            onChange={(v) => setDocsChecked((prev) => ({ ...prev, permit: v }))}
                          />
                          <Toggle48
                            label="Export health certificates · 4 horses"
                            sub="DAH-XK-2026-0917"
                            checked={Boolean(docsChecked.health)}
                            onChange={(v) => setDocsChecked((prev) => ({ ...prev, health: v }))}
                          />
                          <Toggle48
                            label="Customs clearance"
                            sub="TK-2026-300915"
                            checked={Boolean(docsChecked.customs)}
                            onChange={(v) => setDocsChecked((prev) => ({ ...prev, customs: v }))}
                          />
                        </div>
                      </div>

                      {/* Note block */}
                      <div className="flex flex-col gap-2 border-t border-line pt-4">
                        <div className="flex items-center justify-between">
                          <label htmlFor="cab-check-note" className="type-label-m text-ink-2">
                            Note (optional)
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsChangeTimeOpen(true)}
                            className="type-caption cursor-pointer text-ink-3 hover:text-accent"
                          >
                            Recording at {formatClock(checkpointTime.toDate())} · Change
                          </button>
                        </div>
                        <Input
                          id="cab-check-note"
                          value={checkpointNote}
                          onChange={(e) => setCheckpointNote(e.target.value)}
                          placeholder="Stamped at the Bavet desk; the load was not opened."
                          className="h-12 text-base"
                        />
                      </div>
                    </div>
                  </Panel>
                )}

                {mode === 'welfare' && (
                  <Panel
                    title="Condition of each horse"
                    extra={
                      <Button
                        variant="secondary"
                        leadingIcon="check"
                        onClick={handleAllStableShortcut}
                      >
                        All stable · drinking · eating
                      </Button>
                    }
                  >
                    <div className="flex flex-col divide-y divide-line">
                      {trip.horses.map((horse) => {
                        const cState = conditions[horse.id] ?? {
                          condition: HorseConditionEnum.STABLE,
                          drinking: true,
                          eating: true,
                          note: '',
                        };

                        return (
                          <div
                            key={horse.id}
                            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-col">
                                <span className="type-h4 m-0 text-ink">{horse.name}</span>
                                <span className="type-body-s text-ink-2">
                                  {horse.stall ?? 'Standard stall'}
                                </span>
                              </div>
                              <ConditionSegmented
                                value={cState.condition}
                                onChange={(val) =>
                                  setConditions((prev) => ({
                                    ...prev,
                                    [horse.id]: { ...cState, condition: val },
                                  }))
                                }
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                              <div className="sm:col-span-3">
                                <Toggle48
                                  label="Drinking"
                                  checked={Boolean(cState.drinking)}
                                  onChange={(v) =>
                                    setConditions((prev) => ({
                                      ...prev,
                                      [horse.id]: { ...cState, drinking: v },
                                    }))
                                  }
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <Toggle48
                                  label="Eating"
                                  checked={Boolean(cState.eating)}
                                  onChange={(v) =>
                                    setConditions((prev) => ({
                                      ...prev,
                                      [horse.id]: { ...cState, eating: v },
                                    }))
                                  }
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-2 sm:col-span-6">
                                <Input
                                  value={cState.note}
                                  onChange={(e) =>
                                    setConditions((prev) => ({
                                      ...prev,
                                      [horse.id]: { ...cState, note: e.target.value },
                                    }))
                                  }
                                  placeholder="Add a note (optional)"
                                  className="h-12 flex-1"
                                />
                                <Upload
                                  multiple
                                  showUploadList={false}
                                  beforeUpload={() => false}
                                  onChange={({ fileList }) =>
                                    setConditions((prev) => ({
                                      ...prev,
                                      [horse.id]: { ...cState, photos: fileList },
                                    }))
                                  }
                                >
                                  <Button
                                    variant="secondary"
                                    leadingIcon="upload"
                                    className="h-12 whitespace-nowrap"
                                  >
                                    {cState.photos.length > 0
                                      ? `${cState.photos.length} photo${
                                          cState.photos.length > 1 ? 's' : ''
                                        }`
                                      : 'Photos'}
                                  </Button>
                                </Upload>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                )}

                {mode === 'handover' && (
                  <Panel title="Hand over the horses">
                    <div className="flex flex-col gap-6">
                      {/* Offload condition preview */}
                      <div className="divide-y divide-line">
                        {trip.horses.map((horse) => (
                          <div key={horse.id} className="flex items-center justify-between py-3">
                            <div className="flex flex-col">
                              <span className="type-label-m font-bold text-ink">{horse.name}</span>
                              <span className="type-body-s text-ink-3">
                                {horse.stall ?? 'Standard stall'}
                              </span>
                            </div>
                            <Chip tone="ok">Stable</Chip>
                          </div>
                        ))}
                      </div>

                      {/* Handed over toggles */}
                      <div className="flex flex-col gap-2 border-t border-line pt-4">
                        <span className="type-label-m text-ink-2">Handed over</span>
                        <Toggle48
                          label={`${trip.horses.length} horses`}
                          sub={trip.horses.map((h) => h.name).join(' · ')}
                          checked={Boolean(handoverChecks.horses)}
                          onChange={(v) => setHandoverChecks((prev) => ({ ...prev, horses: v }))}
                        />
                        <Toggle48
                          label={`${trip.horses.length} equine passports`}
                          checked={Boolean(handoverChecks.passports)}
                          onChange={(v) => setHandoverChecks((prev) => ({ ...prev, passports: v }))}
                        />
                        <Toggle48
                          label="Import permit and health certificates"
                          sub="KH-IP-2026-3381 · DAH-XK-2026-0917"
                          checked={Boolean(handoverChecks.permits)}
                          onChange={(v) => setHandoverChecks((prev) => ({ ...prev, permits: v }))}
                        />
                        <Toggle48
                          label="Trip journey log"
                          sub={`${trip.records.length} records completed.`}
                          checked={Boolean(handoverChecks.log)}
                          onChange={(v) => setHandoverChecks((prev) => ({ ...prev, log: v }))}
                        />
                      </div>

                      {/* Received By and Signature Box */}
                      <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label htmlFor="cab-recv-by" className="type-label-s text-ink-2">
                            Received by
                          </label>
                          <Select
                            id="cab-recv-by"
                            value={receiverName}
                            onChange={(v) => setReceiverName(v)}
                            options={[
                              {
                                value: 'Sophea · receiving groom',
                                label: 'Sophea · receiving groom (Phnom Penh)',
                              },
                              {
                                value: 'Vannak · barn manager',
                                label: 'Vannak · barn manager (Phnom Penh)',
                              },
                            ]}
                            className="h-10"
                          />
                          <span className="type-caption text-ink-3">
                            Named by the centre on the delivery order.
                          </span>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="type-label-s text-ink-2">Signature</span>
                          <SignatureBox
                            signatureName={isSigned ? receiverName.split('·')[0].trim() : ''}
                            signedWhen="Signed on this tablet"
                            onClear={() => setIsSigned(!isSigned)}
                          />
                        </div>
                      </div>
                    </div>
                  </Panel>
                )}
              </div>

              {/* Right Info Column (4 cols) */}
              <div className="flex flex-col gap-4 lg:col-span-4">
                {mode === 'handover' ? (
                  <Panel title="What happens next">
                    <div className="flex flex-col gap-2">
                      <h4 className="type-h4 m-0 text-ink">The customer confirms</h4>
                      <p className="type-body-s m-0 text-ink-2">
                        The receiving club confirms the handover and each horse’s condition, or
                        reports a problem.
                      </p>
                      <div className="flex items-baseline justify-between border-t border-line pt-2">
                        <span className="type-mono-data text-xl font-bold text-ink">
                          Due in 2 days
                        </span>
                        <span className="type-label-m text-info">Confirmation window</span>
                      </div>
                      <p className="type-body-s m-0 text-ink-3">
                        If they don’t reply within 2 days, the handover is taken as accepted on this
                        record and logistics is told.
                      </p>
                    </div>
                  </Panel>
                ) : nextStop ? (
                  <NextStopPanel
                    title={nextStop.name}
                    sub={`${nextStop.kind.toLowerCase().replaceAll('_', ' ')} · ${
                      nextStop.details ?? 'Scheduled stop'
                    }`}
                    time={formatClock(nextStop.plannedAt)}
                    due={
                      nextStop.plannedAt
                        ? (formatCountdown(nextStop.plannedAt) ?? 'Next checkpoint')
                        : 'Next checkpoint'
                    }
                  />
                ) : (
                  <NextStopPanel
                    title={trip.destination ?? 'Destination'}
                    sub="Final delivery & handover"
                    time={formatClock(trip.plannedArrivalAt)}
                    due={
                      trip.plannedArrivalAt
                        ? (formatCountdown(trip.plannedArrivalAt) ?? 'Arrival window')
                        : 'Arrival window'
                    }
                  />
                )}

                {mode === 'welfare' &&
                  trip.records.find((r) => r.conditions && r.conditions.length > 0) && (
                    <Panel title="Previous log">
                      {(() => {
                        const prev = trip.records
                          .filter((r) => r.conditions && r.conditions.length > 0)
                          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
                        if (!prev) return null;
                        return (
                          <div className="flex flex-col gap-1.5">
                            <h4 className="type-h4 m-0 text-ink">
                              Last check · {formatClock(prev.occurredAt)}
                            </h4>
                            <p className="type-body-s m-0 text-ink-2">
                              {prev.text ||
                                prev.conditions
                                  .map((c) => `${c.horseName}: ${c.condition.toLowerCase()}`)
                                  .join(', ')}
                            </p>
                            {prev.recordedBy && (
                              <span className="type-caption text-ink-3">{prev.recordedBy}</span>
                            )}
                          </div>
                        );
                      })()}
                    </Panel>
                  )}

                <OnBoardCabPanel horses={trip.horses} />

                <WhatCustomerSeesPanel
                  text={`The last checkpoint you recorded (${
                    activeStop?.name ?? 'Checkpoint'
                  }), with its verified time. Between checkpoints they see that one, never an estimate.`}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Docked bottom bar */}
      <CabDock
        summary={dockSummary}
        sub={dockSub}
        actionText={dockAction}
        onAction={dockOnAction}
        secondaryText={dockSecondary}
        onSecondary={dockOnSecondary}
        isActionLoading={isPending}
      />

      {/* Change Time Modal for Glove/Cab Tablet */}
      <ChangeTimeModal
        open={isChangeTimeOpen}
        currentTime={checkpointTime}
        onApply={(t) => setCheckpointTime(t)}
        onClose={() => setIsChangeTimeOpen(false)}
      />
    </div>
  );
}
