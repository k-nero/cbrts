import type { FC, ReactNode } from 'react';

import { Icon } from './Icon';
import { cx, Tone, TONE_FIGURE } from './tone';

type Props = {
  tone?: Tone;
  value: ReactNode;
  label: ReactNode;
  /**
   * The one case that matters most, under a hairline (Overview tiles): "Q-2026-0188 expires 30 Sep".
   * With onClick the tile opens the work behind the number.
   */
  lead?: ReactNode;
  onClick?: () => void;
  className?: string;
};

/**
 * A summary count (DESIGN.md, Stat tile), only where the counts are the point of the view; never
 * above a list that already shows the same counts.
 */
export const StatTile: FC<Props> = ({
  tone = 'neutral',
  value,
  label,
  lead,
  onClick,
  className,
}) => {
  const body = (
    <>
      <span className={cx('type-data-l', TONE_FIGURE[tone])}>{value}</span>
      <span className="type-body-s text-ink-3">{label}</span>
      {lead && (
        <span className="type-body-s mt-2 flex items-center justify-between gap-2 border-t border-line pt-2 text-ink-2">
          <span>{lead}</span>
          {onClick && <Icon name="arrow-right" size={14} />}
        </span>
      )}
    </>
  );
  const classes = cx(
    'flex min-w-[168px] flex-col gap-1 rounded-lg border border-line bg-card px-[18px] py-3.5 text-left',
    className,
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cx(classes, 'focus-ring cursor-pointer hover:border-line-strong')}
    >
      {body}
    </button>
  ) : (
    <div className={classes}>{body}</div>
  );
};
