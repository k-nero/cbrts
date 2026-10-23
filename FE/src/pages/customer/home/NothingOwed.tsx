import { type FC } from 'react';
import { Flex } from 'antd';

import { Icon } from '@/components/ui';
import type { NextEvent } from '@/interfaces';
import { formatDate, formatTime, spanUntil } from '@/lib/utils';

/* ---------- the lead block: nothing owed ---------- */

const nextDate = (e: NextEvent) =>
  e.dateStyle === 'time'
    ? formatTime(e.at)
    : e.dateStyle === 'dayTime'
      ? `${formatDate(e.at)}, ${formatTime(e.at)}`
      : formatDate(e.at);

/** "Nothing needed from you", with the next event stated twice. Nothing on the page is gold. */
export const NothingOwed: FC<{ event: NextEvent; asOf: string }> = ({ event, asOf }) => (
  <section className="rounded-lg border border-line bg-card p-5">
    <Flex align="center" gap={16}>
      <Flex
        component="span"
        align="center"
        justify="center"
        className="size-10 shrink-0 rounded-full bg-ok-soft text-ok"
      >
        <Icon name="check" size={20} />
      </Flex>
      <Flex vertical gap={4} className="min-w-0 flex-1">
        <h2 className="type-h3 m-0 text-ink">{event.title}</h2>
        <p className="type-body-m m-0 text-ink-2">{event.body}</p>
      </Flex>
      <Flex component="span" vertical align="end" gap={2} className="w-40 shrink-0 text-right">
        <span className="type-label-s text-info">
          {event.verb} in {spanUntil(event.at, asOf)}
        </span>
        <span className="type-caption text-ink-3">{nextDate(event)}</span>
      </Flex>
    </Flex>
  </section>
);
