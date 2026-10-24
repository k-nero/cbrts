import type { FC } from 'react';
import { Flex } from 'antd';

import { Photo } from './Photo';
import { formatTime, sentence } from './tripFormat';

import { Chip, Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';

/** A horse's condition on arrival, toned as the cab records it: sound is ok, watch is warn, concern is bad. */
const conditionTone = (condition: string) =>
  condition === 'SOUND' ? 'ok' : condition === 'WATCH' ? 'warn' : 'bad';

/**
 * The handover as recorded (US-F6-01): who received the horses and confirmed it, when, what was handed over, and
 * each horse's condition on arrival with its photos. Quoted from the one stored record, never edited.
 */
export const HandoverRecord: FC<{ trip: TripView }> = ({ trip }) => {
  const handover = trip.handover;
  if (!handover?.handedOverAt) return null;
  const record = trip.records.find((r) => r.id === handover.recordId);
  return (
    <Panel title="Handover" extra={<Chip tone="ok">Handed over</Chip>}>
      <Flex vertical gap={16}>
        <p className="type-body-m m-0 text-ink">
          {handover.receiverName} received {trip.jobCode} on {formatTime(handover.handedOverAt)}
          {handover.receiverConfirmed ? ' and confirmed it on the tablet' : ''}.
          {record?.recordedBy ? ` Recorded by ${record.recordedBy}.` : ''}
        </p>
        {record?.text && (
          <Flex vertical gap={2}>
            <span className="type-caption text-ink-3">What was handed over</span>
            <span className="type-body-m text-ink">{record.text}</span>
          </Flex>
        )}
        {record && record.conditions.length > 0 && (
          <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">
            {record.conditions.map((c) => (
              <li key={c.horseId} className="flex flex-col gap-2 px-4 py-3">
                <Flex align="center" justify="space-between" gap={12}>
                  <span className="type-label-m text-ink">{c.horseName}</span>
                  <Chip tone={conditionTone(c.condition)}>{sentence(c.condition)}</Chip>
                </Flex>
                {c.note && <span className="type-body-s text-ink-2">{c.note}</span>}
                {c.photos.length > 0 && (
                  <Flex wrap gap={8}>
                    {c.photos.map((photo) => (
                      <Photo key={photo.id} photo={photo} />
                    ))}
                  </Flex>
                )}
              </li>
            ))}
          </ul>
        )}
      </Flex>
    </Panel>
  );
};
