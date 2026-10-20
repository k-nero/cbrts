import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { ConfigProvider, Input, message, Select, Spin } from 'antd';
import type { useMe } from '@/hooks/auth';
import { useMe as useMeQuery } from '@/hooks/auth';
import { useTrip, useTripRecord, useTrips } from '@/hooks/trip';
import type { TripRecordKind, TripSummary, TripView } from '@/interfaces';
import { TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import type { TripStop } from '@/interfaces/trip';
import { apiErrorMessage } from '@/lib/utils';
import { Button, Callout, Checkbox, Chip, OptionCard, Panel } from '@/components/ui';
import { themeAntd } from '@/config/themeConfig';
import { CabHeader, CabRoute, ConditionRows } from './TripCabParts';
import type { Observation } from './TripCabParts';
import { TripRecords } from './TripRecords';
import {
  coordinatorKindsByStatus,
  datetimeLocal,
  elapsedLabel,
  eventLabels,
  formatClock,
  formatTime,
  lastConditionRecord,
  lastRecord,
  sentence,
  stopKindLabel,
  escortEventsByStop,
} from './trip-utils';

type EscortCabProps = {
  now: number;
  trip?: TripView;
  summaries: TripSummary[];
  meQuery: ReturnType<typeof useMeQuery>;
  selectedCode: string;
  setCode: (value: string) => void;
  setStopId: (value: string | undefined) => void;
  logout: () => void;
  mutation: ReturnType<typeof useTripRecord>;
  isOnline: boolean;
  summariesQuery: ReturnType<typeof useTrips>;
  detailQuery: ReturnType<typeof useTrip>;
  page: number;
  pageChange: (page: number) => void;
  tripPicker: ReactNode;
  activeStop?: TripStop;
  selectedStop?: TripStop;
  nextStop?: TripStop;
  taskMode: 'checkpoint' | 'condition' | 'delivery' | 'held' | 'handover' | 'complete';
  kind: TripRecordKind;
  setKind: Dispatch<SetStateAction<TripRecordKind>>;
  occurredAt: string;
  setRecordTime: (value: string) => void;
  text: string;
  setText: Dispatch<SetStateAction<string>>;
  documentsShown: string[];
  setDocumentsShown: Dispatch<SetStateAction<string[]>>;
  receiverName: string;
  setReceiverName: Dispatch<SetStateAction<string>>;
  showConditionForm: boolean;
  setShowConditionForm: Dispatch<SetStateAction<boolean>>;
  conditionByHorse: Record<string, Observation>;
  updateObservation: (horseId: string, update: Partial<Observation>) => void;
  applyAllStable: () => void;
  conditionLog?: TripView['records'][number];
  chosenHorseCount: number;
  allHorsesChecked: boolean;
  saveCheckpoint: () => Promise<void>;
  saveConditions: () => Promise<void>;
  saveHandover: () => Promise<void>;
  saveStopDeparture: () => Promise<void>;
  contextHolder: ReactNode;
};

export function EscortCab(props: EscortCabProps) {
  const {
    now,
    trip,
    summaries,
    meQuery,
    selectedCode,
    setCode,
    setStopId,
    logout,
    mutation,
    isOnline,
    summariesQuery,
    detailQuery,
    page,
    pageChange,
    tripPicker,
    activeStop,
    selectedStop,
    nextStop,
    taskMode,
    kind,
    setKind,
    occurredAt,
    setRecordTime,
    text,
    setText,
    documentsShown,
    setDocumentsShown,
    receiverName,
    setReceiverName,
    showConditionForm,
    setShowConditionForm,
    conditionByHorse,
    updateObservation,
    applyAllStable,
    conditionLog,
    chosenHorseCount,
    allHorsesChecked,
    saveCheckpoint,
    saveConditions,
    saveHandover,
    saveStopDeparture,
    contextHolder,
  } = props;

  const currentLog = trip ? lastRecord(trip) : undefined;
  const heldRecord = trip
    ? [...trip.records]
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .find((record) => record.kind === TripRecordKindEnum.HELD)
    : undefined;
  const loadedRecord = trip?.records.find(
    (record) =>
      record.kind === TripRecordKindEnum.LOADED || record.kind === TripRecordKindEnum.DEPARTED,
  );
  const trailerElapsedMinutes = loadedRecord
    ? Math.max(0, Math.floor((now - new Date(loadedRecord.occurredAt).getTime()) / 60_000))
    : null;
  const restDueAt = loadedRecord
    ? new Date(new Date(loadedRecord.occurredAt).getTime() + 6 * 60 * 60_000)
    : null;
  const hoursOnTrailer =
    trailerElapsedMinutes === null
      ? null
      : `${Math.floor(trailerElapsedMinutes / 60)} h${trailerElapsedMinutes % 60 ? ` ${trailerElapsedMinutes % 60} min` : ''}`;
  const eventOptions = (
    escortEventsByStop[selectedStop?.kind ?? ''] ?? [
      TripRecordKindEnum.ARRIVED_AT_STOP,
      TripRecordKindEnum.LEFT_STOP,
      TripRecordKindEnum.HELD,
      TripRecordKindEnum.NOTE,
    ]
  )
    .filter(
      (event) => trip !== undefined && coordinatorKindsByStatus[trip.tripStatus].includes(event),
    )
    .filter(
      (event) =>
        (event !== TripRecordKindEnum.DEPARTED && event !== TripRecordKindEnum.FLIGHT_DEPARTED) ||
        trip?.clearanceReady === true,
    );
  const departureLocked =
    (kind === TripRecordKindEnum.DEPARTED || kind === TripRecordKindEnum.FLIGHT_DEPARTED) &&
    !trip?.clearanceReady;
  const canDeliver = Boolean(
    conditionLog && conditionLog.routeStopId === selectedStop?.id && chosenHorseCount === 0,
  );

  return (
    <ConfigProvider theme={themeAntd.light}>
      <main className="min-h-screen bg-canvas text-ink">
        {contextHolder}
        <CabHeader
          trip={trip}
          trips={summaries}
          me={meQuery.data}
          selectedCode={selectedCode}
          onTripChange={(value) => {
            setCode(value);
            setStopId(undefined);
          }}
          onLogout={logout}
          saving={mutation.isPending}
          isOnline={isOnline}
        />
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-5 py-5 pb-32 lg:px-8 lg:py-6">
          {summariesQuery.isPending && (
            <div className="py-12 text-center">
              <Spin size="large" />
            </div>
          )}
          {summariesQuery.isError && (
            <Callout tone="bad" title="The assigned trips could not be loaded">
              {apiErrorMessage(summariesQuery.error, 'Refresh the page to try again.')}
            </Callout>
          )}
          {summariesQuery.data?.totalPages === 0 && (
            <Panel>
              <p className="type-body-s m-0 text-ink-2">
                No assigned trips are available for this account yet.
              </p>
            </Panel>
          )}
          {trip && (
            <>
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
              <CabRoute
                trip={trip}
                activeStopId={taskMode === 'complete' ? undefined : activeStop?.id}
              />
              {detailQuery.isPending && (
                <div className="py-6 text-center">
                  <Spin />
                </div>
              )}
              {detailQuery.isError && (
                <Callout tone="bad" title="This trip could not be loaded">
                  {apiErrorMessage(detailQuery.error, 'Refresh the page to try again.')}
                </Callout>
              )}
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
                <Panel
                  title={
                    taskMode === 'condition'
                      ? 'Condition of each horse'
                      : taskMode === 'delivery'
                        ? 'Record arrival condition'
                        : taskMode === 'handover'
                          ? 'Hand over the horses'
                          : taskMode === 'complete'
                            ? 'Handover recorded'
                            : taskMode === 'held'
                              ? 'Trip held'
                              : 'Record this checkpoint'
                  }
                  extra={
                    selectedStop ? (
                      <Chip tone={trip.tripStatus === TripStatusEnum.HELD ? 'bad' : 'info'}>
                        {selectedStop.name}
                      </Chip>
                    ) : undefined
                  }
                  flush
                >
                  {taskMode === 'checkpoint' && (
                    <>
                      {!trip.clearanceReady && (
                        <div className="px-6 pt-5">
                          <Callout tone="bad" title="Departure locked">
                            Departure can be recorded once the transport specialist clears the
                            dossier.
                          </Callout>
                        </div>
                      )}
                      <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
                        <label className="type-body-s flex flex-col gap-2 text-ink-2">
                          Checkpoint
                          <Select
                            size="large"
                            value={selectedStop?.id}
                            onChange={(value) => setStopId(value)}
                            options={trip.stops.map((stop) => ({
                              value: stop.id,
                              label: `${stop.name} · ${stopKindLabel(stop.kind)}`,
                            }))}
                          />
                        </label>
                        {selectedStop?.kind === 'BORDER' ? (
                          <div className="flex flex-col gap-2 text-ink-2">
                            <span className="type-body-s">Outcome</span>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {[
                                {
                                  kind: TripRecordKindEnum.CLEARED_BORDER,
                                  description:
                                    'Record customs clearance and continue to the next checkpoint.',
                                  icon: 'check' as const,
                                },
                                {
                                  kind: TripRecordKindEnum.HELD,
                                  description:
                                    'Stop the trip here and record why the horses must wait.',
                                  icon: 'alert' as const,
                                },
                              ]
                                .filter((option) => eventOptions.includes(option.kind))
                                .map((option) => (
                                  <OptionCard
                                    key={option.kind}
                                    selected={kind === option.kind}
                                    title={eventLabels[option.kind]}
                                    description={option.description}
                                    icon={option.icon}
                                    className="min-h-32"
                                    onChange={(selected) => selected && setKind(option.kind)}
                                  />
                                ))}
                            </div>
                          </div>
                        ) : (
                          <label className="type-body-s flex flex-col gap-2 text-ink-2">
                            Checkpoint status
                            <Select
                              size="large"
                              value={kind}
                              onChange={setKind}
                              options={eventOptions.map((value) => ({
                                value,
                                label: eventLabels[value],
                              }))}
                            />
                          </label>
                        )}
                        {selectedStop?.kind === 'BORDER' &&
                          selectedStop.borderDocuments.length > 0 && (
                            <fieldset className="flex flex-col gap-3 border-0 p-0 md:col-span-2">
                              <legend className="type-body-s mb-2 text-ink-2">
                                Documents shown at this border
                              </legend>
                              <div className="grid gap-2 md:grid-cols-2">
                                {selectedStop.borderDocuments.map((document) => (
                                  <div
                                    key={document.id}
                                    className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-line bg-raised px-4 py-3"
                                  >
                                    <Checkbox
                                      checked={documentsShown.includes(document.id)}
                                      disabled={mutation.isPending}
                                      onChange={(event) =>
                                        setDocumentsShown((current) =>
                                          event.target.checked
                                            ? [...current, document.id]
                                            : current.filter((id) => id !== document.id),
                                        )
                                      }
                                      label={document.label}
                                    />
                                    <span className="type-label-s shrink-0 text-ink-3">
                                      {document.readyToShow
                                        ? 'Ready to show'
                                        : `${sentence(document.status)} · ${sentence(document.validity ?? 'unknown')}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </fieldset>
                          )}
                        <label className="type-body-s flex flex-col gap-2 text-ink-2">
                          Recorded time
                          <input
                            type="datetime-local"
                            value={occurredAt}
                            onChange={(event) => setRecordTime(event.target.value)}
                            className="h-12 rounded-md border border-line-strong bg-input px-3 type-data text-ink"
                          />
                        </label>
                        <label className="type-body-s flex flex-col gap-2 text-ink-2">
                          Update note
                          <Input
                            size="large"
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            maxLength={500}
                            placeholder={
                              kind === TripRecordKindEnum.HELD
                                ? 'Explain why the trip is held'
                                : 'What happened at this checkpoint?'
                            }
                          />
                        </label>
                        {kind === TripRecordKindEnum.HELD && (
                          <div className="md:col-span-2">
                            <Callout tone="bad" title="This records a hold">
                              The update will appear in the journey log. Include the reason and the
                              exact place so operations can respond.
                            </Callout>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {(taskMode === 'condition' || taskMode === 'delivery' || taskMode === 'held') && (
                    <>
                      {taskMode === 'held' && (
                        <div className="space-y-4 px-6 pt-5">
                          <Callout
                            tone="bad"
                            title={`Held${selectedStop ? ` at ${selectedStop.name}` : ''}`}
                          >
                            {heldRecord?.text ??
                              'The trip is held. Keep the horses safe and wait for the coordinator’s decision before continuing.'}
                          </Callout>
                          {hoursOnTrailer !== null && (
                            <div
                              className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border px-5 py-4 ${restDueAt && now >= restDueAt.getTime() ? 'border-bad-line bg-bad-soft' : 'border-warn-line bg-warn-soft'}`}
                            >
                              <div>
                                <span className="type-label-m block text-ink">
                                  On the trailer since{' '}
                                  {formatTime(loadedRecord?.occurredAt ?? null)}
                                </span>
                                <span className="type-body-s text-ink-2">
                                  Unload to rest by {formatClock(restDueAt?.toISOString() ?? null)}{' '}
                                  · at least every 6 hours.
                                </span>
                              </div>
                              <span
                                className={`type-data-l ${restDueAt && now >= restDueAt.getTime() ? 'text-bad' : 'text-warn'}`}
                              >
                                {hoursOnTrailer}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {taskMode === 'delivery' && (
                        <div className="px-6 pt-5">
                          <Callout tone="info" title="At the delivery checkpoint">
                            Check each horse on arrival, then record the delivery. The customer will
                            see the recorded condition and time.
                          </Callout>
                        </div>
                      )}
                      <ConditionRows
                        trip={trip}
                        observations={conditionByHorse}
                        onChange={
                          taskMode === 'delivery'
                            ? (horseId, update) =>
                                updateObservation(horseId, {
                                  ...update,
                                  checked: true,
                                  drinking: null,
                                  eating: null,
                                })
                            : updateObservation
                        }
                        onAllStable={applyAllStable}
                        arrival={taskMode === 'delivery'}
                      />
                      {conditionLog && (
                        <div className="mx-6 mb-5 rounded-lg bg-sunken px-4 py-3">
                          <span className="type-label-s text-ink">
                            Previous check · {formatTime(conditionLog.occurredAt)}
                          </span>
                          <p className="type-body-s m-0 mt-1 text-ink-2">
                            {conditionLog.conditions
                              .map((item) => `${item.horseName}: ${sentence(item.condition)}`)
                              .join(' · ')}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  {taskMode === 'handover' && (
                    <div className="space-y-5 px-6 py-6">
                      <Callout tone="ok" title="Delivery recorded">
                        Record who received the horses. This is added to the append-only journey
                        log.
                      </Callout>
                      <label className="type-body-s flex max-w-xl flex-col gap-2 text-ink-2">
                        Received by
                        <Input
                          size="large"
                          value={receiverName}
                          onChange={(event) => setReceiverName(event.target.value)}
                          maxLength={120}
                          placeholder="Name of the receiving person"
                        />
                      </label>
                      <div className="max-w-2xl rounded-lg border border-line-strong bg-input px-5 py-4">
                        <span className="type-body-s text-ink-3">Receiving signature preview</span>
                        <div className="flex h-20 items-end border-b border-line-strong pb-2">
                          <span className="font-display text-3xl italic text-ink">
                            {receiverName.trim() || 'Receiving person'}
                          </span>
                        </div>
                        <span className="type-caption mt-2 block text-ink-3">
                          Recorded with the recipient’s name on this tablet
                        </span>
                      </div>
                      {trip.horses.map((horse) => (
                        <div
                          key={horse.id}
                          className="flex items-center justify-between border-t border-line py-3"
                        >
                          <span className="type-label-m text-ink">{horse.name}</span>
                          <span className="type-body-s text-ink-3">
                            {horse.stall ?? 'Stall not assigned'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {taskMode === 'complete' && (
                    <div className="px-6 py-6">
                      <Callout tone="ok" title="Handover recorded">
                        The receiving person and handover time are saved in the trip journey log.
                      </Callout>
                      <div className="mt-5">
                        <TripRecords trip={trip} />
                      </div>
                    </div>
                  )}
                </Panel>

                <aside className="flex flex-col gap-5">
                  <Panel title={taskMode === 'held' ? 'What happens next' : 'Next checkpoint'}>
                    {taskMode === 'held' ? (
                      <p className="type-body-s m-0 text-ink-2">
                        Wait for the coordinator’s decision. You can still record water and welfare
                        checks; do not move the load until the hold is released.
                      </p>
                    ) : (
                      <>
                        <h3 className="type-h3 m-0 text-ink">
                          {nextStop?.name ??
                            selectedStop?.name ??
                            trip.destination ??
                            'Route complete'}
                        </h3>
                        <p className="type-body-s mb-0 mt-2 text-ink-2">
                          {nextStop?.details ??
                            selectedStop?.details ??
                            'Follow the confirmed route and record each checkpoint.'}
                        </p>
                        <p className="type-data mt-4 text-info">
                          {nextStop?.plannedAt
                            ? `Planned ${formatTime(nextStop.plannedAt)}`
                            : 'No estimate between recorded checkpoints'}
                        </p>
                      </>
                    )}
                  </Panel>
                  <Panel title="On board">
                    <div className="divide-y divide-line">
                      {trip.horses.map((horse) => (
                        <div
                          key={horse.id}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div>
                            <strong className="type-label-m block text-ink">{horse.name}</strong>
                            <span className="type-body-s text-ink-3">
                              {horse.stall ?? 'Stall not assigned'}
                            </span>
                          </div>
                          <span className="type-caption text-ink-3">
                            {conditionLog?.conditions.find((item) => item.horseId === horse.id)
                              ? sentence(
                                  conditionLog.conditions.find((item) => item.horseId === horse.id)!
                                    .condition,
                                )
                              : 'No check yet'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 border-t border-line pt-3">
                      <span className="type-body-s text-ink-3">Vehicle</span>
                      <span className="type-data ml-3 text-ink">
                        {trip.vehicleCode ?? 'Not assigned'}
                      </span>
                    </div>
                  </Panel>
                  {currentLog && (
                    <Panel title="Previous trip update">
                      <p className="type-body-s m-0 text-ink-2">
                        {currentLog.text ?? eventLabels[currentLog.kind]}
                      </p>
                      <span className="type-caption mt-3 block text-ink-3">
                        {currentLog.recordedBy ?? 'Escort'} · {formatTime(currentLog.occurredAt)}
                      </span>
                    </Panel>
                  )}
                  <Panel title="What the customer sees">
                    <p className="type-body-s m-0 text-ink-2">
                      {currentLog?.checkpointName
                        ? `The last confirmed update at ${currentLog.checkpointName}, recorded ${formatTime(currentLog.occurredAt)}.`
                        : 'The customer sees no position until a checkpoint is recorded.'}
                    </p>
                    <p className="type-body-s mb-0 mt-2 text-ink-3">
                      Positions come from recorded checkpoints, never an estimate.
                    </p>
                  </Panel>
                </aside>
              </div>
            </>
          )}
        </div>
        {trip && (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line-strong bg-card/95 px-5 py-4 backdrop-blur lg:px-8">
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
              <div>
                <p className="type-label-m m-0 text-ink">
                  {taskMode === 'held'
                    ? 'Waiting for the coordinator’s decision'
                    : taskMode === 'condition'
                      ? `${chosenHorseCount} of ${trip.horses.length} horses checked`
                      : taskMode === 'delivery'
                        ? canDeliver
                          ? 'Arrival condition saved'
                          : `${chosenHorseCount} of ${trip.horses.length} arrival checks complete`
                        : taskMode === 'handover'
                          ? receiverName.trim()
                            ? `Ready to record handover to ${receiverName.trim()}`
                            : 'Add the receiving person to complete handover'
                          : taskMode === 'complete'
                            ? 'Handover saved'
                            : `${selectedStop?.name ?? 'Checkpoint'} · ${eventLabels[kind]}`}
                </p>
                <p className="type-body-s m-0 mt-1 text-ink-3">
                  Saved to the trip journey log for the coordinator and customer.
                </p>
              </div>
              {taskMode === 'held' ? (
                <Button
                  variant="secondary"
                  size="md"
                  disabled={mutation.isPending || chosenHorseCount === 0}
                  onClick={saveConditions}
                >
                  {mutation.isPending ? 'Saving…' : 'Save welfare check'}
                </Button>
              ) : taskMode === 'condition' ? (
                <div className="flex flex-wrap gap-3">
                  {showConditionForm && (
                    <Button
                      variant="secondary"
                      size="md"
                      disabled={mutation.isPending}
                      onClick={() => setShowConditionForm(false)}
                    >
                      Back to checkpoint
                    </Button>
                  )}
                  {conditionLog?.routeStopId === selectedStop?.id && (
                    <Button
                      variant="secondary"
                      size="md"
                      disabled={mutation.isPending || chosenHorseCount > 0}
                      onClick={saveStopDeparture}
                    >
                      Record leaving stop
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="md"
                    className="!h-16"
                    disabled={mutation.isPending || chosenHorseCount === 0}
                    onClick={saveConditions}
                  >
                    {mutation.isPending ? 'Saving…' : 'Save condition log'}
                  </Button>
                </div>
              ) : taskMode === 'delivery' && !canDeliver ? (
                <Button
                  variant="primary"
                  size="md"
                  className="!h-16"
                  disabled={mutation.isPending || !allHorsesChecked}
                  onClick={saveConditions}
                >
                  {mutation.isPending ? 'Saving…' : 'Save arrival condition'}
                </Button>
              ) : taskMode === 'handover' ? (
                <Button
                  variant="primary"
                  size="md"
                  className="!h-16"
                  disabled={mutation.isPending || !receiverName.trim()}
                  onClick={saveHandover}
                >
                  {mutation.isPending ? 'Saving…' : 'Record handover'}
                </Button>
              ) : taskMode === 'complete' ? (
                <Chip tone="ok">Complete</Chip>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {trip.tripStatus !== TripStatusEnum.DELIVERED && (
                    <Button
                      variant="secondary"
                      size="md"
                      disabled={mutation.isPending}
                      onClick={() => setShowConditionForm(true)}
                    >
                      Log horse condition
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="md"
                    className="!h-16"
                    disabled={mutation.isPending || departureLocked || !selectedStop}
                    onClick={saveCheckpoint}
                  >
                    {mutation.isPending
                      ? 'Saving…'
                      : taskMode === 'delivery'
                        ? 'Record delivery'
                        : `Record: ${eventLabels[kind]}`}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </ConfigProvider>
  );
}
