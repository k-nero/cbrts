import type { FC, ReactNode } from 'react';

import { cx } from './tone';

/* Brass is a material: the same in both themes (DESIGN.md, Domain colours). */
const BRASS = 'linear-gradient(180deg, #EAD08C 0%, #C9AA5A 55%, #9C7C33 100%)';

const Screw: FC = () => (
  <span aria-hidden className="size-[7px] shrink-0 rounded-full bg-brass-dark" />
);

type Props = { name: ReactNode; subtitle?: ReactNode; className?: string };

/** The horse's identity: an engraved brass stall plate. Replaces photography. */
export const Nameplate: FC<Props> = ({ name, subtitle, className }) => (
  <div
    className={cx('flex w-fit items-center gap-3 rounded-sm px-3.5 py-2.5 shadow-brass', className)}
    style={{ background: BRASS }}
  >
    <Screw />
    <span className="flex flex-col gap-px">
      <span className="type-h3 text-brass-ink">{name}</span>
      {subtitle && <span className="type-mono-label text-brass-ink/70">{subtitle}</span>}
    </span>
    <Screw />
  </div>
);
