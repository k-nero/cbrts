import { useState, type FC } from 'react';
import { Divider, Flex, Input } from 'antd';
import { Button, Callout, Panel } from '@/components/ui';
import type { DocumentReviewDetail } from '@/interfaces';

type Props = {
  detail: DocumentReviewDetail;
  allChecksTicked: boolean;
  tickedCount: number;
  totalChecks: number;
  isSubmitting: boolean;
  submitError: string | null;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  /** Sends the decision that failed again, unchanged. */
  onRetry: () => Promise<void>;
  onBackToList: () => void;
};

/**
 * Specialist decision panel implementing all 3 Figma states (Figma: scrDocReview, scrDocReject, scrDocReviewNotSent).
 * Frame 1: Approve mode with gate progress.
 * Frame 2: Reject mode with mandatory reason shown verbatim to the customer.
 * Frame 3: Not sent mode with retry action if submission fails.
 */
export const DecisionPanel: FC<Props> = ({
  detail,
  allChecksTicked,
  tickedCount,
  totalChecks,
  isSubmitting,
  submitError,
  onApprove,
  onReject,
  onRetry,
  onBackToList,
}) => {
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectValidationError, setRejectValidationError] = useState<string | null>(null);

  const {
    item,
    clubName,
    clearedMandatoryItems,
    mandatoryItems,
    remainingMandatoryItems,
    queuePosition,
    queueTotal,
    nextDocumentName,
  } = detail;

  // queuePosition is 0 once the version has left the queue; then every queued item is still ahead.
  const remainingQueue = Math.max(0, queuePosition > 0 ? queueTotal - queuePosition : queueTotal);

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setRejectValidationError('Write a reason to the customer: say what is missing or wrong.');
      return;
    }
    setRejectValidationError(null);
    await onReject(rejectReason.trim());
  };

  // Frame 3: Not sent (Server or Network Error)
  if (submitError) {
    return (
      <Panel title="Your decision">
        <Flex vertical gap={12}>
          <Callout tone="bad" title="Not sent">
            Nothing was recorded and {clubName || 'the customer'} wasn't told. Your {tickedCount}{' '}
            ticks are kept.
          </Callout>
          <span className="type-caption text-bad">{submitError}</span>
          <Button
            variant="primary"
            size="md"
            leadingIcon="check"
            className="w-full"
            disabled={isSubmitting}
            onClick={onRetry}
          >
            {isSubmitting ? 'Sending…' : 'Try again'}
          </Button>
          <span className="type-body-s text-center text-ink-3">
            Your queue waits here until this is sent: {remainingQueue} more after it.
          </span>
          <Button variant="ghost" size="md" className="w-full" onClick={onBackToList}>
            Keep for later
          </Button>
        </Flex>
      </Panel>
    );
  }

  // Frame 2: Reject with a reason
  if (isRejectMode) {
    return (
      <Panel title="Your decision">
        <Flex vertical gap={12}>
          <span className="type-label-m text-ink">Reject with a reason</span>
          {rejectValidationError && (
            <span className="type-caption text-bad">{rejectValidationError}</span>
          )}
          <Flex vertical gap={6}>
            <label className="type-label-s text-ink">
              Reason, shown to {clubName || 'the club'} <span className="text-bad">*</span>
            </label>
            <Input.TextArea
              rows={4}
              placeholder="What is wrong with this document and what to send instead"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <span className="type-caption text-ink-3">
              Required. The customer sees it exactly as written; the item returns to Required and
              this version is kept.
            </span>
          </Flex>
          {item.dueDate && (
            <Flex justify="space-between" align="center">
              <span className="type-body-s text-ink-2">New version due</span>
              <span className="type-caption text-warn">{item.dueDate}</span>
            </Flex>
          )}
          <Button
            variant="primary"
            size="md"
            trailingIcon="arrow-right"
            className="w-full"
            disabled={isSubmitting}
            onClick={handleRejectSubmit}
          >
            {isSubmitting ? 'Saving…' : 'Reject and open next'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => setIsRejectMode(false)}
          >
            Back to approve
          </Button>
          <span className="type-body-s text-ink-3">
            {clubName || 'The club'} is told at once, with your reason. Then {remainingQueue} more
            in your queue.
          </span>
          <Divider className="my-0" />
          <Button variant="secondary" size="md" className="w-full" disabled>
            Approve
          </Button>
          <span className="type-caption text-center text-ink-3">
            Approve needs every check ticked ({tickedCount} of {totalChecks} ticked).
          </span>
        </Flex>
      </Panel>
    );
  }

  // Frame 1: Standard Approve mode
  return (
    <Panel title="Your decision">
      <Flex vertical gap={12}>
        <p className="type-body-s m-0 text-ink-2">
          Approving clears {item.horseName ? `${item.horseName}'s ` : ''}
          {item.documentTypeName || 'document'}. So far {clearedMandatoryItems} of {mandatoryItems}{' '}
          mandatory documents are cleared; the departure gate waits for {remainingMandatoryItems}.
        </p>
        <Button
          variant="primary"
          size="md"
          leadingIcon="check"
          className="w-full"
          disabled={!allChecksTicked || isSubmitting}
          onClick={onApprove}
        >
          {isSubmitting ? 'Approving…' : 'Approve and open next'}
        </Button>
        {!allChecksTicked && (
          <span className="type-caption text-center text-ink-3">
            Approve needs every check ticked ({tickedCount} of {totalChecks} ticked).
          </span>
        )}
        <span className="type-body-s text-center text-ink-3">
          Then {remainingQueue} more in your queue
          {nextDocumentName ? `: ${nextDocumentName}` : ''}.
        </span>
        <Button variant="ghost" size="md" className="w-full" onClick={() => setIsRejectMode(true)}>
          Reject with a reason
        </Button>
      </Flex>
    </Panel>
  );
};
