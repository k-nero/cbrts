import type { FC, ReactNode } from 'react';

import type { RouteStopKind } from '@/interfaces';
import { Icon, type IconName } from './Icon';
import { cx } from './tone';

/** on_the_way: another client's stop on a shared trailer, as the customer sees it (no place). */
export type StopKind = Lowercase<RouteStopKind> | 'on_the_way';

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
  on_the_way: { icon: 'truck', label: 'Shared trailer' },
};

const FALLBACK: { icon: IconName; label: string } = { icon: 'check', label: 'Stop' };

type Props = {
  kind: StopKind | RouteStopKind | 'ON_THE_WAY';
  /** The place, in Fraunces: "Mộc Bài – Bavet". */
  stop: ReactNode;
  time: ReactNode;
  details?: ReactNode;
  /** A chip for the checkpoint's state (Cleared, Next). */
  status?: ReactNode;
  className?: string;
};

/** A route plan or journey log entry (DESIGN.md, Timeline stop). */
export const TimelineStop: FC<Props> = ({ kind, stop, time, details, status, className }) => {
  const normalizedKind = kind.toLowerCase() as StopKind;
  const config = KIND[normalizedKind] ?? FALLBACK;

  return (
    <div className={cx('flex gap-4', className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line-strong bg-muted text-ink-2">
        <Icon name={config.icon} size={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border border-line bg-card px-5 py-4">
        <span className="flex items-center justify-between gap-4">
          <span className="type-h4 text-ink">{stop}</span>
          <span className="flex items-center gap-3">
            {status}
            <span className="type-data text-ink-2">{time}</span>
          </span>
        </span>
        <span className="type-mono-label text-ink-3">{config.label}</span>
        {details && <span className="type-body-s text-ink-2">{details}</span>}
      </div>
    </div>
  );
};
