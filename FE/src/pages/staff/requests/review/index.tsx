import type { FC } from 'react';
import { useParams } from 'react-router-dom';

import { DecisionPanel } from './DecisionPanel';
import { ChecksPanel, HistoryPanel, SentPanel } from './panels';

import { RequestLoadState, RequestNotFound } from '@/components/request/RequestNotFound';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui';
import { useRequestReview } from '@/hooks/staffRequest';
import { queueWords, reviewSubject, reviewSummary } from '@/lib/utils';
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
  const from = subject.route?.fromCity ?? subject.origin?.city ?? '—';
  const to = subject.route?.toCity ?? subject.destination?.city ?? '—';

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        back={{ label: 'Requests', onClick: toList }}
        title={`${from} → ${to}`}
        summary={
          <span className="flex flex-col gap-1">
            <span className="type-data text-ink">{request.code}</span>
            <span>{reviewSummary(subject)}</span>
          </span>
        }
        right={
          queue && (
            <span className="flex items-center gap-2">
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
            </span>
          )
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
        <div className="flex min-w-0 flex-col gap-6">
          <ChecksPanel checks={review.checks} />
          <SentPanel key={request.id} revisions={review.revisions} />
          <HistoryPanel history={review.history} />
        </div>
        <DecisionPanel key={request.id} review={review} />
      </div>
    </div>
  );
};

export default RequestReviewPage;
