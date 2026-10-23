import type { FC } from 'react';
import { Flex } from 'antd';

import { Panel } from '@/components/ui';

const WHY: [string, string][] = [
  ['Identity', 'Border posts read the microchip and match it to the passport.'],
  [
    'Size and weight',
    'Height sets the stall width and the air position; weight sets the trailer’s load.',
  ],
  ['Temperament', 'Decides the stall type and who stands next to whom.'],
];

/** "Why we ask" (frame: First run · Add a horse). */
export const WhyWeAsk: FC = () => (
  <Panel title="Why we ask">
    <Flex vertical>
      {WHY.map(([title, line]) => (
        <div key={title} className="border-t border-line py-2.5 first:border-t-0">
          <Flex vertical gap={2}>
            <span className="type-label-s text-ink">{title}</span>
            <span className="type-body-s text-ink-2">{line}</span>
          </Flex>
        </div>
      ))}
    </Flex>
  </Panel>
);
