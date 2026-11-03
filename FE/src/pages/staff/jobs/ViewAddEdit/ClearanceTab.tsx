import { useState } from 'react';
import { App, Flex } from 'antd';

import { fileApi } from '@/apis/file';
import { Callout } from '@/components/ui';
import { type ChecklistItem, type JobDetail, RoleNameEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import ClearanceChecklist from '@/pages/staff/documents/ClearanceChecklist';
import UploadVersionModal from '@/pages/staff/documents/UploadVersionModal';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  job: JobDetail;
}

/** The job's clearance gate and checklist, kept by the transport specialist; the API serves no one else. */
export function ClearanceTab({ job }: Props) {
  const { message } = App.useApp();
  const roles = useAuthStore((state) => state.roles);
  const [uploadingTo, setUploadingTo] = useState<ChecklistItem | null>(null);

  // The gate covers the whole job; this says which trips of the journey it holds back (US-F3-21).
  const journeyNote = job.clearanceJourneyNote ? (
    <Callout tone="info" title={job.clearanceJourneyNote} />
  ) : null;

  if (!roles.includes(RoleNameEnum.TRANSPORT_SPECIALIST))
    return (
      <Flex vertical gap={16}>
        {journeyNote}
        <Callout tone="info" title="The clearance checklist is kept by the transport specialist">
          The transport specialist checks each document against the regulation catalogs and clears
          the gate. {job.clearanceGateSummary}
        </Callout>
      </Flex>
    );

  const viewFile = (fileId: string) => {
    fileApi.viewFile(fileId).catch((err: unknown) => {
      void message.error(apiErrorMessage(err, 'The file could not be opened.'));
    });
  };

  return (
    <Flex vertical gap={16}>
      {journeyNote}
      <ClearanceChecklist
        jobId={job.id}
        withGate={false}
        onView={viewFile}
        onUpload={setUploadingTo}
      />
      <UploadVersionModal item={uploadingTo} jobId={job.id} onClose={() => setUploadingTo(null)} />
    </Flex>
  );
}
