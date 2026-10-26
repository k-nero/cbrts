import { type FC } from 'react';
import { Flex } from 'antd';

import { Button } from '@/components/ui';

type Props = {
  hasHorses: boolean;
  onRequest: () => void;
  onAddHorse: () => void;
};

/**
 * The lead block of a club with no move in progress: nothing is owed, so the one gold action starts
 * the next step, adding a horse first when the club has none (a request picks from its horses).
 */
export const FirstMove: FC<Props> = ({ hasHorses, onRequest, onAddHorse }) => (
  <section className="rounded-lg border border-line bg-card p-5">
    <Flex align="center" gap={24}>
      <Flex vertical gap={4} className="min-w-0 flex-1">
        <h2 className="type-h3 m-0 text-ink">
          {hasHorses ? 'No moves in progress' : 'Start with your horses'}
        </h2>
        <p className="type-body-m m-0 text-ink-2">
          {hasHorses
            ? 'Request transport to get an indicative price at once. What you owe for each move appears here, soonest first.'
            : 'Add each horse once with its passport details; every request then picks from them.'}
        </p>
      </Flex>
      <Button
        variant="primary"
        leadingIcon={hasHorses ? undefined : 'plus'}
        onClick={hasHorses ? onRequest : onAddHorse}
      >
        {hasHorses ? 'Request transport' : 'Add your first horse'}
      </Button>
    </Flex>
  </section>
);
