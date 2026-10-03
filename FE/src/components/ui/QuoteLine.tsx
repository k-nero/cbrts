import type { FC, ReactNode } from 'react';

import { Chip } from './Chip';
import { cx } from './tone';

export type Certainty = 'fixed' | 'estimated' | 'overridden';

const TAG = {
  fixed: { tone: 'neutral', label: 'Fixed' },
  estimated: { tone: 'warn', label: 'Estimated' },
  overridden: { tone: 'info', label: 'Overridden' },
} as const;

type Props = {
  certainty: Certainty;
  description: ReactNode;
  /** "per day · 14 days". */
  basis: ReactNode;
  qty: ReactNode;
  /** Null shows "No rate" in the bad tone; it blocks issuing. */
  rate: ReactNode | null;
  amount: ReactNode | null;
  /** Estimated: why it may vary. Overridden: the reason, entered by the logistics manager. */
  note?: ReactNode;
  /** Overridden: the catalog value, struck through. */
  catalogAmount?: ReactNode;
  className?: string;
};

/**
 * An itemised cost line (DESIGN.md, Estimate and Quote Line), the same row on the builder and the
 * customer's quotation. Every figure is DM Mono; the total is never typed.
 */
export const QuoteLine: FC<Props> = ({
  certainty,
  description,
  basis,
  qty,
  rate,
  amount,
  note,
  catalogAmount,
  className,
}) => (
  <div
    className={cx(
      'grid grid-cols-[minmax(0,1fr)_48px_96px_120px_110px] items-start gap-4 border-b border-line bg-card px-5 py-3',
      className,
    )}
  >
    <span className="flex flex-col gap-[3px]">
      <span className="type-label-m text-ink">{description}</span>
      <span className="type-caption text-ink-3">{basis}</span>
      {note && (
        <span className={cx('type-body-s', certainty === 'overridden' ? 'text-info' : 'text-warn')}>
          {note}
        </span>
      )}
    </span>
    <span className="type-data text-right text-ink-2">{qty}</span>
    <span className={cx('type-data text-right', rate === null ? 'text-bad' : 'text-ink-2')}>
      {rate ?? 'No rate'}
    </span>
    <span className="flex flex-col items-end gap-0.5">
      <span className="type-data text-ink">{amount ?? '—'}</span>
      {certainty === 'overridden' && catalogAmount && (
        <span className="type-caption text-ink-3 line-through">{catalogAmount}</span>
      )}
    </span>
    <span className="flex justify-end">
      <Chip tone={TAG[certainty].tone} dot={false}>
        {TAG[certainty].label}
      </Chip>
    </span>
  </div>
);
