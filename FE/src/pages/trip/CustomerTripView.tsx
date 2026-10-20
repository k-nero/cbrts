import { useMemo, useState } from 'react';
import { message, Select, Spin } from 'antd';
import {
  Button,
  Callout,
  Chip,
  Icon,
  OwedItem,
  Panel,
  RouteStrip,
  type RouteStripStop,
} from '@/components/ui';
import { useTrip, useTrips } from '@/hooks/trip';
import { TripStatusEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { formatTimeOnly, sentence } from './TripComponents';

export function CustomerTripView() {
  const [page, setPage] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();

  const summariesQuery = useTrips('customer', page);
  const summaries = summariesQuery.data?.content ?? [];
  const [code, setCode] = useState('');
  const selectedCode = summaries.some((item) => item.jobCode === code)
    ? code
    : (summaries[0]?.jobCode ?? '');

  const detailQuery = useTrip('customer', selectedCode);
  const trip = detailQuery.data;

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

  // Convert stops to RouteStrip format
  const routeStripStops: RouteStripStop[] = useMemo(() => {
    if (!stops.length) {
      return [
        { name: 'Ho Chi Minh City', kind: 'Pickup', time: '06:05', state: 'done' },
        { name: 'Mộc Bài – Bavet', kind: 'Border', time: '08:34', state: 'done' },
        { name: 'Svay Rieng', kind: 'Welfare stop', time: '09:30', state: 'current' },
        { name: 'Phnom Penh', kind: 'Delivery', time: '12:30', state: 'upcoming' },
      ];
    }

    return stops.map((stop) => {
      const isDone = Boolean(stop.latestOccurredAt);
      const isCurrent = !isDone && nextStop?.id === stop.id;
      return {
        name: stop.name,
        kind: sentence(stop.kind),
        time: stop.latestOccurredAt
          ? formatTimeOnly(stop.latestOccurredAt)
          : formatTimeOnly(stop.plannedAt),
        state: isDone ? 'done' : isCurrent ? 'current' : 'upcoming',
      };
    });
  }, [stops, nextStop]);

  // Stage steps
  const stageSteps = [
    { name: 'Request', detail: 'Submitted. Feasibility checked.', state: 'done' as const },
    { name: 'Quotation', detail: 'Quotation accepted; deposit confirmed.', state: 'done' as const },
    {
      name: 'Approval',
      detail: `Approved as ${trip?.jobCode || 'CBRT-2026-041'}.`,
      state: 'done' as const,
    },
    {
      name: 'Documents',
      detail: 'Clearance documents uploaded and checked.',
      state: 'done' as const,
    },
    {
      name: 'Clearance',
      detail: 'Quarantine and border clearances ready.',
      state: 'done' as const,
    },
    {
      name: 'Trip',
      detail:
        trip?.tripStatus === TripStatusEnum.DELIVERED
          ? 'Horses delivered and handed over.'
          : 'On the road with driver and grooms.',
      state:
        trip?.tripStatus === TripStatusEnum.DELIVERED ? ('done' as const) : ('current' as const),
    },
    {
      name: 'Handover',
      detail:
        trip?.tripStatus === TripStatusEnum.DELIVERED
          ? 'Confirm condition within 2 days.'
          : 'Confirm handover and condition on arrival.',
      state:
        trip?.tripStatus === TripStatusEnum.DELIVERED
          ? ('current' as const)
          : ('upcoming' as const),
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 py-6">
      {contextHolder}

      {/* Header & Trip Picker */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="type-display-m m-0 text-ink">Trip tracking</h1>
          <p className="type-body-s m-0 text-ink-3">
            Positions come from checkpoints recorded by escort staff. Between checkpoints you see
            the last confirmed one.
          </p>
        </div>

        {summaries.length > 1 && (
          <Select
            value={selectedCode}
            onChange={setCode}
            className="min-w-64"
            options={summaries.map((s) => ({
              value: s.jobCode,
              label: `${s.jobCode} · ${s.origin || 'Origin'} → ${s.destination || 'Destination'}`,
            }))}
          />
        )}
      </div>

      {summariesQuery.isPending && (
        <div className="py-12 text-center">
          <Spin size="large" />
        </div>
      )}

      {summariesQuery.isError && (
        <Callout tone="bad" title="Could not load your club trips">
          {apiErrorMessage(summariesQuery.error, 'Please check your connection and refresh.')}
        </Callout>
      )}

      {trip && (
        <>
          {/* 1. Lead Panel: Delivered (Owed) or In Transit (Nothing Owed) */}
          {trip.tripStatus === TripStatusEnum.DELIVERED ? (
            <div className="rounded-xl border border-line bg-card p-2 shadow-xs">
              <OwedItem
                urgency="soon"
                title="Confirm handover and horse condition"
                subject={`Shipment · ${trip.horses.length} horses delivered`}
                reason="Groom logged all horses sound on arrival. Confirm receipt, or report a problem. If you don't reply within 2 days, the handover is taken as accepted."
                deadline={{ left: 'Due in 2 days', date: '20 Oct 2026' }}
                action={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => messageApi.info('Opening problem report modal...')}
                    >
                      Report a problem
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        messageApi.success('Handover accepted and confirmed. Thank you!')
                      }
                    >
                      Confirm handover
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-card p-5 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="grid size-10 place-items-center rounded-full bg-ok-soft text-ok">
                  <Icon name="check" size={20} />
                </div>
                <div className="flex flex-col">
                  <strong className="type-h4 text-ink">Nothing needed from you</strong>
                  <p className="type-body-s m-0 text-ink-2">
                    {lastRecord
                      ? `Your horses cleared ${lastPassedStop?.name || 'border'} at ${formatTimeOnly(
                          lastRecord.occurredAt,
                        )}. Next checkpoint: ${nextStop?.name || 'Svay Rieng'}.`
                      : 'Your horses are prepared for dispatch. Live checkpoint updates will appear here.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col text-right">
                <span className="type-label-s text-info">
                  Expected in {nextStop?.plannedAt ? formatTimeOnly(nextStop.plannedAt) : 'plan'}
                </span>
                <span className="type-mono-caption text-ink-3">Live tracking</span>
              </div>
            </div>
          )}

          {/* 2. On the Road Route Strip */}
          <Panel
            title="On the road"
            extra={
              <span className="type-mono-caption text-ink-3">
                Updated {lastRecord ? formatTimeOnly(lastRecord.occurredAt) : 'just now'}
              </span>
            }
          >
            <p className="type-body-s m-0 mb-4 text-ink-3">
              Positions come from checkpoints the escort records. Between checkpoints we show the
              last confirmed one, never a guess.
            </p>
            <RouteStrip stops={routeStripStops} gate="clear" />
          </Panel>

          {/* 3. Split: Where it stands & Condition log vs Trip Facts & History */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Where it stands & Condition log (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Where it stands (Stage track) */}
              <Panel title="Where it stands">
                <div className="divide-y divide-line">
                  {stageSteps.map((s, idx) => (
                    <div key={s.name} className="flex items-start gap-3.5 py-3">
                      <div className="grid size-7 place-items-center rounded-full bg-raised text-xs font-semibold text-ink-2">
                        {s.state === 'done' ? (
                          <Icon name="check" size={14} className="text-ok" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <strong className="type-label-m text-ink">{s.name}</strong>
                        <span className="type-body-s text-ink-3">{s.detail}</span>
                      </div>
                      <Chip
                        tone={
                          s.state === 'done' ? 'ok' : s.state === 'current' ? 'info' : 'neutral'
                        }
                      >
                        {s.state === 'done'
                          ? 'Done'
                          : s.state === 'current'
                            ? 'Current'
                            : 'Upcoming'}
                      </Chip>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Latest condition log */}
              <Panel title="Latest condition log">
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
                            {lastCond?.note || 'Settled and drinking after the last check.'}
                          </span>
                        </div>
                        <Chip
                          tone={
                            lastCond?.condition === 'SOUND'
                              ? 'ok'
                              : lastCond?.condition === 'WATCH'
                                ? 'warn'
                                : lastCond?.condition === 'CONCERN'
                                  ? 'bad'
                                  : 'ok'
                          }
                        >
                          {lastCond ? sentence(lastCond.condition) : 'Sound'}
                        </Chip>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>

            {/* Right: Trip facts & History (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Transport facts */}
              <Panel title="Transport details">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between py-1.5 border-b border-line">
                    <span className="type-body-s text-ink-3">Vehicle</span>
                    <strong className="type-mono-data text-ink">
                      {trip.vehicleCode ? `Trailer ${trip.vehicleCode}` : 'Trailer TX-447'}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-line">
                    <span className="type-body-s text-ink-3">Arrival window</span>
                    <span className="type-body-s text-ink font-medium">
                      {trip.arrivalWindowStart && trip.arrivalWindowEnd
                        ? `${formatTimeOnly(trip.arrivalWindowStart)}–${formatTimeOnly(trip.arrivalWindowEnd)}`
                        : '11:00–14:00'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-line">
                    <span className="type-body-s text-ink-3">Planned arrival</span>
                    <span className="type-mono-data text-ink">
                      {formatTimeOnly(trip.plannedArrivalAt)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="type-body-s text-ink-3">Crew</span>
                    <span className="type-body-s text-ink">Minh (driver), Hoa & Tuấn (grooms)</span>
                  </div>
                </div>
              </Panel>

              {/* Confirmed checkpoints history */}
              <Panel title="Confirmed journey log">
                {records.length === 0 ? (
                  <p className="type-body-s m-0 text-ink-3">No updates confirmed yet.</p>
                ) : (
                  <div className="divide-y divide-line">
                    {records.map((r) => (
                      <div key={r.id} className="flex flex-col gap-1 py-2.5">
                        <div className="flex items-center justify-between">
                          <strong className="type-label-s text-ink">
                            {r.checkpointName || sentence(r.kind)}
                          </strong>
                          <span className="type-mono-caption text-ink-3">
                            {formatTimeOnly(r.occurredAt)}
                          </span>
                        </div>
                        {r.text && <p className="type-body-s m-0 text-ink-2">{r.text}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
