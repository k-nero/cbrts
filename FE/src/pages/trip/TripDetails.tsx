import { Col, Flex, Row } from 'antd';

import { formatTime, recordLabel, sentence } from './tripFormat';
import { TripRecords } from './TripRecords';

import { Button, Callout, Chip, Panel, TimelineStop } from '@/components/ui';
import { SERVICE_CLASS_LABELS } from '@/lib/utils/request';
import type { TripRecordKind, TripStop, TripView } from '@/interfaces';
import { ON_THE_WAY, RouteStopKindEnum, TripRecordKindEnum } from '@/interfaces';

const kindTone = (kind: TripRecordKind) =>
  kind === TripRecordKindEnum.HELD
    ? 'warn'
    : kind === TripRecordKindEnum.CLEARED_BORDER || kind === TripRecordKindEnum.DELIVERED
      ? 'ok'
      : 'info';

/** On a shared trip, whose horses are picked up or handed over at a stop (staff and the crew only). */
const handover = (stop: TripStop) =>
  !stop.jobCode
    ? null
    : stop.kind === RouteStopKindEnum.PICKUP
      ? `Pick up ${stop.jobCode}`
      : stop.kind === RouteStopKindEnum.DELIVERY
        ? `Hand over ${stop.jobCode}`
        : null;

