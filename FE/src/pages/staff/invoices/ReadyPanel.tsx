import type { FC } from 'react';
import { App, Flex } from 'antd';
import { useNavigate } from 'react-router-dom';

import { Button, Panel } from '@/components/ui';
import { usePrepareFinalInvoice, useReadyForInvoice } from '@/hooks/invoice';
import { apiErrorMessage, formatDayTime } from '@/lib/utils';

/**
 * Jobs whose handover is settled and that have no final invoice yet (US-F6-03): the manager prepares each one as a
 * draft, sets the actual quantities, then issues it. Hidden when there is none.
 */
export const ReadyPanel: FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { data: ready } = useReadyForInvoice();
  const prepare = usePrepareFinalInvoice();
  if (!ready?.length) return null;
  return (
    <Panel
      title={`Ready for the final invoice · ${ready.length}`}
      flush
      footer={
        <span className="type-body-s text-ink-3">
          The handover is accepted, or the customer&apos;s problem is resolved. The draft holds the
          quotation&apos;s lines; set what actually happened on the estimated ones, then issue it.
        </span>
      }
    >
      <ul className="m-0 list-none p-0">
        {ready.map((job, i) => (
          <li
            key={job.jobId}
            className={`flex items-center justify-between gap-4 px-6 py-3 ${i > 0 ? 'border-t border-line' : ''}`}
          >
            <Flex vertical gap={2}>
              <span className="type-label-m text-ink">
                {job.jobCode} · {job.clubName}
              </span>
              <span className="type-caption text-ink-3">
                {job.outcome === 'PROBLEM_REPORTED'
                  ? 'Problem reported, now resolved'
                  : job.acceptedByDefault
                    ? 'Taken as accepted'
                    : 'Handover accepted'}
                {job.answeredAt ? ` · ${formatDayTime(job.answeredAt)}` : ''}
              </span>
            </Flex>
            <Button
              size="sm"
              disabled={prepare.isPending}
              onClick={() =>
                prepare.mutate(job.jobId, {
                  onSuccess: (invoice) => navigate(`/staff/invoices/${invoice.id}`),
                  onError: (e) => message.error(apiErrorMessage(e, 'The draft could not be made.')),
                })
              }
            >
              Prepare the final invoice
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
};
