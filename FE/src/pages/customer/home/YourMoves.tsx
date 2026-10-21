import { type FC } from 'react';

import { Button, cx, Icon, Perforation, StageMark, type Tone, TONE_FG } from '@/components/ui';
import type { CustomerHome, MoveEntry } from '@/interfaces';
import { formatDate, formatDayTime, spanUntil } from '@/lib/utils';

/* "What holds it" is quiet Mist when nothing is needed; every other tone speaks in its colour. */
const holdsTone = (tone: Tone) => (tone === 'neutral' ? 'text-ink-2' : TONE_FG[tone]);

/* ---------- your moves ---------- */

const departs = (m: MoveEntry, asOf: string) =>
  m.arrivesAt
    ? { left: `Arrives in ${spanUntil(m.arrivesAt, asOf)}`, date: formatDayTime(m.arrivesAt) }
    : { left: `In ${spanUntil(m.departsAt, asOf)}`, date: formatDate(m.departsAt) };

type MovesProps = { home: CustomerHome; onOpen: (m: MoveEntry) => void; onAll: () => void };

/**
 * One small pass per request (03-pages.js, moveRow): the route and where it stands, a tear line,
 * then a stub with the departure and the way in.
 */
export const YourMoves: FC<MovesProps> = ({ home, onOpen, onAll }) => (
  <section className="flex min-w-0 flex-col gap-3" aria-labelledby="moves-title">
    <header className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 id="moves-title" className="type-h4 m-0 text-ink">
          Your moves
        </h2>
        <p className="type-body-s m-0 text-ink-3">
          {home.moves.length} in progress,{' '}
          {home.owed.length ? 'the one that needs you most first' : 'soonest departure first'}. Each
          opens its request.
        </p>
      </div>
      <Button size="sm" variant="ghost" trailingIcon="arrow-right" onClick={onAll}>
        My requests
      </Button>
    </header>
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {home.moves.map((m) => {
        const d = departs(m, home.asOf);
        return (
          <li key={m.requestCode}>
            <button
              type="button"
              onClick={() => onOpen(m)}
              aria-label={`Open ${m.requestCode}, ${m.route}`}
              className={cx(
                'focus-ring group flex w-full cursor-pointer overflow-hidden rounded-lg border',
                'border-line bg-card p-0 text-left transition-colors hover:border-line-strong',
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-6 px-5 py-4 transition-colors group-hover:bg-raised">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="type-h4 text-ink">{m.route}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="type-caption shrink-0 text-ink-2">{m.requestCode}</span>
                    <span className="type-body-s text-ink-3">{m.detail}</span>
                  </span>
                </span>
                <span className="flex w-[200px] shrink-0 flex-col gap-1">
                  <StageMark stage={m.stage} />
                  <span className={cx('type-label-s', holdsTone(m.holds.tone))}>
                    {m.holds.text}
                  </span>
                </span>
              </span>
              <Perforation gap={6} inset={6} />
              <span className="flex w-[190px] shrink-0 items-center gap-3 bg-sunken py-3.5 pr-4 pl-5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="type-label-m text-ink">{d.left}</span>
                  <span className="type-caption text-ink-3">{d.date}</span>
                </span>
                <Icon
                  name="arrow-right"
                  size={16}
                  className="shrink-0 text-ink-3 transition-colors group-hover:text-ink"
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  </section>
);
