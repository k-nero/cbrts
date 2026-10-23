import type { FC } from 'react';
import { Flex } from 'antd';

import { GhostHorse } from './GhostHorse';

import { Button, Panel } from '@/components/ui';

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

/** A club with no horse yet (DESIGN.md, First run): the order of things and what to have ready. */
const FirstRun: FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
    <Panel>
      <div className="px-1 pb-1">
        <Flex gap={32}>
          <Flex vertical gap={20} className="flex-1">
            <Flex vertical gap={6}>
              <h2 className="type-display-m m-0 text-ink">Start with your horses</h2>
              <p className="type-body-m m-0 text-ink-2">
                Every request is built from your horses’ profiles, so we ask for them once and reuse
                them on every move.
              </p>
            </Flex>
            <Flex component="ol" vertical gap={16} className="list-none">
              {STEPS.map(([title, line], i) => (
                <Flex component="li" key={title} align="start" gap={14}>
                  <Flex
                    component="span"
                    align="center"
                    justify="center"
                    className={
                      i === 0
                        ? 'type-caption size-7 shrink-0 rounded-full border border-ink text-ink'
                        : 'type-caption size-7 shrink-0 rounded-full border border-line-strong text-ink-3'
                    }
                  >
                    {i + 1}
                  </Flex>
                  <Flex component="span" vertical gap={2}>
                    <span className="type-label-m text-ink">{title}</span>
                    <span className="type-body-s text-ink-2">{line}</span>
                  </Flex>
                </Flex>
              ))}
            </Flex>
            <div>
              <Button variant="primary" leadingIcon="plus" onClick={onAdd}>
                Add your first horse
              </Button>
            </div>
          </Flex>
          <GhostHorse />
        </Flex>
      </div>
    </Panel>
    <Panel title="Have these ready">
      <Flex vertical>
        {READY.map(([title, line]) => (
          <div key={title} className="border-t border-line pt-2.5 pb-2.5 first:border-t-0">
            <Flex vertical gap={2}>
              <span className="type-label-s text-ink">{title}</span>
              <span className="type-body-s text-ink-3">{line}</span>
            </Flex>
          </div>
        ))}
      </Flex>
    </Panel>
  </div>
);

export default FirstRun;
