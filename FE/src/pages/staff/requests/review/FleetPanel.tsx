import type { FC } from 'react';
import { Flex } from 'antd';

import { FLEET_CHIP } from './fleetCheck';

import { Chip, Panel } from '@/components/ui';
import type { FleetCheck } from '@/interfaces';
import { formatDate } from '@/lib/utils';

/**
 * Fleet (US-F7-02): whether a vehicle can run the request on its date or within its flexible days,
 * worked out from the fleet calendar, and, once the customer accepts, the vehicle held for it.
 * It informs the decision; nothing here blocks quoting, approving or rejecting.
 */
export const FleetPanel: FC<{ fleet: FleetCheck }> = ({ fleet }) => {
  const chip = FLEET_CHIP[fleet.outcome];
  return (
    <Panel title="Fleet" extra={<Chip tone={chip.tone}>{chip.label}</Chip>} flush>
      <Flex vertical gap={2} className="px-6 py-3.5">
        <span className="type-label-m text-ink">{fleet.message}</span>
        <span className="type-body-s text-ink-3">
          {`By the fleet calendar, for ${formatDate(fleet.date)} and the flexible dates.`}
        </span>
      </Flex>
      {fleet.held !== null && (
        <Flex align="center" gap={12} className="border-t border-line px-6 py-3.5">
          {fleet.held ? (
            <>
              <Chip tone="ok">Held</Chip>
              <span className="type-body-s text-ink-2">
                {`${fleet.heldVehicle} is held from ${fleet.heldFrom ? formatDate(fleet.heldFrom) : 'the departure day'} until the trip's load plan is confirmed.`}
              </span>
            </>
          ) : (
            <>
              <Chip tone="warn">No vehicle held</Chip>
              <span className="type-body-s text-ink-2">
                No vehicle was free when the customer accepted. Approving tries again.
              </span>
            </>
          )}
        </Flex>
      )}
    </Panel>
  );
};
