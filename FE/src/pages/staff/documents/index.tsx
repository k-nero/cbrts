import { type FC, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flex, message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { fileApi } from '@/apis/file';
import PageHeader from '@/components/PageHeader';
import { Button, Tabs } from '@/components/ui';
import { queryKeys } from '@/constant/query';
import { usePendingReviews } from '@/hooks/clearance';
import type { ChecklistItem, DocumentVersion } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';
import JobChecklist from './JobChecklist';
import ReviewDocumentModal from './ReviewDocumentModal';
import ReviewInbox from './ReviewInbox';
import UploadVersionModal from './UploadVersionModal';

/**
 * The transport specialist's Documents page: the review inbox, and each job's checklist against its
 * clearance gate. A `?jobId=` link opens straight on that job's checklist.
 */
const DocumentsPage: FC = () => {
  const router = useCustomRouter();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialJobId = searchParams.get('jobId');
  const [activeTab, setActiveTab] = useState<'pending' | 'checklist'>(
    initialJobId ? 'checklist' : 'pending',
  );
  const [jobId, setJobId] = useState<string | null>(initialJobId);
  const [reviewing, setReviewing] = useState<DocumentVersion | null>(null);
  const [uploadingTo, setUploadingTo] = useState<ChecklistItem | null>(null);

  const queryClient = useQueryClient();
  const pending = usePendingReviews();
  const pendingReviews = pending.data ?? [];

  const [messageApi, messageHolder] = message.useMessage();
  const viewFile = (fileId: string) => {
    fileApi.viewFile(fileId).catch((err: unknown) => {
      void messageApi.error(apiErrorMessage(err, 'The file could not be opened.'));
    });
  };

  const selectJob = (id: string | null) => {
    setJobId(id);
    setSearchParams(id ? { jobId: id } : {});
  };

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.pendingReviews() });
    if (jobId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.checklist(jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clearance.status(jobId) });
    }
  };

  return (
    <Flex vertical gap={28}>
      {messageHolder}
      <PageHeader
        title="Documents"
        summary="Documents waiting for your check, and each job's checklist against its clearance gate."
        right={
          <Button variant="secondary" size="sm" onClick={refresh}>
            Refresh
          </Button>
        }
      />

      <Tabs
        label="Documents views"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'pending', label: 'Waiting for review', count: pendingReviews.length },
          { key: 'checklist', label: 'Job checklist and gate' },
        ]}
      />

      {activeTab === 'pending' && (
        <ReviewInbox
          reviews={pendingReviews}
          loading={pending.isLoading}
          failed={pending.isError}
          onView={viewFile}
          onReview={(version) =>
            router.push(router.paths.get('document-review', { pathParams: [version.id] }))
          }
        />
      )}

      {activeTab === 'checklist' && (
        <JobChecklist
          jobId={jobId}
          onSelectJob={selectJob}
          onView={viewFile}
          onUpload={setUploadingTo}
        />
      )}

      <ReviewDocumentModal version={reviewing} jobId={jobId} onClose={() => setReviewing(null)} />
      <UploadVersionModal item={uploadingTo} jobId={jobId} onClose={() => setUploadingTo(null)} />
    </Flex>
  );
};

export default DocumentsPage;
