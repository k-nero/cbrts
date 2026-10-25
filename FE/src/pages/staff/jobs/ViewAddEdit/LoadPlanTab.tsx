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
import { App, Col, Divider, Flex, Row, Select, Skeleton } from 'antd';

import { horseMeta, QUEUE_DROP_ID, temperamentChip } from './loadPlan';
import { QueueColumn } from './QueueColumn';
import { QueueHorse } from './QueueHorse';
import { BiosecurityWarnings } from './BiosecurityWarnings';
import { StallLegend } from './StallLegend';
import { TrailerDiagram } from './TrailerDiagram';
import { TripJobsPanel } from './TripJobsPanel';

import { Button, Callout, Chip, Icon, LoadItem, Panel, Progress, StatTile } from '@/components/ui';
import {
  useAddTrailer,
  useAutoArrange,
  useConfirmLoadPlan,
  useCreateLoadPlan,
  useJobDetail,
  useMoveHorse,
  useRemoveTrailer,
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
  const [trailerToAdd, setTrailerToAdd] = useState<string>();

  const { data: activeVehicles, isLoading: loadingVehicles } = useActiveVehicles();
  const createLoadPlanMutation = useCreateLoadPlan(job.id);
  const moveMutation = useMoveHorse(job.id);
  const autoArrangeMutation = useAutoArrange(job.id);
  const confirmMutation = useConfirmLoadPlan(job.id);
  const signOffMutation = useSignOffTripPlan(job.id);
  const addTrailerMutation = useAddTrailer(job.id);
  const removeTrailerMutation = useRemoveTrailer(job.id);

  const isConfirmed = loadPlan?.status === 'CONFIRMED';
  const busy = moveMutation.isPending || autoArrangeMutation.isPending;
  // A refused plan action (a role without the permission, say) is never silent.
  const { message } = App.useApp();
  const reportRefusal = (fallback: string) => (error: unknown) =>
    message.error(apiErrorMessage(error, fallback));
  // Shares the page's job query; this observer only adds the poll while a draft plan is open.
  // It pauses during a drag or a pending move so the board doesn't shift under the pointer.
  useJobDetail(job.id, {
    refetchInterval: loadPlan && !isConfirmed && !dragging && !busy ? POLL_MS : false,
  });

  // A small move threshold keeps a plain click a click (select), so the keyboard path still works.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // A trip of the journey that only flies (US-F3-16) has its flight as its carrier: no trailer to
  // load. Each job's stall positions are its consignment on the flight, on the Route tab.
  const legs = job.routePlan?.legs ?? [];
  const onlyFlies = legs.length > 0 && legs.every((leg) => leg.mode === 'AIR');
  if (onlyFlies) {
    const flights = legs.flatMap((leg) => (leg.flight ? [leg.flight] : []));
    const flightCrew = job.crew.filter((c) => c.onFlight);
    return (
      <Flex vertical gap={24}>
        <TripJobsPanel job={job} />
        <Panel title="This trip flies" className="p-4">
          <Flex vertical gap={16}>
            <p className="type-body-m m-0 text-ink-2">
              The flight is this trip’s carrier, so it has no trailer to load:{' '}
              {flights.map((f) => `${f.airline} ${f.flightNo}`).join(', ') || 'flight not set yet'}.
              Each job’s stall positions and air waybill are its consignment, on the Route tab.
            </p>
            <span className="type-body-s text-ink-3">
              Flight crew:{' '}
              {flightCrew.length > 0
                ? flightCrew
                    .map((c) => `${c.name} (${c.crewRole.toLowerCase().replace('_', ' ')})`)
                    .join(', ')
                : 'none assigned yet'}
            </span>
            <div>
              <Button
                variant="primary"
                size="md"
                disabled={signOffMutation.isPending}
                onClick={() =>
                  signOffMutation.mutate(undefined, {
                    onError: reportRefusal('The trip plan couldn’t be signed off. Try again.'),
                  })
                }
              >
                {signOffMutation.isPending ? 'Signing off...' : 'Sign off trip plan'}
              </Button>
            </div>
          </Flex>
        </Panel>
      </Flex>
    );
  }

  if (!loadPlan) {
    const defaultVehicle = activeVehicles?.[0];
    const vehicleToUse = selectedVehicleId || defaultVehicle?.id;

    return (
      <Flex vertical gap={24}>
        <TripJobsPanel job={job} />
        <div className="p-12">
          <Flex vertical align="center" justify="center">
            <div className="p-8 w-full max-w-md rounded-xl border border-line bg-card text-center">
              <Flex vertical gap={20} align="center">
                <Flex
                  align="center"
                  justify="center"
                  className="size-14 rounded-full bg-muted text-ink-2"
                >
                  <Icon name="truck" size={26} />
                </Flex>

                <Flex vertical gap={6}>
                  <h3 className="type-h3 text-ink">No load plan created yet</h3>
                  <p className="type-body-s text-ink-3">
                    Select an active vehicle to start load planning and stall arrangement for this
                    job.
                  </p>
                </Flex>

                {loadingVehicles ? (
                  <Skeleton active title={false} paragraph={{ rows: 2 }} />
                ) : (
                  <Flex vertical gap={16} className="w-full">
                    <Flex vertical gap={6} className="text-left">
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
                    </Flex>

                    <Button
                      variant="primary"
                      size="md"
                      disabled={!vehicleToUse || createLoadPlanMutation.isPending}
                      onClick={() => createLoadPlanMutation.mutate(vehicleToUse)}
                    >
                      {createLoadPlanMutation.isPending
                        ? 'Creating load plan…'
                        : 'Create load plan'}
                    </Button>
                  </Flex>
                )}
              </Flex>
            </div>
          </Flex>
        </div>
      </Flex>
    );
  }

  const trailers = loadPlan.vehicles ?? [];
  const convoy = trailers.length > 1;
  const stalls = trailers.flatMap((t) => t.stalls);
  const unassigned = loadPlan.unassignedHorses ?? [];
  const conflicts = loadPlan.conflicts ?? [];
  const warnings = loadPlan.warnings ?? [];
  const warningsToAccept = warnings.filter((w) => !w.accepted);
  const totalStalls = stalls.length;
  const occupiedStalls = stalls.filter((s) => s.horse !== null && s.horse !== undefined).length;
  const editable = !isConfirmed && !busy;
  // Trailers are added or taken out before departure only; after it, only through an incident.
  const canChangeTrailers = job.tripStatus === 'NOT_STARTED';
  const onTrip = new Set(trailers.map((t) => t.vehicleId));
  const spareVehicles = (activeVehicles ?? []).filter((v) => !onTrip.has(v.id));
  const trailerOf = (stallId: string) =>
    trailers.find((t) => t.stalls.some((s) => s.stallId === stallId));

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
    if (!stall) return 'a stall';
    return convoy
      ? `stall ${stall.positionNo} of ${trailerOf(stall.stallId)?.vehicleCode ?? 'the trailer'}`
      : `stall ${stall.positionNo}`;
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
      <Flex vertical gap={24}>
        {/* The jobs sharing this trip (US-F3-11) */}
        <TripJobsPanel job={job} />

        {/* Stat Tiles */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <StatTile
              className="h-full"
              tone="neutral"
              value={`${occupiedStalls}/${totalStalls}`}
              label="Positions filled"
            />
          </Col>
          <Col xs={24} sm={8}>
            <StatTile
              className="h-full"
              tone={conflicts.length > 0 ? 'bad' : 'ok'}
              value={String(conflicts.length)}
              label={conflicts.length === 1 ? 'Conflict' : 'Conflicts'}
            />
          </Col>
          <Col xs={24} sm={8}>
            <StatTile
              className="h-full"
              tone={unassigned.length > 0 ? 'warn' : 'neutral'}
              value={String(unassigned.length)}
              label={unassigned.length === 1 ? 'Horse to place' : 'Horses to place'}
            />
          </Col>
        </Row>

        {/* Main Content: Left Queue + Right Plan */}
        <Row gutter={[24, 24]} align="top">
          {/* Left Column: Queue & Placement Rules */}
          <Col xs={24} lg={8}>
            <Flex vertical gap={16}>
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
                  <Flex vertical gap={8}>
                    {unassigned.map((h) => (
                      <QueueHorse
                        key={h.id}
                        horse={h}
                        selected={selected?.horse.id === h.id}
                        disabled={!editable}
                        onSelect={() => handleSelectHorse({ horse: h, fromStallId: null })}
                      />
                    ))}
                  </Flex>
                )}
              </QueueColumn>

              {/* Placement rules card */}
              <Panel title="Placement rules" className="p-4">
                <Flex vertical gap={12}>
                  <Flex gap={10} align="start">
                    <Icon name="box" size={16} className="text-stall-box shrink-0 mt-0.5" />
                    <span className="type-body-s text-ink-2">
                      Stallions and aggressive horses need a box stall.
                    </span>
                  </Flex>
                  <Flex gap={10} align="start">
                    <Icon
                      name="snowflake"
                      size={16}
                      className="text-stall-climate shrink-0 mt-0.5"
                    />
                    <span className="type-body-s text-ink-2">
                      Heat-sensitive horses need the climate stall.
                    </span>
                  </Flex>
                  <Flex gap={10} align="start">
                    <Icon name="alert" size={16} className="text-bad shrink-0 mt-0.5" />
                    <span className="type-body-s text-ink-2">
                      No stallion beside or behind a mare.
                    </span>
                  </Flex>
                  <Flex gap={10} align="start">
                    <Icon name="info" size={16} className="text-info shrink-0 mt-0.5" />
                    <span className="type-body-s text-ink-2">
                      Keep nervous horses away from the ramp.
                    </span>
                  </Flex>
                </Flex>
              </Panel>
            </Flex>
          </Col>

          {/* Right Column: Vehicle Stalls Diagram & Summary */}
          <Col xs={24} lg={16}>
            <Flex vertical gap={24}>
              {/* Trailers: one diagram per trailer of the trip (US-F3-10) */}
              <Flex vertical gap={12}>
                {canChangeTrailers && (
                  <Flex wrap gap={12} align="center" justify="space-between">
                    <span className="type-body-s text-ink-3">
                      {convoy
                        ? `${trailers.length} trailers travel together on ${loadPlan.tripCode}.`
                        : `One trailer on ${loadPlan.tripCode}.`}{' '}
                      Adding or removing a trailer reopens the route and load plan and needs a new
                      sign-off.
                    </span>
                    <Flex gap={8} align="center">
                      <Select
                        aria-label="Trailer to add"
                        className="w-56"
                        placeholder={
                          spareVehicles.length === 0 ? 'No other active vehicle' : 'Add a trailer'
                        }
                        value={trailerToAdd}
                        onChange={setTrailerToAdd}
                        disabled={spareVehicles.length === 0}
                        options={spareVehicles.map((v) => ({
                          value: v.id,
                          label: `${v.code} · ${v.kind} (${v.stalls?.length || v.stallCount || 0} stalls)`,
                        }))}
                      />
                      <Button
                        variant="secondary"
                        size="md"
                        disabled={!trailerToAdd || addTrailerMutation.isPending}
                        onClick={() =>
                          trailerToAdd &&
                          addTrailerMutation.mutate(trailerToAdd, {
                            onSuccess: () => setTrailerToAdd(undefined),
                            onError: reportRefusal('The trailer couldn’t be added. Try again.'),
                          })
                        }
                      >
                        {addTrailerMutation.isPending ? 'Adding…' : 'Add trailer'}
                      </Button>
                    </Flex>
                  </Flex>
                )}

                {/* Selection bar: the click and keyboard path */}
                {selected && (
                  <div className="px-3.5 py-2.5 rounded-lg border border-gold bg-gold-soft">
                    <Flex gap={12} align="center">
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
                    </Flex>
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

                {/* Horses of different jobs on one trailer (US-F3-12): warned, accepted at confirmation. */}
                <BiosecurityWarnings warnings={warnings} />

                {convoy && (
                  <Flex justify="end">
                    <StallLegend />
                  </Flex>
                )}

                {trailers.map((trailer) => (
                  <TrailerDiagram
                    key={trailer.tripVehicleId}
                    plan={trailer}
                    convoy={convoy}
                    selected={selected}
                    dragging={dragging}
                    interactive={!isConfirmed}
                    disabled={!editable}
                    onStallClick={handleStallClick}
                    removing={
                      removeTrailerMutation.isPending &&
                      removeTrailerMutation.variables === trailer.tripVehicleId
                    }
                    onRemove={
                      convoy && canChangeTrailers
                        ? () =>
                            removeTrailerMutation.mutate(trailer.tripVehicleId, {
                              onError: reportRefusal(
                                'The trailer couldn’t be taken out. Try again.',
                              ),
                            })
                        : undefined
                    }
                  />
                ))}
              </Flex>

              {/* Summary Panel */}
              <Panel title="Summary" className="p-6">
                <Flex vertical gap={24}>
                  <Row gutter={[24, 24]}>
                    {/* Payload */}
                    <Col xs={24} md={8}>
                      <Flex vertical gap={8}>
                        <span className="type-body-s text-ink-3">Payload</span>
                        <span className="type-data text-ink">
                          {loadPlan.totalWeightKg.toLocaleString()} kg of{' '}
                          {loadPlan.payloadKg.toLocaleString()} kg
                        </span>
                        <Progress tone="neutral" value={payloadPct} label="Payload percentage" />
                      </Flex>
                    </Col>

                    {/* Crew */}
                    <Col xs={24} md={8}>
                      <Flex vertical gap={6}>
                        <span className="type-body-s text-ink-3">Crew</span>
                        <span className="type-data text-ink">
                          {job.crew.length > 0
                            ? `${job.crew.filter((c) => c.crewRole === 'GROOM').length} grooms`
                            : 'Not assigned'}
                        </span>
                        {job.crew.length === 0 ? (
                          <span className="type-body-s text-ink-2 truncate">
                            {convoy
                              ? 'Assign a driver and grooms to each trailer'
                              : 'Assign driver and grooms'}
                          </span>
                        ) : (
                          <>
                            {trailers.map((t) => {
                              const onTrailer = job.crew.filter(
                                (c) => c.tripVehicleId === t.tripVehicleId,
                              );
                              return (
                                <span
                                  key={t.tripVehicleId}
                                  className="type-body-s text-ink-2 truncate"
                                >
                                  {convoy && `${t.vehicleCode}: `}
                                  {onTrailer.length > 0
                                    ? onTrailer
                                        .map((c) => `${c.name} (${c.crewRole.toLowerCase()})`)
                                        .join(', ')
                                    : 'No crew yet'}
                                </span>
                              );
                            })}
                            {job.crew.some((c) => c.onFlight) && (
                              <span className="type-body-s text-ink-2 truncate">
                                Flight:{' '}
                                {job.crew
                                  .filter((c) => c.onFlight)
                                  .map(
                                    (c) =>
                                      `${c.name} (${c.crewRole.toLowerCase().replace('_', ' ')})`,
                                  )
                                  .join(', ')}
                              </span>
                            )}
                          </>
                        )}
                      </Flex>
                    </Col>

                    {/* Clearance */}
                    <Col xs={24} md={8}>
                      <Flex vertical gap={8}>
                        <span className="type-body-s text-ink-3">Clearance</span>
                        <Chip tone={job.clearanceGateState === 'Clear' ? 'ok' : 'bad'}>
                          {job.clearanceGateState === 'Clear' ? 'Clear to depart' : 'Locked'}
                        </Chip>
                        <span className="type-body-s text-ink-3">
                          {job.clearanceGateState === 'Clear'
                            ? 'Dossier complete.'
                            : 'Departure stays locked until clearance is ready.'}
                        </span>
                      </Flex>
                    </Col>
                  </Row>

                  {/* Divider */}
                  <Divider className="m-0!" />

                  {/* Footer Actions */}
                  <Flex wrap gap={16} align="center" justify="space-between">
                    <span className="type-body-s text-ink-3">
                      {isConfirmed
                        ? `Confirmed by ${loadPlan.confirmedByName || 'Coordinator'}`
                        : unassigned.length > 0 || conflicts.length > 0
                          ? `Place every horse and resolve ${conflicts.length} conflict(s) to confirm.`
                          : 'All horses placed with zero conflicts. Ready to confirm.'}
                    </span>

                    <Flex gap={12} align="center">
                      {!isConfirmed && (
                        <>
                          <Button
                            variant="secondary"
                            size="md"
                            disabled={busy}
                            onClick={() =>
                              autoArrangeMutation.mutate(undefined, {
                                onError: reportRefusal(
                                  'The plan couldn’t be auto-arranged. Try again.',
                                ),
                              })
                            }
                          >
                            {autoArrangeMutation.isPending ? 'Arranging...' : 'Auto-arrange'}
                          </Button>
                          <Button
                            variant="primary"
                            size="md"
                            disabled={!canConfirm || busy || confirmMutation.isPending}
                            onClick={() =>
                              confirmMutation.mutate(
                                warnings.map((w) => w.key),
                                {
                                  onError: reportRefusal(
                                    'The load plan couldn’t be confirmed. Try again.',
                                  ),
                                },
                              )
                            }
                          >
                            {confirmMutation.isPending
                              ? 'Confirming...'
                              : warningsToAccept.length > 0
                                ? 'Accept warnings and confirm'
                                : 'Confirm load plan'}
                          </Button>
                        </>
                      )}
                      {isConfirmed && (
                        <Button
                          variant="primary"
                          size="md"
                          disabled={signOffMutation.isPending}
                          onClick={() =>
                            signOffMutation.mutate(undefined, {
                              onError: reportRefusal(
                                'The trip plan couldn’t be signed off. Try again.',
                              ),
                            })
                          }
                        >
                          {signOffMutation.isPending ? 'Signing off...' : 'Sign off trip plan'}
                        </Button>
                      )}
                    </Flex>
                  </Flex>
                </Flex>
              </Panel>
            </Flex>
          </Col>
        </Row>
      </Flex>

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
