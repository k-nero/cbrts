import type { FC, ReactNode } from 'react';

import { cx } from './tone';
import { Screw } from './Screw';

/* Polished gold is a material: the same in both themes (DESIGN.md, Domain colours). */
const GOLD = 'linear-gradient(180deg, #FFF1A8 0%, #F2C94C 30%, #D4A017 60%, #A87A0C 100%)';

type Props = { name: ReactNode; subtitle?: ReactNode; className?: string };

/**
 * The horse's identity: an engraved, polished gold stall plate. While the horse is hovered (a
 * `group/horse` ancestor: the horse card or the coat band), a light sweeps across it; with reduced
 * motion it stays still.
 */
export const Nameplate: FC<Props> = ({ name, subtitle, className }) => (
  <div
    className={cx(
      // The shimmer needs a positioned plate; a caller that places it absolutely already gives it one,
      // and adding `relative` as well would override that placement.
      !className?.includes('absolute') && 'relative',
      'flex w-fit items-center gap-3 overflow-hidden rounded-sm px-3.5 py-2.5 shadow-brass',
      className,
    )}
    style={{ background: GOLD }}
  >
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 -left-1/2 w-2/5 -skew-x-[15deg] bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 group-hover/horse:animate-plate-shimmer group-hover/horse:opacity-100 motion-reduce:group-hover/horse:animate-none motion-reduce:group-hover/horse:opacity-0"
    />
    <Screw />
    <span className="flex flex-col gap-px">
      <span className="type-h3 text-brass-ink">{name}</span>
      {subtitle && <span className="type-mono-label text-brass-ink/70">{subtitle}</span>}
    </span>
    <Screw />
  </div>
);
