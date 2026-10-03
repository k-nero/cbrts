import type { FC, ReactNode } from 'react';

import { cx } from './tone';

type Props = {
  /** Always a range, never one number: "$11,300 – $16,100". */
  range: ReactNode;
  /** The figures that drive it, in mono: Horses 2, Grooms 1 per 3 horses → 1, … */
  drivers?: { label: ReactNode; value: ReactNode }[];
  notice?: ReactNode;
  className?: string;
};

const NOTICE =
  'Not a quote. A logistics manager prices the move after review; the issued quotation is itemised and valid for 7 days.';

/**
 * The customer's instant estimate (DESIGN.md, Estimate card): the same card on every request step,
 * recomputed on every change, never stored and never acceptable (BR-Q-10, BR-Q-11).
 */
export const EstimateCard: FC<Props> = ({ range, drivers = [], notice = NOTICE, className }) => (
  <section
    className={cx('flex flex-col gap-3.5 rounded-lg border border-line bg-card p-6', className)}
  >
    <span className="type-label-m text-ink-2">Indicative range</span>
    <span className="type-display-m text-ink">{range}</span>
    <p className="type-body-s m-0 text-ink-3">{notice}</p>
    {drivers.length > 0 && (
      <dl className="m-0 flex flex-col gap-2 border-t border-line pt-3.5">
        {drivers.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <dt className="type-body-s text-ink-2">{d.label}</dt>
            <dd className="type-data m-0 text-ink">{d.value}</dd>
          </div>
        ))}
      </dl>
    )}
  </section>
);
