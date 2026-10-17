import type { FC } from 'react';

import { Panel } from '@/components/ui';

const WHY: [string, string][] = [
  ['Identity', 'Border posts read the microchip and match it to the passport.'],
  ['Size and weight', 'Height sets the stall width and the air position; weight sets the trailer’s load.'],
  ['Temperament', 'Decides the stall type and who stands next to whom.'],
];

/** "Why we ask" (frame: First run · Add a horse). */
export const WhyWeAsk: FC = () => (
  <Panel title="Why we ask">
    <div className="flex flex-col">
      {WHY.map(([title, line]) => (
        <div key={title} className="flex flex-col gap-0.5 border-t border-line py-2.5 first:border-t-0">
          <span className="type-label-s text-ink">{title}</span>
          <span className="type-body-s text-ink-2">{line}</span>
        </div>
      ))}
    </div>
  </Panel>
);

/** Documents are asked per trip, against its dates: the profile and Add say so instead of listing them. */
export const DocumentsComeLater: FC = () => (
  <Panel title="Documents come later">
    <p className="type-body-s m-0 text-ink-2">
      We ask for the passport, tests and certificates per trip, checked against your travel dates.
      Nothing to upload now.
    </p>
  </Panel>
);
