import { useMemo } from 'react';

import { Flex } from 'antd';

import { Photo } from './Photo';
import { formatTime, recordLabel, sentence } from './tripFormat';

import { Chip, Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';
import { HorseConditionEnum } from '@/interfaces';

export function TripRecords({ trip }: { trip: TripView }) {
  const records = useMemo(
    () => [...trip.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [trip.records],
  );
  const stopKinds = useMemo(
    () => new Map(trip.stops.map((stop) => [stop.id, stop.kind])),
    [trip.stops],
  );
  return (
    <Panel title="Trip journey log">
      {records.length === 0 ? (
        <p className="type-body-s m-0 text-ink-3">No trip updates have been recorded yet.</p>
      ) : (
        <ol className="m-0 list-none divide-y divide-line p-0">
          {records.map((record) => (
            <li key={record.id} className="py-4">
              <Flex wrap align="center" justify="space-between" gap={8}>
                <strong className="type-body-m">
                  {record.checkpointName ?? 'Trip update'} ·{' '}
                  {recordLabel(record.kind, stopKinds.get(record.routeStopId ?? ''))}
                </strong>
                <span className="type-data text-ink-3">{formatTime(record.occurredAt)}</span>
              </Flex>
              {record.text && <p className="type-body-s mb-2 mt-1 text-ink-2">{record.text}</p>}
              {record.conditions.map((condition) => (
                <div key={condition.horseId} className="mt-3 rounded-lg bg-raised p-3">
                  <Flex wrap align="center" justify="space-between" gap={8}>
                    <strong className="type-h4">{condition.horseName}</strong>
                    <Chip
                      tone={
                        condition.condition === HorseConditionEnum.CONCERN
                          ? 'bad'
                          : condition.condition === HorseConditionEnum.WATCH
                            ? 'warn'
                            : 'ok'
                      }
                    >
                      {sentence(condition.condition)}
                    </Chip>
                  </Flex>
                  <p className="type-body-s mb-0 mt-1 text-ink-2">
                    {[
                      condition.drinking === null
                        ? null
                        : condition.drinking
                          ? 'Drinking'
                          : 'Not drinking',
                      condition.eating === null ? null : condition.eating ? 'Eating' : 'Not eating',
                      condition.note,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {condition.photos.length > 0 && (
                    <div className="mt-3">
                      <Flex wrap gap={8}>
                        {condition.photos.map((photo) => (
                          <Photo key={photo.id} photo={photo} />
                        ))}
                      </Flex>
                    </div>
                  )}
                </div>
              ))}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
