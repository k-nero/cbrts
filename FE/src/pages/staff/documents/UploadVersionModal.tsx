import { type FC } from 'react';

import { UploadForm } from './UploadForm';

import BaseModal from '@/components/modal/BaseModal';
import type { ChecklistItem } from '@/interfaces';

type Props = {
  /** The checklist item getting a new version; the modal is open while it is set. */
  item: ChecklistItem | null;
  jobId: string | null;
  onClose: () => void;
};

/** Upload a new version of a checklist document. Nothing is overwritten: each upload is a new version. */
const UploadVersionModal: FC<Props> = ({ item, jobId, onClose }) => (
  <BaseModal
    open={item !== null}
    onCancel={onClose}
    title={`Upload a new version · ${item?.documentTypeName ?? ''}`}
  >
    {/* Mounted per open (BaseModal destroys hidden content), so every upload starts empty. */}
    {item && <UploadForm item={item} jobId={jobId} onClose={onClose} />}
  </BaseModal>
);

export default UploadVersionModal;
