import type { FC, ReactNode } from 'react';

import { Chip, cx, Icon, type Tone } from '@/components/ui';

/*
 * The landing page's pictures (docs/figma-plugin/src/03-pages.js, rulesCard and the feature
 * visuals). They show the rules at work on an example, never a real customer, horse or job
 * (PRODUCT.md, Absences).
 */

const RULES: { document: string; rule: string; date: string }[] = [
  {
    document: 'Equine passport',
    rule: 'Valid through arrival + 2 days',
    date: 'Valid through 20 Oct',
  },
  {
    document: 'Influenza vaccination',
    rule: 'Influenza booster given 7–180 days before departure',
    date: '21 Apr–11 Oct',
  },
  {
    document: 'EIA (Coggins) test',
    rule: 'Sampled within 60 days of departure',
    date: 'On or after 19 Aug',
  },
  {
    document: 'Export health certificate',
    rule: 'Issued within 10 days of departure',
    date: '8–18 Oct',
  },
  { document: 'Proof of ownership', rule: 'Presence only', date: 'Any date' },
];

/** The hero's picture: the document rules worked out for an example route and departure date. */
export const RulesCard: FC = () => (
  <aside
    aria-label="Example: document dates for one route"
    className="flex w-[480px] shrink-0 flex-col gap-5 rounded-xl border border-line bg-card p-7 shadow-card"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span className="type-h4 text-ink">Ho Chi Minh City → Phnom Penh</span>
        <span className="type-body-s text-ink-2">By road through Mộc Bài – Bavet</span>
      </div>
      <Chip dot={false}>Example</Chip>
    </div>
    <div className="flex items-center justify-between gap-4">
      <span className="type-body-s text-ink-2">If you depart on</span>
      <span className="type-data text-ink">18 Oct 2026</span>
    </div>
    <hr className="m-0 border-0 border-t border-line" />
    <span className="type-body-s text-ink-3">Each document must carry</span>
    <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
      {RULES.map((r) => (
        <li key={r.document} className="flex items-center gap-4">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="type-label-m text-ink">{r.document}</span>
            <span className="type-body-s text-ink-3">{r.rule}</span>
          </span>
          <span className="type-data shrink-0 text-right text-ink">{r.date}</span>
        </li>
      ))}
    </ul>
    <p className="type-body-s m-0 flex gap-2.5 rounded-md bg-sunken px-3.5 py-3 text-ink-2">
      <Icon name="info" size={16} className="mt-0.5 shrink-0" />
      Your request works these dates out for your own route, and flags any document that lapses
      before you arrive.
    </p>
  </aside>
);

/* Every visual is one height, so the feature titles line up (FEATURE_VISUAL_H). */
const Visual: FC<{ children: ReactNode; label: string; className?: string }> = ({
  children,
  label,
  className,
}) => (
  <figure
    aria-label={label}
    className={cx('m-0 flex h-[132px] flex-col gap-2 rounded-md bg-sunken p-4', className)}
  >
    {children}
  </figure>
);

/** A test valid today that lapses in transit: its date sits before the 60-day window. */
export const WindowVisual: FC = () => (
  <Visual label="An EIA test dated 2 Aug falls before the 60-day window for an 18 Oct departure">
    <div className="relative h-7 w-full" aria-hidden>
      <span className="absolute top-[13px] h-0.5 w-full bg-line-strong" />
      <span className="absolute top-[9px] left-1/2 h-2.5 w-[49%] rounded-full border border-ok-line bg-ok-soft" />
      <span className="absolute top-2 left-[30%] size-3 rounded-full bg-warn" />
      <span className="absolute top-0 right-0 h-7 w-0.5 bg-ink" />
    </div>
    <span className="flex flex-wrap gap-x-2 gap-y-1">
      <span className="type-caption text-warn">Test 2 Aug</span>
      <span className="type-caption text-ok">60-day window</span>
      <span className="type-caption text-ink">Departs 18 Oct</span>
    </span>
    <Chip tone="warn">Expires in transit</Chip>
  </Visual>
);

const STALL_ROWS: [string, number, string][] = [
  ['Economy', 3, '3 × 32 in'],
  ['Business', 2, '2 × 48 in'],
  ['First', 1, '1 × 96 in'],
];

/** One 96 in air position holds three, two or one horse by class. */
export const WidthVisual: FC = () => (
  <Visual
    label="One 96 inch air stall position: three horses in Economy, two in Business, one in First"
    className="justify-center gap-2.5"
  >
    {STALL_ROWS.map(([cls, n, caption]) => (
      <span key={cls} className="flex items-center gap-2.5">
        <span className="type-body-s w-16 shrink-0 text-ink-2">{cls}</span>
        <span className="flex h-[18px] flex-1 gap-[3px]" aria-hidden>
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              className={cx('flex-1 rounded-sm', i === 0 ? 'bg-stall-standard' : 'bg-stall-box')}
            />
          ))}
        </span>
        <span className="type-caption shrink-0 text-ink-3">{caption}</span>
      </span>
    ))}
  </Visual>
);

const QUOTE_ROWS: [string, Tone, string, string][] = [
  ['Air stall position', 'neutral', 'Fixed', '$16,800'],
  ['Pre-export isolation', 'neutral', 'Fixed', '$2,170'],
  ['Waiting time, 2 h', 'warn', 'Estimated', '$190'],
];

/** Quote lines say which can move on the final invoice. */
export const QuoteVisual: FC = () => (
  <Visual label="Three quotation lines: two fixed, one estimated" className="gap-2.5">
    {QUOTE_ROWS.map(([line, tone, tag, amount]) => (
      <span key={line} className="flex items-center gap-2.5">
        <span className="type-body-s flex-1 text-ink">{line}</span>
        <Chip tone={tone} dot={false}>
          {tag}
        </Chip>
        <span className="type-caption w-[60px] shrink-0 text-right text-ink">{amount}</span>
      </span>
    ))}
  </Visual>
);
