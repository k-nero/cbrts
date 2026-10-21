import { type FC, useState } from 'react';
import { Input } from 'antd';
import BaseModal from '@/components/modal/BaseModal';
import { Button, Callout, Radio } from '@/components/ui';
import { useReviewDocument } from '@/hooks/clearance';
import { type DocumentReview, DocumentReviewEnum, type DocumentVersion } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

type Props = {
  /** The version being reviewed; the modal is open while it is set. */
  version: DocumentVersion | null;
  /** The job whose checklist and gate refresh after the decision (null from the review inbox). */
  jobId: string | null;
  onClose: () => void;
};

/** Approve or reject one uploaded version. A rejection needs the reason the customer will read. */
const ReviewDocumentModal: FC<Props> = ({ version, jobId, onClose }) => (
  <BaseModal
    open={version !== null}
    onCancel={onClose}
    title={`Review ${version?.fileName ?? 'document'}`}
  >
    {/* Mounted per open (BaseModal destroys hidden content), so every review starts from Approve. */}
    {version && <ReviewForm version={version} jobId={jobId} onClose={onClose} />}
  </BaseModal>
);

const ReviewForm: FC<{ version: DocumentVersion; jobId: string | null; onClose: () => void }> = ({
  version,
  jobId,
  onClose,
}) => {
  const review = useReviewDocument(jobId);
  const [decision, setDecision] = useState<DocumentReview>(DocumentReviewEnum.APPROVED);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rejecting = decision === DocumentReviewEnum.REJECTED;

  const submit = async () => {
    if (rejecting && !rejectReason.trim()) {
      setError('Add the reason the customer will read before rejecting this document (BR-F2-07).');
      return;
    }
    setError(null);
    try {
      await review.mutateAsync({
        versionId: version.id,
        data: { review: decision, rejectReason: rejecting ? rejectReason.trim() : undefined },
      });
      onClose();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'The review decision could not be saved.'));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <Callout tone="bad" title={error} />}

      <div className="type-body-s text-ink-2">
        A document checked as RED can't be approved. A rejection sends the item back to the customer
        with your reason.
      </div>

      <div className="flex gap-4">
        <Radio
          name="decision"
          label="Approve"
          checked={decision === DocumentReviewEnum.APPROVED}
          onChange={() => setDecision(DocumentReviewEnum.APPROVED)}
        />
        <Radio
          name="decision"
          label="Reject"
          checked={rejecting}
          onChange={() => setDecision(DocumentReviewEnum.REJECTED)}
        />
      </div>

      {rejecting && (
        <div className="flex flex-col gap-1.5">
          <label className="type-label-s text-ink">
            Reason the customer will read <span className="text-bad">*</span>
          </label>
          <Input.TextArea
            rows={3}
            placeholder="What is wrong with this document and what to send instead"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" disabled={review.isPending} onClick={submit}>
          {review.isPending ? 'Saving…' : rejecting ? 'Reject document' : 'Approve document'}
        </Button>
      </div>
    </div>
  );
};

export default ReviewDocumentModal;
