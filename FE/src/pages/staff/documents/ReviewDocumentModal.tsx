import { type FC } from 'react';

import { ReviewForm } from './ReviewForm';

import BaseModal from '@/components/modal/BaseModal';
import { type DocumentVersion } from '@/interfaces';

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

export default ReviewDocumentModal;
