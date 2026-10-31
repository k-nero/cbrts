import type { FC } from 'react';
import { App, Flex } from 'antd';

import { RouteChecks } from './RouteChecks';
import type { RouteCheck } from './routeDraft';

import BaseModal from '@/components/modal/BaseModal';
import { Button, Callout, FactCell } from '@/components/ui';
import { useConfirmRoutePlan } from '@/hooks/useJob';
import type { JobDetail, RoutePlan } from '@/interfaces';
import { apiErrorMessage, formatDayTime } from '@/lib/utils';

/**
 * What confirming the draft does, before it is done (US-F3-17): the route's departure, arrival, stops and checks, and
 * who hears about it. Confirming sets the trip's dates, clears the sign-off and tells the customer.
 */
export const ConfirmRouteModal: FC<{
  job: JobDetail;
  draft: RoutePlan;
  /** The confirmed version the draft supersedes, if any. */
  confirmed: RoutePlan | null;
  checks: RouteCheck[];
  open: boolean;
  onClose: () => void;
}> = ({ job, draft, confirmed, checks, open, onClose }) => {
  const { message } = App.useApp();
  const confirmRoute = useConfirmRoutePlan(job.id);
  const stops = [...draft.stops].sort((a, b) => a.seq - b.seq);
  const departure = stops[0]?.plannedAt;
  const arrival = stops.at(-1)?.plannedAt;
  const welfare = stops.filter((s) => s.kind === 'WELFARE').length;

  const close = () => {
    confirmRoute.reset();
    onClose();
  };
  const confirm = () =>
    confirmRoute.mutate(
      { planId: draft.id },
      {
        onSuccess: () => {
          message.success(`Route v${draft.versionNo} confirmed. The customer has been told.`);
          close();
        },
      },
    );

  return (
    <BaseModal open={open} onCancel={close} title={`Confirm route v${draft.versionNo}`}>
      <Flex vertical gap={16}>
        <div className="grid grid-cols-2 gap-2">
          <FactCell label="Departs" value={departure ? formatDayTime(departure) : 'Not timed'} />
          <FactCell label="Arrives" value={arrival ? formatDayTime(arrival) : 'Not timed'} />
          <FactCell label="Stops" value={stops.length} />
          <FactCell
            label="Welfare stops"
            value={`${welfare} of ${draft.welfareStopsNeeded} needed`}
          />
          <FactCell
            label="Distance"
            value={draft.distanceKm != null ? `${draft.distanceKm} km` : 'Not planned'}
          />
          <FactCell label="Replaces" value={confirmed ? `v${confirmed.versionNo}` : 'Nothing'} />
        </div>
        <RouteChecks checks={checks} />
        <p className="type-body-s m-0 text-ink-2">
          Confirming sets the trip’s planned departure and arrival and tells the customer.
          {confirmed ? ` The trip stops running on v${confirmed.versionNo}.` : ''} The trip plan
          then needs a new sign-off.
        </p>
        {confirmRoute.isError && (
          <Callout tone="bad" title="Not confirmed">
            {apiErrorMessage(confirmRoute.error, 'The route was not confirmed. Try again.')}
          </Callout>
        )}
        <Flex justify="end" gap={8}>
          <Button variant="secondary" size="md" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" size="md" disabled={confirmRoute.isPending} onClick={confirm}>
            {confirmRoute.isPending ? 'Confirming...' : `Confirm route v${draft.versionNo}`}
          </Button>
        </Flex>
      </Flex>
    </BaseModal>
  );
};
