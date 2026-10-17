import type { FC } from 'react';

import { Button, Nameplate, Panel } from '@/components/ui';

const STEPS: [string, string][] = [
  ['Add your horses', 'Name, microchip, size and temperament. About 3 minutes each.'],
  [
    'Request transport',
    'Pick the horses, then the route and dates, then the service. You see an indicative range as soon as the route is set.',
  ],
  ['We review and quote', 'Within 1 business day you get an itemised quotation, valid for 7 days.'],
];

const READY: [string, string][] = [
  ['Each horse’s passport', 'For the microchip number and date of birth.'],
  ['Height and weight', 'Height sets the stall width; weight sets the load.'],
  ['A declared value', 'Used for insurance if you insure through us.'],
  ['Handling needs', 'Nervous loaders, box stall only, a climate stall.'],
];

/** The horse the club is about to make: an empty brass nameplate on a dashed band. */
const GhostHorse: FC = () => (
  <div className="flex w-[272px] shrink-0 flex-col gap-2.5">
    <div className="relative h-[148px] rounded-lg border border-dashed border-line-strong bg-muted">
      <Nameplate
        name="Your first horse"
        subtitle="Breed · sex"
        className="absolute bottom-5 left-5"
      />
    </div>
    <p className="type-body-s m-0 text-ink-3">
      Each horse gets a brass nameplate on its coat colour, and every request starts from it.
    </p>
  </div>
);

/** A club with no horse yet (DESIGN.md, First run): the order of things and what to have ready. */
const FirstRun: FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
    <Panel>
      <div className="flex gap-8 px-1 pb-1">
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h2 className="type-display-m m-0 text-ink">Start with your horses</h2>
            <p className="type-body-m m-0 text-ink-2">
              Every request is built from your horses’ profiles, so we ask for them once and reuse
              them on every move.
            </p>
          </div>
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {STEPS.map(([title, line], i) => (
              <li key={title} className="flex items-start gap-3.5">
                <span
                  className={
                    i === 0
                      ? 'type-caption flex size-7 shrink-0 items-center justify-center rounded-full border border-ink text-ink'
                      : 'type-caption flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-3'
                  }
                >
                  {i + 1}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="type-label-m text-ink">{title}</span>
                  <span className="type-body-s text-ink-2">{line}</span>
                </span>
              </li>
            ))}
          </ol>
          <div>
            <Button variant="primary" leadingIcon="plus" onClick={onAdd}>
              Add your first horse
            </Button>
          </div>
        </div>
        <GhostHorse />
      </div>
    </Panel>
    <Panel title="Have these ready">
      <div className="flex flex-col">
        {READY.map(([title, line]) => (
          <div
            key={title}
            className="flex flex-col gap-0.5 border-t border-line pt-2.5 pb-2.5 first:border-t-0"
          >
            <span className="type-label-s text-ink">{title}</span>
            <span className="type-body-s text-ink-3">{line}</span>
          </div>
        ))}
      </div>
    </Panel>
  </div>
);

export default FirstRun;
