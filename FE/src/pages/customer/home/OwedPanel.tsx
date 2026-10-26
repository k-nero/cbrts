import { type FC } from 'react';
import { Flex } from 'antd';

import { Button, Chip, OwedItem } from '@/components/ui';
import type { CustomerHome, OwedEntry } from '@/interfaces';
import { daysUntil, dueLeft, formatDate, ict } from '@/lib/utils';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ---------- the lead block: what is owed ---------- */

type OwedProps = {
  home: CustomerHome;
  /** Opens where the item is answered: the document, the quotation, or the request. */
  onAct: (item: OwedEntry) => void;
  onAllRequests: () => void;
};

/** The two-line deadline: time left and the date, or that no date is set yet. */
const deadlineOf = (o: OwedEntry, asOf: string) =>
  o.dueAt
    ? {
        left: dueLeft(o.dueAt, asOf),
        date:
          daysUntil(o.dueAt, asOf) < 0
            ? `Was due ${ict(o.dueAt).format('D MMM')}`
            : formatDate(o.dueAt),
      }
    : { left: 'No date yet', date: 'Set with departure' };

/**
 * "You owe N items" across every request, soonest first (DESIGN.md, Owed Item). Only the top
 * item's action is gold; the rest are Secondary.
 */
export const OwedPanel: FC<OwedProps> = ({ home, onAct, onAllRequests }) => {
  const overdue = home.owed.filter((o) => o.urgency === 'overdue').length;

  return (
    <section
      aria-labelledby="owed-title"
      className="overflow-hidden rounded-lg border border-line bg-card"
    >
      <header className="px-5 pt-5 pb-4">
        <Flex align="center" justify="space-between" gap={24}>
          <Flex vertical gap={4}>
            <h2 id="owed-title" className="type-h3 m-0 text-ink">
              You owe {plural(home.owed.length, 'item')}
            </h2>
            <p className="type-body-s m-0 max-w-[620px] text-ink-2">
              Across {plural(home.owedRequestCount, 'request')}, soonest first. Each upload is
              checked against your travel dates the moment you send it.
            </p>
          </Flex>
          {overdue > 0 && <Chip tone="bad">{overdue} overdue</Chip>}
        </Flex>
      </header>
      {home.owed.map((o, i) => (
        <OwedItem
          key={o.id}
          urgency={o.urgency}
          title={o.title}
          subject={o.subject}
          reason={o.reason}
          deadline={deadlineOf(o, home.asOf)}
          action={
            <Button
              size="sm"
              variant={i === 0 ? 'primary' : 'secondary'}
              leadingIcon={o.actionIcon ?? undefined}
              onClick={() => onAct(o)}
            >
              {o.actionLabel}
            </Button>
          }
        />
      ))}
      <footer className="border-t border-line bg-sunken px-3 py-2.5">
        <Button size="sm" variant="ghost" onClick={onAllRequests}>
          See each request in My requests
        </Button>
      </footer>
    </section>
  );
};