export function TripDetails({
  trip,
  audience,
  onShowPart,
  onShowJourney,
}: {
  trip: TripView;
  audience: 'escort' | 'staff' | 'customer';
  /** Opens another part of a job split across trips (US-F5-06). */
  onShowPart?: (tripId: string) => void;
  /** Back to the customer's one timeline across a journey's trips (US-F3-16). */
  onShowJourney?: () => void;
}) {
  const lastRecord = [...trip.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  // A job planned as a chain of trips, road, air, road (US-F3-16), rather than split by an incident.
  const journey = trip.parts.some((part) => part.handsOn);
  // The customer follows a journey on one timeline across its trips until they open one trip.
  const wholeJourney = journey && !trip.parts.some((part) => part.current);
  return (
    <Flex vertical gap={16}>
      {/* The customer is told the trailer is shared, never with whom (US-F3-14). */}
      {trip.shared && audience === 'customer' && (
        <Callout
          tone="info"
          title={
            trip.flights.length > 0
              ? 'Your horses share this trailer and flight'
              : 'Your horses share this trailer'
          }
        >
          They travel with another client's horses. Each horse keeps its own stall, and the escort
          cares for every horse on board. Stops for the other client show as a stop on the way.
        </Callout>
      )}
      {trip.parts.length > 0 && (
        <Panel
          title={
            journey
              ? `A journey of ${trip.parts.length} trips`
              : `Travelling in ${trip.parts.length} parts`
          }
        >
          <Flex vertical gap={12}>
            <p className="type-body-s m-0 text-ink-3">
              {journey
                ? audience === 'customer'
                  ? wholeJourney
                    ? 'Your horses travel by road and air, each trip handing them on to the next. The timeline below follows them across every trip; open a trip to see only its stops and updates.'
                    : 'Your horses travel by road and air, each trip handing them on to the next. Below is one trip of the journey.'
                  : 'This job is planned as a chain of trips; each hands the horses on to the next, and only the last delivers them.'
                : audience === 'customer'
                  ? 'After an incident on the road, your horses travel on separate trailers. Each part is followed on its own.'
                  : 'An incident split this job across trips; each part departs, travels and is delivered on its own.'}
            </p>
            {trip.parts.map((part, index) => (
              <Flex
                key={part.tripId}
                wrap
                align="center"
                justify="space-between"
                gap={12}
                className="rounded-lg border border-line bg-card p-4"
              >
                <Flex vertical gap={2}>
                  <span className="type-label-m text-ink">
                    {journey
                      ? [
                          `${index + 1}`,
                          part.mode === 'AIR' ? 'Flight' : 'Road',
                          part.corridorCode,
                          part.tripCode,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      : `${part.tripCode ?? `Part ${index + 1}`} · ${part.horses.join(', ') || 'No horse travelling'}`}
                  </span>
                  <span className="type-body-s text-ink-3">
                    {[
                      part.plannedDepartureAt
                        ? `Departs ${formatTime(part.plannedDepartureAt)}`
                        : 'Departure to be planned',
                      part.plannedArrivalAt ? `Arrives ${formatTime(part.plannedArrivalAt)}` : null,
                      part.leftInCare.length > 0 ? `In care: ${part.leftInCare.join(', ')}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </Flex>
                <Flex align="center" gap={8}>
                  <Chip
                    tone={
                      part.status === 'DELIVERED' ? 'ok' : part.status === 'HELD' ? 'warn' : 'info'
                    }
                  >
                    {part.handsOn && part.status === 'DELIVERED'
                      ? 'Handed on'
                      : sentence(part.status)}
                  </Chip>
                  {part.current ? (
                    <Chip>Shown</Chip>
                  ) : (
                    onShowPart &&
                    audience !== 'escort' && (
                      <Button size="sm" onClick={() => onShowPart(part.tripId)}>
                        {journey ? 'Show this trip' : 'Show this part'}
                      </Button>
                    )
                  )}
                </Flex>
              </Flex>
            ))}
            {journey && !wholeJourney && audience === 'customer' && onShowJourney && (
              <Flex>
                <Button size="sm" onClick={onShowJourney}>
                  Show the whole journey
                </Button>
              </Flex>
            )}
          </Flex>
        </Panel>
      )}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Panel title="Trip status">
            <div className="type-h3">
              {trip.parts.some((part) => part.current && part.handsOn) &&
              trip.tripStatus === 'DELIVERED'
                ? 'Handed on'
                : sentence(trip.tripStatus)}
            </div>
            <p className="type-body-s mb-0 mt-2 text-ink-3">
              Last update:{' '}
              {lastRecord
                ? `${lastRecord.checkpointName ?? 'Trip'} · ${formatTime(lastRecord.occurredAt)}`
                : 'No checkpoint update yet'}
            </p>
          </Panel>
        </Col>
        <Col xs={24} md={8}>
          <Panel title="Planned journey">
            <p className="type-body-m m-0">
              {trip.origin ?? 'Origin not set'} → {trip.destination ?? 'Destination not set'}
            </p>
            <p className="type-body-s mb-0 mt-2 text-ink-3">
              Departure {formatTime(trip.plannedDepartureAt)} · Arrival{' '}
              {formatTime(trip.plannedArrivalAt)}
            </p>
          </Panel>
        </Col>
        <Col xs={24} md={8}>
          <Panel title="Transport">
            <p className="type-body-m m-0">{trip.vehicleCode ?? 'Vehicle not assigned'}</p>
            <p className="type-body-s mb-0 mt-2 text-ink-3">
              {trip.clearanceReady ? 'Clearance ready' : 'Departure is waiting for clearance'}
            </p>
          </Panel>
        </Col>
      </Row>
      {trip.flights.map((flight) => (
        <Panel key={flight.flightNo} title={`Flight ${flight.flightNo} · ${flight.airline}`}>
          <Flex vertical gap={8}>
            <p className="type-body-s m-0 text-ink-3">
              Departs {formatTime(flight.estimatedDepartureAt ?? flight.scheduledDepartureAt)} ·
              Arrives {formatTime(flight.estimatedArrivalAt ?? flight.scheduledArrivalAt)}
            </p>
            {flight.consignments.map((c) => (
              <p key={c.id} className="type-body-m m-0 text-ink">
                {audience === 'customer' ? 'Your consignment' : c.jobCode}:{' '}
                {[
                  c.airWaybill ? `air waybill ${c.airWaybill}` : 'air waybill to come',
                  `${c.stallPositions ?? '?'} ${c.stallPositions === 1 ? 'stall position' : 'stall positions'}`,
                  c.serviceClass ? SERVICE_CLASS_LABELS[c.serviceClass].toLowerCase() : null,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            ))}
          </Flex>
        </Panel>
      ))}
      <Panel title="Route progress">
        {trip.stops.length === 0 ? (
          <p className="type-body-s m-0 text-ink-3">The confirmed route has no checkpoints yet.</p>
        ) : (
          <Flex component="ol" vertical gap={12} className="m-0 list-none p-0">
            {trip.stops.map((stop) => {
              const detail = [
                handover(stop),
                stop.details,
                stop.latestNote,
                stop.latestRecordedBy ? `Recorded by ${stop.latestRecordedBy}` : null,
              ]
                .filter(Boolean)
                .join(' · ');
              const status = stop.latestStatus ? (
                <Chip tone={kindTone(stop.latestStatus)}>
                  {recordLabel(stop.latestStatus, stop.kind)}
                </Chip>
              ) : (
                <Chip>Waiting for update</Chip>
              );
              return (
                <li key={stop.id}>
                  <TimelineStop
                    kind={stop.kind}
                    stop={`${stop.sequence}. ${stop.name}`}
                    time={
                      stop.latestOccurredAt
                        ? formatTime(stop.latestOccurredAt)
                        : `Planned ${formatTime(stop.plannedAt)}`
                    }
                    details={
                      detail ||
                      (stop.kind === ON_THE_WAY
                        ? 'The trailer stops here on its way.'
                        : stop.kind.replaceAll('_', ' '))
                    }
                    status={status}
                  />
                </li>
              );
            })}
          </Flex>
        )}
      </Panel>
      <Panel title={audience === 'escort' ? 'Horses on your trailer' : 'Horses on this trip'}>
        <div className="divide-y divide-line">
          {trip.horses.map((horse) => (
            <div key={horse.id} className="py-3">
              <Flex justify="space-between" gap={8}>
                <strong className="type-h4">{horse.name}</strong>
                <span className="type-body-s text-ink-3">
                  {horse.stall ?? 'Stall not assigned'}
                </span>
              </Flex>
            </div>
          ))}
        </div>
      </Panel>
      <TripRecords trip={trip} />
    </Flex>
  );
}
