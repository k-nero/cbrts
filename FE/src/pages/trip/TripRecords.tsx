import { useMemo } from 'react';

import { Photo } from './Photo';
import { eventLabels, formatTime, sentence } from './tripFormat';

import { Chip, Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';
import { HorseConditionEnum } from '@/interfaces';

export function TripRecords({ trip }: { trip: TripView }) {
  const records = useMemo(
    () => [...trip.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [trip.records],
  );
  return (
    <Panel title="Trip journey log">
      {records.length === 0 ? (
        <p className="type-body-s m-0 text-ink-3">No trip updates have been recorded yet.</p>
      ) : (
        <ol className="m-0 list-none divide-y divide-line p-0">
          {records.map((record) => (
            <li key={record.id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="type-body-m">
                  {record.checkpointName ?? 'Trip update'} · {eventLabels[record.kind]}
                </strong>
                <span className="type-data text-ink-3">{formatTime(record.occurredAt)}</span>
              </div>
              {record.text && <p className="type-body-s mb-2 mt-1 text-ink-2">{record.text}</p>}
              {record.conditions.map((condition) => (
                <div key={condition.horseId} className="mt-3 rounded-lg bg-raised p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                  </div>
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
                    <div className="mt-3 flex flex-wrap gap-2">
                      {condition.photos.map((photo) => (
                        <Photo key={photo.id} photo={photo} />
                      ))}
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
