import { useMemo, useState } from 'react';
import { Input, message, Modal, Select, Spin } from 'antd';
import { Button, Callout, Chip, Icon, Panel, StatTile } from '@/components/ui';
import { useTrip, useTripRecord } from '@/hooks/trip';
import {
  HorseConditionEnum,
  type TripRecordKind,
  TripRecordKindEnum,
  TripStatusEnum,
} from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import {
  againstPlanText,
  CustomerSeesPanel,
  durText,
  formatFullTime,
  formatTimeOnly,
  sentence,
  toMin,
} from './TripComponents';

export type CoordinatorTripViewProps = {
  jobCode: string;
};

export function CoordinatorTripView({ jobCode }: CoordinatorTripViewProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const { data: trip, isPending, isError, error, refetch } = useTrip('staff', jobCode);
  const mutation = useTripRecord('staff', jobCode);

  // Office checkpoint modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string>();
  const [recordKind, setRecordKind] = useState<TripRecordKind>(TripRecordKindEnum.ARRIVED_AT_STOP);
  const [recordNote, setRecordNote] = useState('');

  // Latest record & stats
  const records = useMemo(() => {
    if (!trip?.records) return [];
    return [...trip.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [trip?.records]);

  const lastRecord = records[0];

  const stops = useMemo(() => {
    if (!trip?.stops) return [];
    return trip.stops;
  }, [trip?.stops]);

  // Last passed checkpoint
  const lastPassedStop = useMemo(() => {
    if (!stops.length) return null;
    const passed = stops.filter((s) => s.latestOccurredAt);
    return passed[passed.length - 1] || stops[0];
  }, [stops]);

  // Next upcoming stop
  const nextStop = useMemo(() => {
    if (!stops.length) return null;
    return stops.find((s) => !s.latestOccurredAt) || stops[stops.length - 1];
  }, [stops]);

  // Against plan text at last checkpoint
  const lastAgainstPlan = useMemo(() => {
    if (!lastPassedStop) return 'On time';
    return againstPlanText(lastPassedStop.plannedAt, lastPassedStop.latestOccurredAt);
  }, [lastPassedStop]);

  // Sound/stable horse count at last condition check
  const soundHorseCount = useMemo(() => {
    if (!trip?.horses.length) return 0;
    const lastConditionRecord = records.find((r) => r.conditions.length > 0);
    if (!lastConditionRecord) return 0;
    return lastConditionRecord.conditions.filter(
      (c) =>
        c.condition === HorseConditionEnum.SOUND ||
        c.condition === HorseConditionEnum.STABLE,
    ).length;
  }, [trip?.horses, records]);

  // Handle coordinator saving office checkpoint
  const handleSaveOfficeRecord = async () => {
    try {
      await mutation.mutateAsync({
        routeStopId: selectedStopId || null,
        kind: recordKind,
        occurredAt: new Date().toISOString(),
        clientRef: crypto.randomUUID(),
        text: recordNote || undefined,
      });
      messageApi.success('Office trip checkpoint recorded.');
      setIsModalOpen(false);
      setRecordNote('');
      refetch();
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Failed to record checkpoint.'));
    }
  };

  if (isPending) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !trip) {
    return (
      <Callout tone="bad" title="Could not load trip progress">
        {apiErrorMessage(error, 'Trip tracking data could not be retrieved.')}
      </Callout>
    );
  }

  const arrivalWindowText =
    trip.arrivalWindowStart && trip.arrivalWindowEnd
      ? `${formatTimeOnly(trip.arrivalWindowStart)}–${formatTimeOnly(trip.arrivalWindowEnd)}`
      : 'Not set';

  const plannedArrivalText = formatTimeOnly(trip.plannedArrivalAt);

  return (
    <div className="flex flex-col gap-6">
      {contextHolder}

      {/* Clearance Gate Notice if Locked */}
      {!trip.clearanceReady && (
        <Callout tone="bad" title="Departure locked">
          Departure cannot be recorded until clearance is marked CLEARANCE_READY by the transport
          specialist.
        </Callout>
      )}

      {/* 1. Four Stat Tiles (Figma: scrTripCoordinator) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          tone={lastAgainstPlan.startsWith('+') ? 'warn' : 'ok'}
          value={lastAgainstPlan}
          label={`Against plan at ${lastPassedStop?.name || 'pickup'}`}
        />
        <StatTile
          tone="neutral"
          value={arrivalWindowText}
          label={`Arrival window · plan arrives ${plannedArrivalText}`}
        />
        <StatTile
          tone="info"
          value={formatTimeOnly(nextStop?.plannedAt)}
          label={`Next checkpoint · ${nextStop?.name || 'next stop'}`}
        />
        <StatTile
          tone={soundHorseCount === trip.horses.length ? 'ok' : 'warn'}
          value={`${soundHorseCount} of ${trip.horses.length}`}
          label={`Horses sound at the last check${
            lastRecord ? `, ${formatTimeOnly(lastRecord.occurredAt)}` : ''
          }`}
        />
      </div>

      {/* 2. Full-Width Checkpoints Table */}
      <Panel
        title="Checkpoints, planned against recorded"
        extra={
          <div className="flex items-center gap-3">
            <span className="type-mono-caption text-ink-3">
              {lastRecord ? `Updated ${formatTimeOnly(lastRecord.occurredAt)}` : 'No updates yet'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon="plus"
              onClick={() => setIsModalOpen(true)}
            >
              Record office update
            </Button>
          </div>
        }
      >
        <p className="type-body-s m-0 mb-4 text-ink-3">
          From the route plan you confirmed; recorded times come from the cab.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-ink-3">
                <th className="py-3 pr-4">Checkpoint</th>
                <th className="py-3 px-4 w-28">Planned</th>
                <th className="py-3 px-4">Recorded</th>
                <th className="py-3 px-4 w-32 text-right">Against plan</th>
                <th className="py-3 pl-4 w-28 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {stops.map((stop) => {
                const isPassed = Boolean(stop.latestOccurredAt);
                const isNext = !isPassed && nextStop?.id === stop.id;
                const against = againstPlanText(stop.plannedAt, stop.latestOccurredAt);

                let chipTone: 'ok' | 'info' | 'warn' | 'neutral' = 'neutral';
                let chipLabel = 'Upcoming';

                if (isPassed) {
                  chipTone = 'ok';
                  chipLabel = stop.latestStatus ? sentence(stop.latestStatus) : 'Cleared';
                } else if (isNext) {
                  chipTone = 'info';
                  chipLabel = 'Next';
                }

                return (
                  <tr
                    key={stop.id}
                    className={`transition-colors ${isNext ? 'bg-info-soft/40' : 'hover:bg-muted/40'}`}
                  >
                    <td className="py-3.5 pr-4">
                      <div className="flex flex-col">
                        <strong className="type-label-m text-ink">{stop.name}</strong>
                        <span className="type-body-s text-ink-3">
                          {sentence(stop.kind)}
                          {stop.details ? ` · ${stop.details}` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono type-data text-ink-2">
                      {formatTimeOnly(stop.plannedAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      {stop.latestOccurredAt ? (
                        <div className="flex flex-col">
                          <span className="type-mono-data font-semibold text-ink">
                            {formatTimeOnly(stop.latestOccurredAt)}
                          </span>
                          <span className="type-body-s text-ink-3">
                            {stop.latestNote ||
                              (stop.latestRecordedBy
                                ? `Recorded by ${stop.latestRecordedBy}`
                                : 'Recorded from cab')}
                          </span>
                        </div>
                      ) : isNext ? (
                        <span className="type-body-s text-info">
                          Expected in{' '}
                          {nextStop?.plannedAt
                            ? durText(
                                Math.max(
                                  toMin(formatTimeOnly(nextStop.plannedAt)) -
                                    toMin(formatTimeOnly(new Date().toISOString())),
                                  0,
                                ),
                              )
                            : 'plan'}
                        </span>
                      ) : (
                        <span className="type-body-s text-ink-3">Planned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono type-data text-ink-2">
                      {against}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <Chip tone={chipTone}>{chipLabel}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 3. Split Below Table */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Escort's Log & Customer sees (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Panel
            title="Escort’s log"
            extra={
              <span className="type-mono-caption text-ink-3">
                {records.length} records · every record reaches customer
              </span>
            }
          >
            {records.length === 0 ? (
              <p className="type-body-s m-0 text-ink-3">No updates recorded yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {records.map((r) => (
                  <div key={r.id} className="flex items-start gap-4 py-3">
                    <span className="type-mono-caption w-14 shrink-0 text-ink-3 pt-0.5">
                      {formatTimeOnly(r.occurredAt)}
                    </span>
                    <div className="flex flex-1 flex-col gap-1">
                      <p className="type-body-s m-0 text-ink">
                        {r.text || `${sentence(r.kind)} recorded.`}
                      </p>
                      {r.conditions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {r.conditions.map((c) => (
                            <span
                              key={c.horseId}
                              className="inline-flex items-center gap-1.5 rounded-md bg-raised px-2 py-1 text-xs"
                            >
                              <strong>{c.horseName}</strong>
                              <Chip
                                tone={
                                  c.condition === 'SOUND'
                                    ? 'ok'
                                    : c.condition === 'WATCH'
                                      ? 'warn'
                                      : 'bad'
                                }
                              >
                                {sentence(c.condition)}
                              </Chip>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="type-body-s w-32 shrink-0 text-right text-ink-3">
                      {r.recordedBy ?? 'Crew'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <CustomerSeesPanel
            text={
              lastRecord
                ? `Your horses cleared ${lastPassedStop?.name || 'checkpoint'} at ${formatTimeOnly(
                    lastRecord.occurredAt,
                  )}. Next checkpoint: ${nextStop?.name || 'destination'}, expected ${formatTimeOnly(
                    nextStop?.plannedAt,
                  )}.`
                : 'Your horses are scheduled to depart on time. Live updates will appear as recorded.'
            }
          />
        </div>

        {/* Right Column: On Board, Crew and Vehicle, If Trip Stops (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* On Board Panel */}
          <Panel
            title="On board"
            extra={
              <span className="type-body-s text-ink-3">
                {lastRecord
                  ? `Last check ${formatTimeOnly(lastRecord.occurredAt)}`
                  : 'No condition check recorded'}
              </span>
            }
          >
            <div className="divide-y divide-line">
              {trip.horses.map((horse) => {
                const lastCond = records
                  .flatMap((r) => r.conditions)
                  .find((c) => c.horseId === horse.id);


                return (
                  <div key={horse.id} className="flex items-center justify-between py-3">
                    <div className="flex flex-col">
                      <strong className="type-label-m text-ink">{horse.name}</strong>
                      <span className="type-body-s text-ink-3">
                        {horse.stall ?? 'Stall not assigned'}
                        {lastCond?.note ? ` · ${lastCond.note}` : ''}
                      </span>
                    </div>
                    <Chip
                      tone={
                        lastCond?.condition === 'SOUND' || lastCond?.condition === 'STABLE'
                          ? 'ok'
                          : lastCond?.condition === 'WATCH' ||
                              lastCond?.condition === 'OFF_FEED' ||
                              lastCond?.condition === 'STRESSED' ||
                              lastCond?.condition === 'CLIMATE_CHANGE'
                            ? 'warn'
                            : lastCond?.condition === 'CONCERN'
                              ? 'bad'
                              : 'neutral'
                      }
                    >
                      {lastCond ? sentence(lastCond.condition) : 'Not checked'}
                    </Chip>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Crew and Vehicle Panel */}
          <Panel title="Crew and vehicle">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between py-1.5 border-b border-line">
                <span className="type-body-s text-ink-3">Vehicle</span>
                <strong className="type-mono-data text-ink">
                  {trip.vehicleCode ?? 'Not assigned'}
                </strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-line">
                <span className="type-body-s text-ink-3">Crew seen in records</span>
                <span className="type-body-s text-ink font-medium">
                  {[...new Set(trip.records.map((r) => r.recordedBy).filter(Boolean))].join(
                    ', ',
                  ) || 'No records yet'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="type-body-s text-ink-3">Last update</span>
                <span className="type-body-s text-ink-2">
                  {lastRecord
                    ? `${formatTimeOnly(lastRecord.occurredAt)} · ${lastRecord.recordedBy ?? 'Crew'}`
                    : 'Not recorded'}
                </span>
              </div>

              <Button
                variant="secondary"
                leadingIcon="phone"
                onClick={() => messageApi.info('Use the job\'s assigned escort contact.')}
                className="mt-2 w-full"
              >
                Call the cab
              </Button>
            </div>
          </Panel>

          {/* If the Trip Stops Panel */}
          <Panel title="If the trip stops">
            <p className="type-body-s m-0 mb-3 text-ink-2">
              A hold recorded in the cab opens an incident for Yến, logistics manager, and tells the
              customer. Raise one yourself for anything the cab can’t record.
            </p>
            <Button
              variant="secondary"
              leadingIcon="alert"
              onClick={() => messageApi.info('Opening incident modal for Yến...')}
              className="w-full"
            >
              Raise an incident
            </Button>
          </Panel>
        </div>
      </div>

      {/* Office Checkpoint Modal */}
      <Modal
        title="Record office checkpoint update"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSaveOfficeRecord}
        confirmLoading={mutation.isPending}
        okText="Record checkpoint"
      >
        <div className="flex flex-col gap-4 py-2">
          <label className="flex flex-col gap-1.5 type-body-s text-ink-2">
            Checkpoint
            <Select
              placeholder="Select checkpoint"
              value={selectedStopId}
              onChange={setSelectedStopId}
              options={stops.map((s) => ({ value: s.id, label: `${s.sequence}. ${s.name}` }))}
            />
          </label>

          <label className="flex flex-col gap-1.5 type-body-s text-ink-2">
            Status kind
            <Select
              value={recordKind}
              onChange={setRecordKind}
              options={[
                { value: TripRecordKindEnum.ARRIVED_AT_STOP, label: 'Arrived at checkpoint' },
                { value: TripRecordKindEnum.CLEARED_BORDER, label: 'Customs cleared' },
                { value: TripRecordKindEnum.LEFT_STOP, label: 'Left checkpoint' },
                { value: TripRecordKindEnum.HELD, label: 'Hold at checkpoint' },
                { value: TripRecordKindEnum.DELIVERED, label: 'Delivered' },
                { value: TripRecordKindEnum.NOTE, label: 'Update note' },
              ]}
            />
          </label>

          <label className="flex flex-col gap-1.5 type-body-s text-ink-2">
            Update note
            <Input.TextArea
              rows={3}
              value={recordNote}
              onChange={(e) => setRecordNote(e.target.value)}
              placeholder="What was observed or recorded?"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
