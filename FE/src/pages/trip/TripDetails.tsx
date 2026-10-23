import { useMemo } from 'react';
import { Col, Flex, Row } from 'antd';

import {
  eventLabels,
  formatAgainstPlan,
  formatClock,
  formatCountdown,
  sentence,
} from './tripFormat';
import { TripRecords } from './TripRecords';

import Table from '@/components/table';
import { Button, Chip, Panel, StatTile } from '@/components/ui';
import type { HorseCondition, TripRecordKind, TripStop, TripView } from '@/interfaces';
import { HorseConditionEnum, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';

const kindTone = (kind: TripRecordKind) =>
  kind === TripRecordKindEnum.HELD
    ? 'bad'
    : kind === TripRecordKindEnum.DEPARTED || kind === TripRecordKindEnum.DELIVERED
      ? 'ok'
      : 'info';

const conditionTone = (cond: HorseCondition) =>
  cond === HorseConditionEnum.STABLE ? 'ok' : cond === HorseConditionEnum.OFF_FEED ? 'bad' : 'warn';

export function TripDetails({
  trip,
  audience = 'staff',
}: {
  trip: TripView;
  audience?: 'staff' | 'customer' | 'escort';
}) {
  // Determine last recorded stop and next stop
  const recordedStops = useMemo(
    () => trip.stops.filter((s) => Boolean(s.latestOccurredAt)),
    [trip.stops],
  );
  const lastRecordedStop = recordedStops[recordedStops.length - 1];

  const nextStop = useMemo(() => trip.stops.find((s) => !s.latestOccurredAt), [trip.stops]);

  // Latest condition records to count stable horses
  const conditionRecords = useMemo(
    () =>
      trip.records
        .filter((r) => r.conditions.length > 0)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [trip.records],
  );
  const lastConditionRecord = conditionRecords[0];

  const stableHorsesCount = useMemo(() => {
    if (!lastConditionRecord) return trip.horses.length;
    return lastConditionRecord.conditions.filter((c) => c.condition === HorseConditionEnum.STABLE)
      .length;
  }, [lastConditionRecord, trip.horses.length]);

  const againstPlanText = lastRecordedStop
    ? formatAgainstPlan(lastRecordedStop.plannedAt, lastRecordedStop.latestOccurredAt)
    : '—';

  const windowText =
    trip.arrivalWindowStart && trip.arrivalWindowEnd
      ? `${formatClock(trip.arrivalWindowStart)}–${formatClock(trip.arrivalWindowEnd)}`
      : formatClock(trip.plannedArrivalAt);

  // Derive "What the customer sees" text
  const customerSeesText = useMemo(() => {
    if (trip.tripStatus === TripStatusEnum.HELD) {
      return `Held at ${lastRecordedStop?.name ?? 'checkpoint'} since ${formatClock(
        lastRecordedStop?.latestOccurredAt,
      )}. Waiting on logistics decision. Never an estimated arrival time.`;
    }
    if (lastRecordedStop) {
      const nextText = nextStop
        ? ` Next checkpoint: the ${nextStop.name}, expected ${formatClock(nextStop.plannedAt)}.`
        : ' Destination reached.';
      return `Your horses cleared ${lastRecordedStop.name} at ${formatClock(
        lastRecordedStop.latestOccurredAt,
      )}.${nextText}`;
    }
    return 'Departure is being prepared. Tracking updates will appear as checkpoints are recorded.';
  }, [trip.tripStatus, lastRecordedStop, nextStop]);

  const columns = useMemo(
    () => [
      {
        title: 'Checkpoint',
        dataIndex: 'name',
        key: 'name',
        render: (_: unknown, stop: TripStop) => (
          <Flex vertical gap={2}>
            <span className="type-label-m text-ink">{stop.name}</span>
            <span className="type-body-s text-ink-3">
              {stop.sequence}. {stop.kind.toLowerCase().replaceAll('_', ' ')}
              {stop.details ? ` · ${stop.details}` : ''}
            </span>
          </Flex>
        ),
      },
      {
        title: 'Planned',
        dataIndex: 'plannedAt',
        key: 'plannedAt',
        width: 100,
        render: (plannedAt: string) => (
          <span className="type-mono-data text-ink-2">{formatClock(plannedAt)}</span>
        ),
      },
      {
        title: 'Recorded',
        key: 'recorded',
        width: 300,
        render: (_: unknown, stop: TripStop) => {
          const isDone = Boolean(stop.latestOccurredAt);
          const isNext = nextStop?.id === stop.id;
          if (isDone) {
            return (
              <Flex vertical gap={2}>
                <span className="type-mono-data font-bold text-ink">
                  {formatClock(stop.latestOccurredAt)}
                </span>
                <span className="type-body-s text-ink-3">
                  {stop.latestNote ??
                    (stop.latestRecordedBy ? `Recorded by ${stop.latestRecordedBy}` : '')}
                </span>
              </Flex>
            );
          }
          return (
            <span className={`type-body-s ${isNext ? 'text-info font-medium' : 'text-ink-3'}`}>
              {isNext
                ? stop.plannedAt && formatCountdown(stop.plannedAt)
                  ? `Expected ${formatCountdown(stop.plannedAt)}`
                  : `Expected at ${formatClock(stop.plannedAt)}`
                : 'Planned'}
            </span>
          );
        },
      },
      {
        title: 'Against plan',
        key: 'againstPlan',
        width: 120,
        align: 'right' as const,
        render: (_: unknown, stop: TripStop) => {
          const against = formatAgainstPlan(stop.plannedAt, stop.latestOccurredAt);
          return <span className="type-mono-data text-ink-2">{against}</span>;
        },
      },
      {
        title: 'Status',
        key: 'status',
        width: 130,
        align: 'right' as const,
        render: (_: unknown, stop: TripStop) => {
          const isNext = nextStop?.id === stop.id;
          if (stop.latestStatus) {
            return (
              <Chip tone={kindTone(stop.latestStatus)}>
                {eventLabels[stop.latestStatus] ?? sentence(stop.latestStatus)}
              </Chip>
            );
          }
          if (isNext) {
            return <Chip tone="info">Next</Chip>;
          }
          return <Chip tone="neutral">Upcoming</Chip>;
        },
      },
    ],
    [nextStop?.id],
  );

  return (
    <Flex vertical gap={24}>
      {/* 4 StatTiles at top (matching Figma scrTripCoordinator) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatTile
            tone={againstPlanText.startsWith('+') ? 'warn' : 'neutral'}
            value={againstPlanText}
            label={`Against plan at ${lastRecordedStop?.name ?? 'first stop'}`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatTile
            tone="neutral"
            value={windowText}
            label={`Arrival window · plan arrives ${formatClock(trip.plannedArrivalAt)}`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatTile
            tone="info"
            value={nextStop ? formatClock(nextStop.plannedAt) : 'Complete'}
            label={`Next checkpoint · ${nextStop?.name ?? 'Delivered'}`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatTile
            tone={stableHorsesCount === trip.horses.length ? 'ok' : 'warn'}
            value={`${stableHorsesCount} of ${trip.horses.length}`}
            label={`Horses stable at last check${
              lastConditionRecord ? `, ${formatClock(lastConditionRecord.occurredAt)}` : ''
            }`}
          />
        </Col>
      </Row>

      {/* Full-width Checkpoints Table */}
      <Panel
        title="Checkpoints, planned against recorded"
        extra={
          <span className="type-caption text-ink-3">
            Updated {formatClock(lastRecordedStop?.latestOccurredAt ?? new Date().toISOString())}
          </span>
        }
      >
        <p className="type-body-s -mt-2 mb-4 text-ink-3">
          From the route plan confirmed for this trip; recorded times come from the cab.
        </p>
        <Table
          id="trip-checkpoints"
          rowKey="id"
          columns={columns}
          dataSource={trip.stops}
          pagination={false}
          rowClassName={(record: TripStop) => (nextStop?.id === record.id ? 'bg-info-soft/20' : '')}
        />
      </Panel>

      {/* Split Columns (Left & Right) */}
      <Row gutter={[24, 24]} align="top">
        {/* Left Column (14 of 24 cols): Escort log + Customer sees */}
        <Col xs={24} lg={14}>
          <Flex vertical gap={24}>
            <TripRecords trip={trip} />

            {audience !== 'customer' && (
              <Panel title="What the customer sees">
                <p className="type-body-s m-0 text-ink-2">{customerSeesText}</p>
              </Panel>
            )}
          </Flex>
        </Col>

        {/* Right Column (10 of 24 cols): On board + Crew & vehicle + If trip stops */}
        <Col xs={24} lg={10}>
          <Flex vertical gap={24}>
            {/* On board horses */}
            <Panel
              title="On board"
              extra={
                <span className="type-caption text-ink-3">
                  Last check{' '}
                  {lastConditionRecord ? formatClock(lastConditionRecord.occurredAt) : 'not logged'}
                </span>
              }
            >
              <div className="divide-y divide-line">
                {trip.horses.map((horse) => {
                  const latestCondition = lastConditionRecord?.conditions.find(
                    (c) => c.horseId === horse.id,
                  );
                  const cond = latestCondition?.condition ?? HorseConditionEnum.STABLE;

                  return (
                    <Flex key={horse.id} align="center" justify="space-between" className="py-3">
                      <Flex vertical gap={2}>
                        <span className="type-label-m text-ink">{horse.name}</span>
                        <span className="type-body-s text-ink-3">
                          {horse.stall ?? 'Standard stall'}
                          {latestCondition?.note ? ` · ${latestCondition.note}` : ''}
                        </span>
                      </Flex>
                      <Chip tone={conditionTone(cond)}>{sentence(cond)}</Chip>
                    </Flex>
                  );
                })}
              </div>
            </Panel>

            {/* Crew and vehicle */}
            <Panel title="Crew and vehicle">
              <div className="divide-y divide-line">
                <Flex align="center" justify="space-between" className="py-2.5">
                  <span className="type-body-s text-ink-3">Vehicle</span>
                  <span className="type-label-m text-ink">
                    {trip.vehicleCode ?? 'Trailer TX-447'}
                  </span>
                </Flex>
                <Flex align="center" justify="space-between" className="py-2.5">
                  <span className="type-body-s text-ink-3">Driver</span>
                  <span className="type-body-m text-ink">Minh, driver</span>
                </Flex>
                <Flex align="center" justify="space-between" className="py-2.5">
                  <span className="type-body-s text-ink-3">Grooms</span>
                  <span className="type-body-m text-ink">Lê Thị Hoa, Phạm Quốc Tuấn</span>
                </Flex>
                <Flex align="center" justify="space-between" className="py-2.5">
                  <span className="type-body-s text-ink-3">Records</span>
                  <span className="type-body-m text-ink">
                    All sent · last{' '}
                    {lastRecordedStop?.latestOccurredAt
                      ? formatClock(lastRecordedStop.latestOccurredAt)
                      : '—'}
                  </span>
                </Flex>
                {audience === 'staff' && (
                  <div className="pt-3">
                    <Button variant="secondary" block>
                      Call the cab
                    </Button>
                  </div>
                )}
              </div>
            </Panel>

            {/* If the trip stops */}
            <Panel title="If the trip stops">
              <p className="type-body-s m-0 text-ink-2">
                The escort records the stop and reason in the cab. That hold stays in the journey
                log and customer tracking until the trip resumes. The logistics manager owns
                incident follow-up.
              </p>
            </Panel>
          </Flex>
        </Col>
      </Row>
    </Flex>
  );
}
