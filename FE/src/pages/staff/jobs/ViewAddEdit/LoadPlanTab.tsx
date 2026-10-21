import {
  type Announcements,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  type Modifier,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useState } from 'react';
import { Select, Skeleton } from 'antd';

import { horseMeta, QUEUE_DROP_ID, temperamentChip } from './loadPlan';
import { QueueColumn } from './QueueColumn';
import { QueueHorse } from './QueueHorse';
import { StallSlot } from './StallSlot';

import { Button, Callout, Chip, Icon, LoadItem, Panel, Progress, StatTile } from '@/components/ui';
import {
  useAutoArrange,
  useConfirmLoadPlan,
  useCreateLoadPlan,
  useJobDetail,
  useMoveHorse,
  useSignOffTripPlan,
} from '@/hooks/useJob';
import { useActiveVehicles } from '@/hooks/useVehicle';
import type { JobDetail, JobHorse, LoadPlanStall } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils/error';

interface Props {
  job: JobDetail;
}

/** A horse picked up by drag or by click: where it was is the move's precondition. */
export interface Picked {
  horse: JobHorse;
  /** The stall it stands in; null when it is waiting to load. */
  fromStallId: string | null;
}

/** How often an open draft plan refetches, so a plan someone else changed doesn't stay stale. */
const POLL_MS = 10_000;

/** Pins the drag card's top-left just past the cursor, wherever on the source it was grabbed. */
const besideCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (!(activatorEvent instanceof PointerEvent) || !draggingNodeRect) return transform;
  return {
    ...transform,
    x: transform.x + activatorEvent.clientX - draggingNodeRect.left + 12,
    y: transform.y + activatorEvent.clientY - draggingNodeRect.top + 12,
  };
};

