import type { FC, ReactNode } from 'react';

import { FactCell } from './FactCell';
import { Progress } from './Progress';
import { cx } from './tone';
import { CoatBand } from './CoatBand';

/** `other` is the neutral band for a coat outside the four (OTHER) or none given. */
export type Coat = 'grey' | 'black' | 'chestnut' | 'bay' | 'other';

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
