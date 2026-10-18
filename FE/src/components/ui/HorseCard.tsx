import type { FC, ReactNode } from 'react';

import { FactCell } from './FactCell';
import { Nameplate } from './Nameplate';
import { Progress } from './Progress';
import { cx } from './tone';

/** `other` is the neutral band for a coat outside the four (OTHER) or none given. */
export type Coat = 'grey' | 'black' | 'chestnut' | 'bay' | 'other';

/** The coat as a fill: the horse card band, and the 12 px swatch in horse lists. */
export const COAT_SWATCH: Record<Coat, string> = {
  grey: 'bg-coat-grey',
  black: 'bg-coat-black',
  chestnut: 'bg-coat-chestnut',
  bay: 'bg-coat-bay',
  other: 'bg-muted',
};

type Props = {
  coat: Coat;
  name: ReactNode;
  /** On the nameplate: "Andalusian · Gelding". */
  subtitle?: ReactNode;
  /** Chips: temperament, stall need. */
  tags?: ReactNode;
  facts: { age: ReactNode; height: ReactNode; weight: ReactNode; size: ReactNode };
  microchip?: ReactNode;
  declaredValue?: ReactNode;
  notes?: ReactNode;
  /** Documents cleared for the active job. */
  readiness?: { label: ReactNode; cleared: number; total: number };
  /** A state chip above the tags, e.g. "Archived · 3 Oct 2026". */
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

const COAT_LABEL: Record<Coat, string> = {
  grey: 'grey',
  black: 'black',
  chestnut: 'chestnut',
  bay: 'bay',
  other: 'other',
};

/**
 * The coat band with its brass nameplate on top, shared by the horse card (148 px) and the profile
 * header (132 px, rounded).
 */
export const CoatBand: FC<{
  coat: Coat;
  name: ReactNode;
  subtitle?: ReactNode;
  height?: number;
  className?: string;
}> = ({ coat, name, subtitle, height = 148, className }) => (
  <div className={cx('relative overflow-hidden', COAT_SWATCH[coat], className)} style={{ height }}>
    <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent to-black/45" />
    <span className="type-mono-label absolute top-[18px] right-5 text-white/80">
      {COAT_LABEL[coat]}
    </span>
    <Nameplate name={name} subtitle={subtitle} className="absolute bottom-5 left-5" />
  </div>
);

/** The owner's horse (DESIGN.md, Nameplate and Horse Card). Coat is a material, not a status. */
export const HorseCard: FC<Props> = ({
  coat,
  name,
  subtitle,
  tags,
  facts,
  microchip,
  declaredValue,
  notes,
  readiness,
  status,
  actions,
  className,
}) => (
  <article
    className={cx('flex flex-col overflow-hidden rounded-lg border border-line bg-card', className)}
  >
    <CoatBand coat={coat} name={name} subtitle={subtitle} />
    <div className="flex flex-col gap-4 p-5">
      {status && <div className="flex">{status}</div>}
      {tags && <div className="flex flex-wrap gap-1.5">{tags}</div>}
      <div className="grid grid-cols-4 gap-1">
        <FactCell label="Age" value={facts.age} />
        <FactCell label="Height" value={facts.height} />
        <FactCell label="Weight" value={facts.weight} />
        <FactCell label="Size · in" value={facts.size} />
      </div>
      {(microchip || declaredValue) && (
        <div className="flex gap-6">
          {microchip && (
            <span className="flex flex-col gap-1">
              <span className="type-body-s text-ink-3">Microchip</span>
              <span className="type-caption text-ink-2">{microchip}</span>
            </span>
          )}
          {declaredValue && (
            <span className="flex flex-col gap-1">
              <span className="type-body-s text-ink-3">Declared value</span>
              <span className="type-caption text-ink-2">{declaredValue}</span>
            </span>
          )}
        </div>
      )}
      {notes && <p className="type-body-s m-0 text-ink-2">{notes}</p>}
      {readiness && (
        <div className="flex flex-col gap-2">
          <span className="flex items-center justify-between">
            <span className="type-caption text-ink-3">{readiness.label}</span>
            <span className="type-caption text-ink">
              {readiness.cleared} of {readiness.total} cleared
            </span>
          </span>
          <Progress
            value={readiness.total ? (readiness.cleared / readiness.total) * 100 : 0}
            label="Documents cleared"
          />
        </div>
      )}
      {actions && (
        <div className="flex gap-2 border-t border-line pt-4 [&>*:first-child]:flex-1">
          {actions}
        </div>
      )}
    </div>
  </article>
);
