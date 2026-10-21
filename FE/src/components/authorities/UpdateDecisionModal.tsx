import type { FC } from 'react';

import { UpdateDecisionForm } from './UpdateDecisionForm';

import BaseModal from '@/components/modal/BaseModal';
import type { AuthoritySubmission } from '@/interfaces';

type Props = {
  /** The filing being updated; the modal is open while it is set. */
  submission: AuthoritySubmission | null;
  jobId: string | null;
  onClose: () => void;
};

/** Record the authority's decision on a filing, or a rescheduled response date. */
const UpdateDecisionModal: FC<Props> = ({ submission, jobId, onClose }) => (
  <BaseModal
    open={submission !== null}
    onCancel={onClose}
    title={`Update Decision: ${submission?.authority?.name ?? 'Authority'}`}
  >
    {/* Mounted per open (BaseModal destroys hidden content), so the form starts from this filing. */}
    {submission && <UpdateDecisionForm submission={submission} jobId={jobId} onClose={onClose} />}
  </BaseModal>
);

export default UpdateDecisionModal;
