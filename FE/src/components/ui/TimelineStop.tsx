import type { FC, ReactNode } from 'react';

import { Icon, type IconName } from './Icon';
import { cx } from './tone';

export type StopKind =
  | 'pickup'
  | 'border'
  | 'welfare'
  | 'delivery'
  | 'refuelling'
  | 'quarantine'
  | 'airport_out'
  | 'airport_in';

/* The icon names the kind; status colours stay for state, so every kind is neutral. */
const KIND: Record<StopKind, { icon: IconName; label: string }> = {
  pickup: { icon: 'arrow-up', label: 'Pickup' },
  border: { icon: 'shield', label: 'Border' },
  welfare: { icon: 'coffee', label: 'Welfare stop' },
  delivery: { icon: 'check', label: 'Delivery' },
  refuelling: { icon: 'truck', label: 'Refuelling' },
  quarantine: { icon: 'shield', label: 'Quarantine' },
  airport_out: { icon: 'plane', label: 'Airport departure' },
  airport_in: { icon: 'plane', label: 'Airport arrival' },
};

type Props = {
  kind: StopKind;
  /** The place, in Fraunces: "Mộc Bài – Bavet". */
  stop: ReactNode;
  time: ReactNode;
  details?: ReactNode;
  /** A chip for the checkpoint's state (Cleared, Next). */
  status?: ReactNode;
  className?: string;
};

/** A route plan or journey log entry (DESIGN.md, Timeline stop). */
export const TimelineStop: FC<Props> = ({ kind, stop, time, details, status, className }) => (
  <div className={cx('flex gap-4', className)}>
    <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line-strong bg-muted text-ink-2">
      <Icon name={KIND[kind]?.icon ?? 'check'} size={18} />
    </span>
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border border-line bg-card px-5 py-4">
      <span className="flex items-center justify-between gap-4">
        <span className="type-h4 text-ink">{stop}</span>
        <span className="flex items-center gap-3">
          {status}
          <span className="type-data text-ink-2">{time}</span>
        </span>
      </span>
      <span className="type-mono-label text-ink-3">{KIND[kind]?.label ?? 'Stop'}</span>
      {details && <span className="type-body-s text-ink-2">{details}</span>}
    </div>
  </div>
);
