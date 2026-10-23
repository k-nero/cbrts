import { useState, type FC } from 'react';
import { Input } from 'antd';
import { Button, Callout } from '@/components/ui';
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
  onBackToList,
}) => {
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectValidationError, setRejectValidationError] = useState<string | null>(null);

  const {
    item,
    clubName,
    clearedChecklistItems,
    totalChecklistItems,
    remainingMandatoryItems,
    queuePosition,
    queueTotal,
    nextDocumentName,
  } = detail;

  const remainingQueue = Math.max(0, queueTotal - queuePosition);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatted = tomorrow.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

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
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-card p-5">
        <h4 className="type-h4 text-ink">Your decision</h4>
        <Callout tone="bad" title="Not sent">
          Nothing was recorded and {clubName || 'the customer'} wasn't told. Your {tickedCount}{' '}
          ticks are kept.
        </Callout>
        <p className="type-caption text-bad">{submitError}</p>

        <Button
          variant="primary"
          size="md"
          leadingIcon="check"
          className="w-full"
          disabled={isSubmitting}
          onClick={onApprove}
        >
          {isSubmitting ? 'Sending…' : 'Try again'}
        </Button>

        <span className="type-body-s text-center text-ink-3">
          Your queue waits here until this is sent: {remainingQueue} more after it.
        </span>

        <Button variant="ghost" size="md" className="w-full" onClick={onBackToList}>
          Keep for later
        </Button>
      </div>
    );
  }

  // Frame 2: Reject with a reason
  if (isRejectMode) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-line bg-card p-5">
        <h4 className="type-h4 text-ink">Your decision</h4>

        <div className="flex flex-col gap-3 rounded-lg border border-line-strong bg-card p-4 shadow-sm">
          <span className="type-label-m text-ink">Reject with a reason</span>

          {rejectValidationError && (
            <span className="type-caption text-bad">{rejectValidationError}</span>
          )}

          <div className="flex flex-col gap-1.5">
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
          </div>

          <div className="flex items-center justify-between border-t border-line pt-3">
            <span className="type-body-s text-ink-2">New version due</span>
            <div className="text-right">
              <span className="type-label-s block text-warn">Due tomorrow</span>
              <span className="type-caption font-mono text-ink-3">{tomorrowFormatted}</span>
            </div>
          </div>

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
        </div>

        <div className="border-t border-line pt-3">
          <Button variant="secondary" size="md" className="w-full" disabled>
            Approve
          </Button>
          <span className="type-caption mt-1.5 block text-center text-ink-3">
            Approve needs every check ticked ({tickedCount} of {totalChecks} ticked).
          </span>
        </div>
      </div>
    );
  }

  // Frame 1: Standard Approve mode
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-card p-5">
      <h4 className="type-h4 text-ink">Your decision</h4>

      <p className="type-body-s text-ink-2">
        Approving clears {item.horseName ? `${item.horseName}'s ` : ''}
        {item.documentTypeName || 'document'}: {clearedChecklistItems} of {totalChecklistItems}{' '}
        documents cleared. The departure gate still waits for {remainingMandatoryItems}.
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
    </div>
  );
};
