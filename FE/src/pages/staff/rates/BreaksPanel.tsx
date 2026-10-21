import type { FC, ReactNode } from 'react';

import { Panel } from '@/components/ui';
import type { RateCorridorView } from '@/interfaces';
import { bandLabel, pctText } from '@/lib/utils';

/** Volume breaks, in break-point order: applied to the air and ground lines (A, C, G). */
export const BreaksPanel: FC<{ view: RateCorridorView; edit?: ReactNode }> = ({ view, edit }) => (
  <Panel title="Volume breaks" extra={edit}>
    <div className="flex flex-col gap-3">
      <span className="type-body-s text-ink-3">
        {view.volumeBreaksScope === 'CORRIDOR'
          ? "This corridor's own bands, applied to air and ground lines."
          : 'The bands for every corridor, applied to air and ground lines.'}
      </span>
      {view.volumeBreaks.length === 0 && (
        <span className="type-body-s text-ink-2">
          No volume breaks: every quotation is priced without a discount.
        </span>
      )}
      <dl className="m-0 flex flex-col gap-2">
        {view.volumeBreaks.map((b) => (
          <div key={b.minHorses} className="flex items-center justify-between gap-4">
            <dt className="type-data text-ink">{`${bandLabel(b)} ${b.maxHorses === 1 && b.minHorses === 1 ? 'horse' : 'horses'}`}</dt>
            <dd className="type-data m-0 text-ink">{pctText(b.discountPct)}</dd>
          </div>
        ))}
      </dl>
    </div>
  </Panel>
);