export function LoadPlanTab({ job }: Props) {
  const loadPlan = job.loadPlan;
  const [selected, setSelected] = useState<Picked | null>(null);
  const [dragging, setDragging] = useState<Picked | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const { data: activeVehicles, isLoading: loadingVehicles } = useActiveVehicles();
  const createLoadPlanMutation = useCreateLoadPlan(job.id);
  const moveMutation = useMoveHorse(job.id);
  const autoArrangeMutation = useAutoArrange(job.id);
  const confirmMutation = useConfirmLoadPlan(job.id);
  const signOffMutation = useSignOffTripPlan(job.id);

  const isConfirmed = loadPlan?.status === 'CONFIRMED';
  const busy = moveMutation.isPending || autoArrangeMutation.isPending;
  // Shares the page's job query; this observer only adds the poll while a draft plan is open.
  // It pauses during a drag or a pending move so the board doesn't shift under the pointer.
  useJobDetail(job.id, {
    refetchInterval: loadPlan && !isConfirmed && !dragging && !busy ? POLL_MS : false,
  });

  // A small move threshold keeps a plain click a click (select), so the keyboard path still works.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  if (!loadPlan) {
    const defaultVehicle = activeVehicles?.[0];
    const vehicleToUse = selectedVehicleId || defaultVehicle?.id;

    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-xl border border-line bg-card p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-ink-2">
            <Icon name="truck" size={26} />
          </div>

          <div className="flex flex-col gap-1.5">
            <h3 className="type-h3 text-ink">No load plan created yet</h3>
            <p className="type-body-s text-ink-3">
              Select an active vehicle to start load planning and stall arrangement for this job.
            </p>
          </div>

          {loadingVehicles ? (
            <Skeleton active title={false} paragraph={{ rows: 2 }} />
          ) : (
            <div className="flex w-full flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label htmlFor="load-plan-vehicle" className="type-label-s text-ink">
                  Assigned vehicle
                </label>
                <Select
                  id="load-plan-vehicle"
                  className="w-full"
                  placeholder="Choose a vehicle"
                  value={vehicleToUse || undefined}
                  onChange={setSelectedVehicleId}
                  options={activeVehicles?.map((v) => ({
                    value: v.id,
                    label: `${v.code} · ${v.kind} (${v.stalls?.length || v.stallCount || 0} stalls)`,
                  }))}
                />
              </div>

              <Button
                variant="primary"
                size="md"
                disabled={!vehicleToUse || createLoadPlanMutation.isPending}
                onClick={() => createLoadPlanMutation.mutate(vehicleToUse)}
              >
                {createLoadPlanMutation.isPending ? 'Creating load plan…' : 'Create load plan'}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const stalls = loadPlan.stalls ?? [];
  const unassigned = loadPlan.unassignedHorses ?? [];
  const conflicts = loadPlan.conflicts ?? [];
  const totalStalls = stalls.length;
  const occupiedStalls = stalls.filter((s) => s.horse !== null && s.horse !== undefined).length;
  const editable = !isConfirmed && !busy;

  /**
   * Drag and click both end here. The move carries what this screen shows (where the horse is,
   * who is in the target stall), so the server can refuse it if someone else changed the plan.
   */
  const moveHorse = ({ horse, fromStallId }: Picked, toStallId: string | null) => {
    setSelected(null);
    if (fromStallId === toStallId) return;
    const occupant = stalls.find((s) => s.stallId === toStallId)?.horse ?? null;
    moveMutation.mutate({
      horseId: horse.id,
      fromStallId,
      toStallId,
      expectedOccupantId: occupant?.id ?? null,
    });
  };

  const handleSelectHorse = (picked: Picked) => {
    if (!editable) return;
    setSelected(selected?.horse.id === picked.horse.id ? null : picked);
  };

  const handleStallClick = (stall: LoadPlanStall) => {
    if (!editable) return;
    if (selected) {
      if (selected.fromStallId === stall.stallId) setSelected(null);
      else moveHorse(selected, stall.stallId);
    } else if (stall.horse) {
      setSelected({ horse: stall.horse, fromStallId: stall.stallId });
    }
  };

  const stallLabel = (id: UniqueIdentifier) => {
    if (id === QUEUE_DROP_ID) return 'the to-load list';
    const stall = stalls.find((s) => s.stallId === id);
    return stall ? `stall ${stall.positionNo}` : 'a stall';
  };
  const pickedName = (data: unknown) => (data as Picked | undefined)?.horse.name ?? 'The horse';

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${pickedName(active.data.current)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${pickedName(active.data.current)} is over ${stallLabel(over.id)}.`
        : `${pickedName(active.data.current)} is not over a stall.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${pickedName(active.data.current)} was dropped on ${stallLabel(over.id)}.`
        : `${pickedName(active.data.current)} was dropped outside the stalls. Nothing changed.`,
    onDragCancel: ({ active }) => `Moving ${pickedName(active.data.current)} was cancelled.`,
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setSelected(null);
    setDragging(active.data.current as Picked);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    if (!over) return;
    moveHorse(active.data.current as Picked, over.id === QUEUE_DROP_ID ? null : String(over.id));
  };

  // Group stalls into rows (row 1, row 2, etc.)
  const rowsMap = new Map<number, LoadPlanStall[]>();
  stalls.forEach((s) => {
    const r = s.rowNo || 1;
    if (!rowsMap.has(r)) rowsMap.set(r, []);
    rowsMap.get(r)!.push(s);
  });
  const sortedRowKeys = Array.from(rowsMap.keys()).sort((a, b) => a - b);

  const payloadPct = Math.min(
    100,
    Math.round((loadPlan.totalWeightKg / (loadPlan.payloadKg || 1)) * 100),
  );

  const canConfirm = !isConfirmed && unassigned.length === 0 && conflicts.length === 0;

  return (
    <DndContext
      sensors={sensors}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Drag with a pointer, or press Enter to select this horse and then choose a stall.',
        },
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="flex flex-col gap-6">
        {/* Stat Tiles */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            tone="neutral"
            value={`${occupiedStalls}/${totalStalls}`}
            label="Positions filled"
          />
          <StatTile
            tone={conflicts.length > 0 ? 'bad' : 'ok'}
            value={String(conflicts.length)}
            label={conflicts.length === 1 ? 'Conflict' : 'Conflicts'}
          />
          <StatTile
            tone={unassigned.length > 0 ? 'warn' : 'neutral'}
            value={String(unassigned.length)}
            label={unassigned.length === 1 ? 'Horse to place' : 'Horses to place'}
          />
        </div>

        {/* Main Content: Left Queue + Right Plan */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left Column: Queue & Placement Rules */}
          <div className="flex flex-col gap-4 lg:col-span-4">
            <QueueColumn
              count={unassigned.length}
              unloading={dragging?.fromStallId ? dragging.horse : null}
              disabled={isConfirmed}
            >
              {unassigned.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line p-4 text-center">
                  <span className="type-body-s text-ink-3">All horses placed on vehicle</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {unassigned.map((h) => (
                    <QueueHorse
                      key={h.id}
                      horse={h}
                      selected={selected?.horse.id === h.id}
                      disabled={!editable}
                      onSelect={() => handleSelectHorse({ horse: h, fromStallId: null })}
                    />
                  ))}
                </div>
              )}
            </QueueColumn>

            {/* Placement rules card */}
            <Panel title="Placement rules" className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2.5">
                  <Icon name="box" size={16} className="text-stall-box shrink-0 mt-0.5" />
                  <span className="type-body-s text-ink-2">
                    Stallions and aggressive horses need a box stall.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Icon name="snowflake" size={16} className="text-stall-climate shrink-0 mt-0.5" />
                  <span className="type-body-s text-ink-2">
                    Heat-sensitive horses need the climate stall.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Icon name="alert" size={16} className="text-bad shrink-0 mt-0.5" />
                  <span className="type-body-s text-ink-2">
                    No stallion beside or behind a mare.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Icon name="info" size={16} className="text-info shrink-0 mt-0.5" />
                  <span className="type-body-s text-ink-2">
                    Keep nervous horses away from the ramp.
                  </span>
                </div>
              </div>
            </Panel>
          </div>

          {/* Right Column: Vehicle Stalls Diagram & Summary */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            {/* Vehicle Diagram */}
            <div className="flex flex-col gap-3 rounded-2xl border border-line-strong bg-sunken p-5">
              {/* Cab Bar */}
              <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icon name="truck" size={16} className="text-ink-2" />
                  <span className="type-chip text-ink-2">Cab · {loadPlan.vehicleCode}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-xs bg-stall-standard" />
                    <span className="type-caption text-ink-3">Standard</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-xs bg-stall-box" />
                    <span className="type-caption text-ink-3">Box</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-xs bg-stall-climate" />
                    <span className="type-caption text-ink-3">Climate</span>
                  </div>
                </div>
                <span className="type-chip text-ink-3">Front</span>
              </div>

              {/* Selection bar: the click and keyboard path */}
              {selected && (
                <div className="flex items-center gap-3 rounded-lg border border-gold bg-gold-soft px-3.5 py-2.5">
                  <span className="type-label-s flex-1 text-ink">
                    {selected.horse.name} selected. Choose a stall.
                  </span>
                  {selected.fromStallId && (
                    <Button variant="ghost" size="sm" onClick={() => moveHorse(selected, null)}>
                      Unload
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                    Cancel
                  </Button>
                </div>
              )}

              {/* A refused move is never silent: the server says what changed and what to do. */}
              {moveMutation.isError && (
                <Callout
                  tone="bad"
                  title="That move wasn’t saved"
                  action={
                    <Button variant="ghost" size="sm" onClick={() => moveMutation.reset()}>
                      Dismiss
                    </Button>
                  }
                >
                  {apiErrorMessage(
                    moveMutation.error,
                    'The move couldn’t be saved. Check the plan and try again.',
                  )}
                </Callout>
              )}

              {/* Stall Rows */}
              <div className="flex flex-col gap-4">
                {sortedRowKeys.map((rowKey) => {
                  const rowStalls = rowsMap.get(rowKey) ?? [];
                  // Sort by positionNo
                  rowStalls.sort((a, b) => a.positionNo - b.positionNo);

                  return (
                    <div key={rowKey} className="grid grid-cols-2 gap-4">
                      {rowStalls.map((s) => (
                        <StallSlot
                          key={s.stallId}
                          stall={s}
                          selected={selected}
                          dragging={dragging}
                          interactive={!isConfirmed}
                          disabled={!editable}
                          onClick={() => handleStallClick(s)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Rear Ramp */}
              <div className="flex items-center justify-center rounded-lg border border-dashed border-line-strong py-2.5">
                <span className="type-chip text-ink-3">Rear ramp</span>
              </div>
            </div>

            {/* Summary Panel */}
            <Panel title="Summary" className="p-6">
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Payload */}
                  <div className="flex flex-col gap-2">
                    <span className="type-body-s text-ink-3">Payload</span>
                    <span className="type-data text-ink">
                      {loadPlan.totalWeightKg.toLocaleString()} kg of{' '}
                      {loadPlan.payloadKg.toLocaleString()} kg
                    </span>
                    <Progress tone="neutral" value={payloadPct} label="Payload percentage" />
                  </div>

                  {/* Crew */}
                  <div className="flex flex-col gap-1.5">
                    <span className="type-body-s text-ink-3">Crew</span>
                    <span className="type-data text-ink">
                      {job.crew.length > 0
                        ? `${job.crew.filter((c) => c.crewRole === 'GROOM').length} grooms`
                        : 'Not assigned'}
                    </span>
                    <span className="type-body-s text-ink-2 truncate">
                      {job.crew.length > 0
                        ? job.crew.map((c) => `${c.name} (${c.crewRole.toLowerCase()})`).join(', ')
                        : 'Assign driver and grooms'}
                    </span>
                  </div>

                  {/* Clearance */}
                  <div className="flex flex-col gap-2">
                    <span className="type-body-s text-ink-3">Clearance</span>
                    <Chip tone={job.clearanceGateState === 'Clear' ? 'ok' : 'bad'}>
                      {job.clearanceGateState === 'Clear' ? 'Clear to depart' : 'Locked'}
                    </Chip>
                    <span className="type-body-s text-ink-3">
                      {job.clearanceGateState === 'Clear'
                        ? 'Dossier complete.'
                        : 'Departure stays locked until clearance is ready.'}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px w-full bg-line" />

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span className="type-body-s text-ink-3">
                    {isConfirmed
                      ? `Confirmed by ${loadPlan.confirmedByName || 'Coordinator'}`
                      : unassigned.length > 0 || conflicts.length > 0
                        ? `Place every horse and resolve ${conflicts.length} conflict(s) to confirm.`
                        : 'All horses placed with zero conflicts. Ready to confirm.'}
                  </span>

                  <div className="flex items-center gap-3">
                    {!isConfirmed && (
                      <>
                        <Button
                          variant="secondary"
                          size="md"
                          disabled={busy}
                          onClick={() => autoArrangeMutation.mutate()}
                        >
                          {autoArrangeMutation.isPending ? 'Arranging...' : 'Auto-arrange'}
                        </Button>
                        <Button
                          variant="primary"
                          size="md"
                          disabled={!canConfirm || busy || confirmMutation.isPending}
                          onClick={() => confirmMutation.mutate()}
                        >
                          {confirmMutation.isPending ? 'Confirming...' : 'Confirm load plan'}
                        </Button>
                      </>
                    )}
                    {isConfirmed && (
                      <Button
                        variant="primary"
                        size="md"
                        disabled={signOffMutation.isPending}
                        onClick={() => signOffMutation.mutate()}
                      >
                        {signOffMutation.isPending ? 'Signing off...' : 'Sign off trip plan'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {/* What follows the pointer: a compact card beside the cursor, so the stall under it
          keeps showing its drop hint. */}
      <DragOverlay dropAnimation={null} modifiers={[besideCursor]}>
        {dragging && (
          <div className="w-64">
            <LoadItem
              horse={dragging.horse.name}
              meta={horseMeta(dragging.horse)}
              tag={temperamentChip(dragging.horse)}
              selected
              tabIndex={-1}
              aria-hidden
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
