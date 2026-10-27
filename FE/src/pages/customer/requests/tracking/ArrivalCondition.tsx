import type { FC } from 'react';

import { Chip, cx, Panel } from '@/components/ui';
import type { TripView } from '@/interfaces';
import { formatTime } from '@/lib/utils';

const TONE = { SOUND: 'ok', WATCH: 'warn', CONCERN: 'bad' } as const;
const WORD = { SOUND: 'Sound', WATCH: 'Watch', CONCERN: 'Concern' } as const;

/**
 * Arrival condition (Figma "Tracking · Delivered"): each horse as the groom logged it at the handover, with
 * who received the horses.
 */
export const ArrivalCondition: FC<{ trip: TripView }> = ({ trip }) => {
  const handover = trip.handover;
  const record = trip.records.find((r) => r.id === handover?.recordId);
  if (!handover?.handedOverAt || !record) return null;
  return (
    <Panel title="Arrival condition" flush>
      <ul className="m-0 list-none p-0">
        {record.conditions.map((c, i) => (
          <li
            key={c.horseId}
            className={cx(
              'grid grid-cols-[140px_minmax(0,1fr)_auto] items-center gap-4 px-6 py-3',
              i > 0 && 'border-t border-line',
            )}
          >
            <span className="type-h4 text-ink">{c.horseName}</span>
            <span className="type-body-s text-ink-2">{c.note ?? WORD[c.condition]}</span>
            <Chip tone={TONE[c.condition]}>{WORD[c.condition]}</Chip>
          </li>
        ))}
      </ul>
      <p className="type-body-s m-0 border-t border-line px-6 py-3.5 text-ink-3">
        Logged at {formatTime(record.occurredAt)}
        {record.recordedBy ? ` by ${record.recordedBy}` : ''}. Handed over to{' '}
        {handover.receiverName ?? 'your receiver'}.
      </p>
    </Panel>
  );
};
