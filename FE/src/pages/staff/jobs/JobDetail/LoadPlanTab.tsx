import { useState } from 'react';

import {
  Button,
  Chip,
  Icon,
  LoadItem,
  Panel,
  Progress,
  StallTile,
  StatTile,
} from '@/components/ui';
import {
  useAssignStall,
  useAutoArrange,
  useChangeLoadPlanVehicle,
  useConfirmLoadPlan,
  useCreateLoadPlan,
  useSignOffTripPlan,
} from '@/hooks/useJob';
import { useActiveVehicles } from '@/hooks/useVehicle';
import type { JobDetail, JobHorse, LoadPlanStall } from '@/interfaces';

interface Props {
  job: JobDetail;
}

export function LoadPlanTab({ job }: Props) {
  const loadPlan = job.loadPlan;
  const [selectedHorse, setSelectedHorse] = useState<JobHorse | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const { data: activeVehicles, isLoading: loadingVehicles } = useActiveVehicles();
  const createLoadPlanMutation = useCreateLoadPlan(job.id);
  const changeVehicleMutation = useChangeLoadPlanVehicle(job.id);
  const assignStallMutation = useAssignStall(job.id);
  const autoArrangeMutation = useAutoArrange(job.id);
  const confirmMutation = useConfirmLoadPlan(job.id);
  const signOffMutation = useSignOffTripPlan(job.id);

  if (!loadPlan) {
    const defaultVehicle = activeVehicles?.[0];
    const vehicleToUse = selectedVehicleId || defaultVehicle?.id;

    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-line bg-card p-8 text-center shadow-xs">
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
            <span className="type-body-s text-ink-3">Loading fleet vehicles...</span>
          ) : (
            <div className="flex w-full flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="type-label-s text-ink">Assigned vehicle</label>
                <select
                  value={vehicleToUse || ''}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="focus-ring h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none"
                >
                  {activeVehicles?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.code} · {v.kind} ({v.stalls?.length || v.stallCount || 0} stalls)
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="primary"
                size="md"
                disabled={!vehicleToUse || createLoadPlanMutation.isPending}
                onClick={() => createLoadPlanMutation.mutate(vehicleToUse)}
              >
                {createLoadPlanMutation.isPending ? 'Creating load plan...' : 'Create load plan'}
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
  const isConfirmed = loadPlan.status === 'CONFIRMED';

  const handleSelectHorse = (horse: JobHorse) => {
    if (isConfirmed) return;
    if (selectedHorse?.id === horse.id) {
      setSelectedHorse(null);
    } else {
      setSelectedHorse(horse);
    }
  };

  const handleStallClick = (stall: LoadPlanStall) => {
    if (isConfirmed) return;
    if (selectedHorse) {
      // Place selected horse here
      assignStallMutation.mutate({
        vehicleStallId: stall.stallId,
        horseId: selectedHorse.id,
      });
      setSelectedHorse(null);
    } else if (stall.horse) {
      // Unload horse from stall
      assignStallMutation.mutate({
        vehicleStallId: stall.stallId,
        horseId: null,
      });
    }
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
          <div className="flex flex-col gap-3">
            <span className="type-label-s text-ink-2">To load · {unassigned.length}</span>
            {unassigned.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line p-4 text-center">
                <span className="type-body-s text-ink-3">All horses placed on vehicle</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {unassigned.map((h) => (
                  <LoadItem
                    key={h.id}
                    horse={h.name}
                    meta={`${h.sex || ''} · ${h.weightKg ? h.weightKg + ' kg' : ''} · ${h.breed || ''}`}
                    selected={selectedHorse?.id === h.id}
                    onClick={() => handleSelectHorse(h)}
                    tag={
                      h.temperament ? (
                        <Chip
                          tone={
                            h.temperament === 'AGGRESSIVE'
                              ? 'bad'
                              : h.temperament === 'NERVOUS'
                                ? 'warn'
                                : 'ok'
                          }
                        >
                          {h.temperament}
                        </Chip>
                      ) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>

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
                <span className="type-body-s text-ink-2">No stallion beside or behind a mare.</span>
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

            {/* Selection Notification Bar */}
            {selectedHorse && (
              <div className="flex items-center justify-between rounded-lg border border-gold bg-gold-soft px-4 py-2.5">
                <span className="type-label-s text-gold-ink">
                  {selectedHorse.name} selected. Choose a stall to place.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedHorse(null)}
                  className="type-label-s text-gold-ink hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Stall Rows */}
            <div className="flex flex-col gap-4">
              {sortedRowKeys.map((rowKey) => {
                const rowStalls = rowsMap.get(rowKey) ?? [];
                // Sort by positionNo
                rowStalls.sort((a, b) => a.positionNo - b.positionNo);

                return (
                  <div key={rowKey} className="grid grid-cols-2 gap-4">
                    {rowStalls.map((s) => {
                      const type = s.stallType.toLowerCase() as 'standard' | 'box' | 'climate';
                      let state: 'empty' | 'occupied' | 'conflict' | 'target' = 'empty';
                      if (s.issue) {
                        state = 'conflict';
                      } else if (s.horse) {
                        state = 'occupied';
                      } else if (selectedHorse) {
                        state = 'target';
                      }

                      return (
                        <StallTile
                          key={s.stallId}
                          type={type}
                          state={state}
                          stall={`Stall ${s.positionNo}`}
                          horse={s.horse?.name}
                          meta={
                            s.horse
                              ? `${s.horse.sex} · ${s.horse.weightKg} kg · ${s.horse.temperament}`
                              : undefined
                          }
                          issue={s.issue}
                          targetHint={
                            selectedHorse ? `Place ${selectedHorse.name} here` : undefined
                          }
                          onClick={() => handleStallClick(s)}
                        />
                      );
                    })}
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
                        disabled={autoArrangeMutation.isPending}
                        onClick={() => autoArrangeMutation.mutate()}
                      >
                        {autoArrangeMutation.isPending ? 'Arranging...' : 'Auto-arrange'}
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        disabled={!canConfirm || confirmMutation.isPending}
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
  );
}
