import type { FC } from 'react';
import { Link } from 'react-router-dom';

import { cx, Icon, type Tone, TONE_FG } from '@/components/ui';

type Props = {
  figure: number;
  /** What it counts: "Awaiting review". */
  label: string;
  /** The one case that matters most, or what an empty tile means. */
  lead: string;
  tone: Tone;
  /** The list behind the figure, filtered to it. */
  to: string;
};

/**
 * An Overview tile (DESIGN.md, Overview tiles): the figure, what it counts, a hairline, then the one case that
 * matters most with an arrow. The whole tile opens the list behind it.
 */
export const OverviewTile: FC<Props> = ({ figure, label, lead, tone, to }) => (
  <Link
    to={to}
    aria-label={`${figure} ${label}: open the list`}
    className="focus-ring group flex min-w-0 flex-1 flex-col gap-3 rounded-lg border border-line bg-card px-[18px] pt-4 pb-3.5 no-underline transition-colors hover:border-line-strong"
  >
    <span className="flex flex-col gap-0.5">
      <span className={cx('type-data-l', tone === 'neutral' ? 'text-ink' : TONE_FG[tone])}>
        {figure}
      </span>
      <span className="type-body-s text-ink-3">{label}</span>
    </span>
    <span className="mt-auto flex items-center gap-2 border-t border-line pt-2.5">
      <span className="type-label-s line-clamp-2 min-w-0 flex-1 text-ink-2">{lead}</span>
      <Icon
        name="arrow-right"
        size={16}
        className="shrink-0 text-ink-3 transition-colors group-hover:text-ink"
      />
    </span>
  </Link>
);
