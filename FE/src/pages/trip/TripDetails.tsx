import { Col, Flex, Row } from 'antd';

import { eventLabels, formatTime, sentence } from './tripFormat';
import { TripRecords } from './TripRecords';

import { Chip, Panel, TimelineStop } from '@/components/ui';
import type { TripRecordKind, TripView } from '@/interfaces';
import { TripRecordKindEnum } from '@/interfaces';

const kindTone = (kind: TripRecordKind) =>
  kind === TripRecordKindEnum.HELD
    ? 'warn'
    : kind === TripRecordKindEnum.CLEARED_BORDER || kind === TripRecordKindEnum.DELIVERED
      ? 'ok'
      : 'info';

export function TripDetails({ trip }: { trip: TripView }) {
  const lastRecord = [...trip.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  return (
    <Flex vertical gap={16}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Panel title="Trip status">
            <div className="type-h3">{sentence(trip.tripStatus)}</div>
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
      <Panel title="Route progress">
        {trip.stops.length === 0 ? (
          <p className="type-body-s m-0 text-ink-3">The confirmed route has no checkpoints yet.</p>
        ) : (
          <Flex component="ol" vertical gap={12} className="m-0 list-none p-0">
            {trip.stops.map((stop) => {
              const detail = [
                stop.details,
                stop.latestNote,
                stop.latestRecordedBy ? `Recorded by ${stop.latestRecordedBy}` : null,
              ]
                .filter(Boolean)
                .join(' · ');
              const status = stop.latestStatus ? (
                <Chip tone={kindTone(stop.latestStatus)}>{eventLabels[stop.latestStatus]}</Chip>
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
                    details={detail || stop.kind.replaceAll('_', ' ')}
                    status={status}
                  />
                </li>
              );
            })}
          </Flex>
        )}
      </Panel>
      <Panel title="Horses on this trip">
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
