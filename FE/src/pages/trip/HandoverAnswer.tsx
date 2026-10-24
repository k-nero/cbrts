import { type FC, useState } from 'react';
import { App } from 'antd';

import { DiscrepancyModal } from './DiscrepancyModal';

import { Button, OwedItem, Panel } from '@/components/ui';
import { useAcceptHandover } from '@/hooks/trip';
import type { TripView } from '@/interfaces';
import { apiErrorMessage, dueLeft, formatDate, formatDayTime } from '@/lib/utils';

/**
 * The customer's one owed item after the handover (US-F6-02, DESIGN.md "Handover"): accept the delivery, or report a
 * problem. The default is stated up front: with no answer by the due time, the handover is taken as accepted.
 */
export const HandoverAnswer: FC<{ trip: TripView }> = ({ trip }) => {
  const { message } = App.useApp();
  const [reporting, setReporting] = useState(false);
  const accept = useAcceptHandover(trip.jobCode);
  const handover = trip.handover;
  if (!handover?.handedOverAt || handover.customerOutcome || !handover.confirmDueAt) return null;
  const due = handover.confirmDueAt;
  const now = new Date().toISOString();

  return (
    <Panel title="1 item" flush>
      <OwedItem
        urgency="soon"
        icon="check"
        title="Confirm the handover"
        subject={`${trip.jobCode} · received by ${handover.receiverName}`}
        reason={`If you don't reply by ${formatDayTime(due)}, the handover is taken as accepted.`}
        deadline={{ left: dueLeft(due, now), date: formatDate(due) }}
        action={
          <>
            <Button variant="secondary" onClick={() => setReporting(true)}>
              Report a problem
            </Button>
            <Button
              variant="primary"
              disabled={accept.isPending}
              onClick={() =>
                accept.mutate(undefined, {
                  onSuccess: () => message.success('Thank you. The handover is accepted.'),
                  onError: (e) => message.error(apiErrorMessage(e, 'Not accepted. Try again.')),
                })
              }
            >
              Accept the handover
            </Button>
          </>
        }
      />
      <DiscrepancyModal
        jobCode={trip.jobCode}
        open={reporting}
        onClose={() => setReporting(false)}
      />
    </Panel>
  );
};
