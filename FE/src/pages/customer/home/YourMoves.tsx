import { type FC } from 'react';
import { Flex } from 'antd';
import { motion } from 'motion/react';

import { Button, cx, Icon, Perforation, StageMark, type Tone, TONE_FG } from '@/components/ui';
import type { CustomerHome, MoveEntry } from '@/interfaces';
import { settle, stagger } from '@/lib/motion';
import { formatDate, formatDayTime, spanUntil } from '@/lib/utils';

/* "What holds it" is quiet Mist when nothing is needed; every other tone speaks in its colour. */
const holdsTone = (tone: Tone) => (tone === 'neutral' ? 'text-ink-2' : TONE_FG[tone]);

/* ---------- your moves ---------- */

const departs = (m: MoveEntry, asOf: string) =>
  m.arrivesAt
    ? { left: `Arrives in ${spanUntil(m.arrivesAt, asOf)}`, date: formatDayTime(m.arrivesAt) }
    : m.departsAt
      ? { left: `In ${spanUntil(m.departsAt, asOf)}`, date: formatDate(m.departsAt) }
      : { left: 'No date yet', date: 'Choose it in the draft' };

type MovesProps = { home: CustomerHome; onOpen: (m: MoveEntry) => void; onAll: () => void };

/**
 * One small pass per request (03-pages.js, moveRow): the route and where it stands, a tear line,
 * then a stub with the departure and the way in.
 */
export const YourMoves: FC<MovesProps> = ({ home, onOpen, onAll }) => (
  <Flex component="section" vertical gap={12} className="min-w-0" aria-labelledby="moves-title">
    <Flex component="header" align="end" justify="space-between" gap={16}>
      <Flex vertical gap={2}>
        <h2 id="moves-title" className="type-h4 m-0 text-ink">
          Your moves
        </h2>
        <p className="type-body-s m-0 text-ink-3">
          {home.moves.length === 0
            ? 'Each request you send appears here until its horses are handed over.'
            : `${home.moves.length} in progress, ${home.owed.length ? 'the one that needs you most first' : 'soonest departure first'}. Each opens its request.`}
        </p>
      </Flex>
      <Button size="sm" variant="ghost" trailingIcon="arrow-right" onClick={onAll}>
        My requests
      </Button>
    </Flex>
    {home.moves.length === 0 && (
      <div className="rounded-lg border border-dashed border-line-strong bg-card px-5 py-8 text-center">
        <p className="type-body-m m-0 text-ink-2">No moves in progress.</p>
      </div>
    )}
    <motion.ul
      className="m-0 flex list-none flex-col gap-3 p-0"
      variants={stagger(0.06, 0.15)}
      initial="hidden"
      animate="shown"
    >
      {home.moves.map((m) => {
        const d = departs(m, home.asOf);
        return (
          <motion.li key={m.requestCode} variants={settle}>
            <button
              type="button"
              onClick={() => onOpen(m)}
              aria-label={`Open ${m.requestCode}, ${m.route}`}
              className={cx(
                'focus-ring group flex w-full cursor-pointer overflow-hidden rounded-lg border',
                'border-line bg-card p-0 text-left transition-colors hover:border-line-strong',
              )}
            >
              <Flex
                component="span"
                align="center"
                className="min-w-0 flex-1 transition-colors group-hover:bg-raised"
              >
                <span className="block min-w-0 flex-1 px-5 py-4">
                  <Flex component="span" align="center" gap={24}>
                    <Flex component="span" vertical gap={4} className="min-w-0 flex-1">
                      <span className="type-h4 text-ink">{m.route}</span>
                      <Flex component="span" align="baseline" gap={8}>
                        <span className="type-caption shrink-0 text-ink-2">{m.requestCode}</span>
                        <span className="type-body-s text-ink-3">{m.detail}</span>
                      </Flex>
                    </Flex>
                    <Flex component="span" vertical gap={4} className="w-[200px] shrink-0">
                      <StageMark stage={m.stage} />
                      <span className={cx('type-label-s', holdsTone(m.holds.tone))}>
                        {m.holds.text}
                      </span>
                    </Flex>
                  </Flex>
                </span>
              </Flex>
              <Perforation gap={6} inset={6} />
              <Flex component="span" align="center" className="w-[190px] shrink-0 bg-sunken">
                <span className="block min-w-0 flex-1 py-3.5 pr-4 pl-5">
                  <Flex component="span" align="center" gap={12}>
                    <Flex component="span" vertical gap={2} className="min-w-0 flex-1">
                      <span className="type-label-m text-ink">{d.left}</span>
                      <span className="type-caption text-ink-3">{d.date}</span>
                    </Flex>
                    <Icon
                      name="arrow-right"
                      size={16}
                      className="shrink-0 text-ink-3 transition-colors group-hover:text-ink"
                    />
                  </Flex>
                </span>
              </Flex>
            </button>
          </motion.li>
        );
      })}
    </motion.ul>
  </Flex>
);
