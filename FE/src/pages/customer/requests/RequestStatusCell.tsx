import { type FC } from 'react';
import { Flex } from 'antd';

import { Chip, cx, type Tone, TONE_FG } from '@/components/ui';
import type { RequestSummary } from '@/interfaces';
import { dueLeft, formatDay, requestStatusChip } from '@/lib/utils';

/* As Your moves says it: quiet when nothing is needed, in its tone when the club owes the step. */
const holdsTone = (tone: Tone) => (tone === 'neutral' ? 'text-ink-2' : TONE_FG[tone]);

/**
 * Where a request stands and what holds it: the status chip, then the next step in words, and the
 * day it is due by twice, as a date and as the days left (the surface brief: every deadline twice).
 */
export const RequestStatusCell: FC<{ row: RequestSummary; now: string }> = ({ row: r, now }) => {
  // After approval the request stays Approved; its move says where it is.
  const chip = r.move ? { tone: r.move.tone, label: r.move.label } : requestStatusChip(r.status);
  return (
    <Flex component="span" vertical align="start" gap={6}>
      <Chip tone={chip.tone}>{chip.label}</Chip>
      {r.holds && (
        <span className={cx('type-body-s', holdsTone(r.holds.tone))}>{r.holds.text}</span>
      )}
      {r.dueOn && (
        <span className="type-caption text-ink-2">
          By {formatDay(r.dueOn)} · {dueLeft(r.dueOn, now)}
        </span>
      )}
    </Flex>
  );
};
