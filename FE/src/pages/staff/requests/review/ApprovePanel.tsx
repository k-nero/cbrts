import type { FC } from 'react';
import { Flex, Skeleton } from 'antd';

import { ApproveForm } from './ApproveForm';
import { QuotationAction } from './QuotationAction';
import { RejectBox } from './RejectBox';

import { Chip, Panel } from '@/components/ui';
import { useApprovalOptions } from '@/hooks/staffRequest';
import type { RequestReview } from '@/interfaces';

/**
 * The final approval (US-F1-07): the customer accepted, so the manager names the job's team and
 * approves, or rejects with a reason.
 */
export const ApprovePanel: FC<{ review: RequestReview }> = ({ review }) => {
  const { request, quotation } = review;
  const options = useApprovalOptions(true);

  return (
    <Panel title="Your decision" extra={<Chip tone="ok">Accepted</Chip>}>
      <Flex vertical gap={16}>
        <p className="type-body-s m-0 text-ink-2">
          {`${request.club} accepted ${quotation ? `quotation ${quotation.code} v${quotation.versionNo}` : 'the quotation'}. Approving creates the job, locks the price and the horse list, and opens the document checklist.`}
        </p>
        <div className="p-4 rounded-md border border-line-strong bg-raised">
          <Flex vertical gap={12}>
            <span className="type-label-m text-ink">Approve into a job</span>
            {options.data ? (
              <ApproveForm review={review} options={options.data} />
            ) : (
              <Skeleton active title={false} paragraph={{ rows: 3 }} />
            )}
          </Flex>
        </div>
        <div className="pt-4 border-t border-line">
          <Flex vertical gap={8}>
            <span className="type-label-s text-ink-2">Other outcomes</span>
            <QuotationAction review={review} />
            <RejectBox review={review} />
          </Flex>
        </div>
      </Flex>
    </Panel>
  );
};
