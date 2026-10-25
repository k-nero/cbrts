import { type FC, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

import { Button } from '@/components/ui';
import { queryKeys } from '@/constant/query';
import { useStartQuotation } from '@/hooks/staffRequest';
import type { RequestReview } from '@/interfaces';
import { apiErrorMessage, quotationAction } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * Start quotation, or open the one already started (pricing slice, spec §7.3). A double click sends one
 * start; the builder opens once it answers. `primary` makes opening it the panel's one gold action, for a
 * re-quote waiting to be issued.
 */
export const QuotationAction: FC<{ review: RequestReview; primary?: boolean }> = ({
  review,
  primary = false,
}) => {
  const router = useCustomRouter();
  const start = useStartQuotation();
  const qc = useQueryClient();
  const starting = useRef(false);
  const id = review.request.id;
  const open = () => router.push(router.paths.get('quotation-builder', { pathParams: [id] }));

  const action = quotationAction(review.request.status, review.quotation);
  if (action === null) return null;
  if (action === 'open' && review.quotation) {
    return (
      <Button variant={primary ? 'primary' : 'secondary'} block onClick={open}>
        {`Open quotation ${review.quotation.code} · v${review.quotation.versionNo}`}
      </Button>
    );
  }
  const onStart = async () => {
    if (starting.current) return;
    starting.current = true;
    try {
      await start.mutateAsync({ requestId: id, value: undefined });
      open();
    } catch (error) {
      message.error(apiErrorMessage(error, "The quotation wasn't started. Try again."));
      // The request may have moved on (returned, or started by someone else): show where it stands.
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.one(id), exact: true });
    } finally {
      starting.current = false;
    }
  };
  return (
    <Button variant="secondary" block disabled={start.isPending} onClick={() => void onStart()}>
      Start quotation
    </Button>
  );
};
