import type { FC, ReactNode } from 'react';

import { Chip } from './Chip';
import { Icon } from './Icon';
import { Perforation } from './Perforation';
import { cx, type Tone, TONE_FG } from './tone';
import { End } from './End';

export type DraftPassRow = {
  label: string;
  /** Null: no step has set it yet, so the row says which one will ("Set on step 2"). */
  value: ReactNode | null;
  step?: number;
  /** Dates, times and counts are DM Mono. */
  mono?: boolean;
  /** A value a step got wrong ("5 Oct · too soon") or one we can't do ("Not run yet"). */
  tone?: Exclude<Tone, 'neutral' | 'ok' | 'info'>;
};

type Props = {
  chip?: { tone: Tone; label: string };
  /** The two cities; null until both are set, shown as "···" over From and To. */
  from: string | null;
  to: string | null;
  mode?: 'road' | 'air';
  rows: DraftPassRow[];
  stubLabel?: string;
  /** Null shows an em dash: there is no range before pricing. */
  range?: string | null;
  rangeSub: ReactNode;
  className?: string;
};

/**
 * The request drawn as the pass it becomes once approved (DESIGN.md, Draft pass; 03-pages.js,
 * draftPass): it fills in as the wizard's steps are done, and its stub never shows a single price.
 * In review and the quotation reuse it with their own chip and stub.
 */
export const DraftPass: FC<Props> = ({
  chip = { tone: 'neutral', label: 'Draft' },
  from,
  to,
  mode = 'road',
  rows,
  stubLabel = 'Indicative range',
  range = null,
  rangeSub,
  className,
}) => {
  const set = Boolean(from && to);
  const line = cx('h-px flex-1', set ? 'bg-line-strong' : 'bg-line');
  return (
    <section
      aria-label="Your move"
      className={cx(
        'flex flex-col overflow-hidden rounded-xl border border-line bg-card shadow-card',
        className,
      )}
    >
      <div className="flex flex-col gap-4.5 px-6 pt-5 pb-4.5">
        <div className="flex items-center justify-between">
          <span className="type-label-s text-ink-3">Your move</span>
          <Chip tone={chip.tone} dot={chip.tone !== 'neutral'}>
            {chip.label}
          </Chip>
        </div>
        <div className="flex items-center gap-3.5">
          <End city={set ? from : null} placeholder="From" align="start" />
          <span aria-hidden className="flex min-w-10 flex-1 items-center gap-2">
            <span className={line} />
            <Icon
              name={mode === 'air' ? 'plane' : 'truck'}
              size={18}
              className={set ? 'text-ink-2' : 'text-ink-3'}
            />
            <span className={line} />
          </span>
          <End city={set ? to : null} placeholder="To" align="end" />
        </div>
        <dl className="m-0 flex flex-col">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-4 border-t border-line py-2.5"
            >
              <dt className="type-body-s text-ink-3">{r.label}</dt>
              <dd className="m-0 text-right">
                {r.value === null ? (
                  <span className="type-body-s text-ink-3">Set on step {r.step}</span>
                ) : (
                  <span
                    className={cx(
                      r.mono ? 'type-data' : 'type-label-s',
                      r.tone ? TONE_FG[r.tone] : 'text-ink',
                    )}
                  >
                    {r.value}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <Perforation direction="horizontal" inset={12} />
      <div className="flex flex-col gap-1.5 bg-sunken px-6 pt-4 pb-5.5">
        <span className="type-body-s text-ink-2">{stubLabel}</span>
        <span className={cx('type-display-m', range ? 'text-ink' : 'text-ink-3')}>
          {range ?? '—'}
        </span>
        <span className="type-body-s text-ink-3">{rangeSub}</span>
      </div>
    </section>
  );
};
