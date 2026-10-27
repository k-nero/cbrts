import { Flex } from 'antd';
import type { FC } from 'react';
import { useParams } from 'react-router-dom';

import { ChecksPanel } from './ChecksPanel';
import { DecisionPanel } from './DecisionPanel';
import { FleetPanel } from './FleetPanel';
import { SentPanel } from './SentPanel';

import { InvoicesPanel } from '@/components/invoice/InvoicesPanel';
import { HistoryPanel } from '@/components/request/HistoryPanel';
import { RequestLoadState } from '@/components/request/RequestLoadState';
import { RequestNotFound } from '@/components/request/RequestNotFound';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui';
import { useStaffRequestInvoices } from '@/hooks/invoice';
import { useRequestReview } from '@/hooks/staffRequest';
import { inReview, queueWords, reviewSubject, reviewSummary, routeEnds } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * Request review (spec §5.2): the logistics manager's feasibility page. Two checks, what the customer
 * sent at each version, the history, and the decision; the queue runs back to back from the header.
 */
const RequestReviewPage: FC = () => {
  const { id } = useParams();
  const router = useCustomRouter();
  const query = useRequestReview(id);
  const review = query.data;
  const invoices = useStaffRequestInvoices(review?.request.id);
  const toList = () => router.push(router.paths.get('requests'));
  const open = (target: string) =>
    router.push(router.paths.get('request-review', { pathParams: [target] }));

  if (!review)
    return (
      <RequestLoadState
        query={query}
        notFound={
          <RequestNotFound
            message="This request doesn't exist, or the club hasn't sent it yet."
            back={{ label: 'Back to Requests', onClick: toList }}
          />
        }
      />
    );

  const { request, queue } = review;
  // The header describes what the customer sent, never a returned request's unsent edits.
  const subject = reviewSubject(review);
  const from = (subject.route && routeEnds(subject.route).from) ?? subject.origin?.city ?? '—';
  const to = (subject.route && routeEnds(subject.route).to) ?? subject.destination?.city ?? '—';

  return (
    <Flex vertical gap={28}>
      <PageHeader
        back={{ label: 'Requests', onClick: toList }}
        title={`${from} → ${to}`}
        summary={
          <Flex component="span" vertical gap={4}>
            <span className="type-data text-ink">{request.code}</span>
            <span>{reviewSummary(subject)}</span>
          </Flex>
        }
        right={
          queue && (
            <Flex component="span" gap={8} align="center">
              <span className="type-body-s text-ink-3">Review queue</span>
              <Button
                size="sm"
                variant="ghost"
                leadingIcon="arrow-left"
                disabled={!queue.previousId}
                onClick={() => queue.previousId && open(queue.previousId)}
              >
                Previous
              </Button>
              <span className="type-caption text-ink-2">{queueWords(queue)}</span>
              <Button
                size="sm"
                variant="ghost"
                trailingIcon="arrow-right"
                disabled={!queue.nextId}
                onClick={() => queue.nextId && open(queue.nextId)}
              >
                Next
              </Button>
            </Flex>
          )
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
        <Flex vertical gap={24} className="min-w-0">
          <ChecksPanel checks={review.checks} inReview={inReview(request.status)} />
          {review.fleet && <FleetPanel fleet={review.fleet} />}
          <InvoicesPanel
            invoices={invoices.data}
            loading={invoices.isPending}
            onOpen={(inv) =>
              router.push(router.paths.get('invoice-detail', { pathParams: [inv.id] }))
            }
            empty="No invoice yet. The deposit invoice is issued when the customer accepts the quotation."
          />
          <SentPanel key={request.id} revisions={review.revisions} />
          <HistoryPanel history={review.history} />
        </Flex>
        <DecisionPanel key={request.id} review={review} />
      </div>
    </Flex>
  );
};

export default RequestReviewPage;
