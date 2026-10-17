import type { FC, ReactNode } from 'react';

import { Icon, type IconName } from './Icon';
import { cx } from './tone';

export type StallType = 'standard' | 'box' | 'climate';
export type StallState = 'empty' | 'occupied' | 'conflict' | 'target';

const TYPE: Record<StallType, { label: string; icon: IconName; text: string; border: string }> = {
  standard: {
    label: 'Standard',
    icon: 'stall',
    text: 'text-stall-standard',
    border: 'border-stall-standard',
  },
  box: { label: 'Box', icon: 'box', text: 'text-stall-box', border: 'border-stall-box' },
  climate: {
    label: 'Climate',
    icon: 'snowflake',
    text: 'text-stall-climate',
    border: 'border-stall-climate',
  },
};

type Props = {
  type: StallType;
  state: StallState;
  /** "Stall 1". */
  stall: ReactNode;
  horse?: ReactNode;
  /** "Gelding · 510 kg · Calm". */
  meta?: ReactNode;
  /** The broken rule in words: "Needs a box stall". */
  issue?: ReactNode;
  /** While a horse is selected: "Place Silver Bell here". */
  targetHint?: ReactNode;
  onClick?: () => void;
  className?: string;
};

/**
 * One trailer or air-stall position (DESIGN.md, Stall tile). The type is a colour and a label;
 * dashed means "a place something can go"; a conflict names its rule in words. At least 128 px
 * tall, it grows to fit a long conflict (several broken rules) and fills its grid cell, so both
 * stalls in a row keep one height.
 */
export const StallTile: FC<Props> = ({
  type,
  state,
  stall,
  horse,
  meta,
  issue,
  targetHint,
  onClick,
  className,
}) => {
  const t = TYPE[type];
  const classes = cx(
    'flex h-full min-h-32 w-full flex-col gap-2.5 rounded-md p-3.5 text-left',
    state === 'empty' && cx('border border-dashed', t.border),
    state === 'target' && 'border border-dashed border-gold bg-gold-soft',
    state === 'occupied' && cx('border-[1.5px] bg-raised', t.border),
    state === 'conflict' && 'border-[1.5px] border-bad bg-raised',
    onClick && 'focus-ring cursor-pointer',
    className,
  );
  const body = (
    <>
      <span className="flex items-center justify-between">
        <span className="type-chip text-ink-3">{stall}</span>
        <span className="flex items-center gap-1.5">
          <Icon name={t.icon} size={14} className={t.text} />
          <span className="type-chip text-ink-2">{t.label}</span>
        </span>
      </span>
      {state === 'empty' && <span className="type-body-s text-ink-3">Drop a horse here</span>}
      {state === 'target' && <span className="type-label-s text-gold-ink">{targetHint}</span>}
      {(state === 'occupied' || state === 'conflict') && (
        <span className="flex flex-col gap-0.5">
          <span className="type-h4 text-ink">{horse}</span>
          {meta && <span className="type-caption text-ink-3">{meta}</span>}
        </span>
      )}
      {state === 'conflict' && issue && (
        <span className="flex items-start gap-1.5 text-bad">
          <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
          <span className="type-body-s">{issue}</span>
        </span>
      )}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={classes}>
      {body}
    </button>
  ) : (
    <div className={classes}>{body}</div>
  );
};
