import { useEffect, useState, type FC } from 'react';
import { useParams } from 'react-router-dom';
import { App, Flex, Spin } from 'antd';
import PageHeader from '@/components/PageHeader';
import { Button, Callout, Chip, StageMark } from '@/components/ui';
import { useDocumentReviewDetail, useReviewDocument } from '@/hooks/clearance';
import { DocumentReviewEnum } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

import { AutomaticCheckPanel } from './AutomaticCheckPanel';
import { DecisionPanel } from './DecisionPanel';
import { FileViewer } from './FileViewer';
import type { ManualCheckItem } from './YourChecksPanel';
import { YourChecksPanel } from './YourChecksPanel';
import { VersionsPanel } from './VersionsPanel';

/**
 * Transport specialist Document Review screen (US-F2-04, issue #88).
 * Figma frames:
 * - Transport specialist · Document review (Approve)
 * - Transport specialist · Document review · Reject
 * - Transport specialist · Document review · Not sent
 */
const DocumentReviewPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useCustomRouter();
  const { message } = App.useApp();

  const { data: detail, isLoading, isError, refetch } = useDocumentReviewDetail(id);
  const reviewMutation = useReviewDocument(detail?.jobId);

  const [submitError, setSubmitError] = useState<string | null>(null);

  // Specialist manual checks state
  const [checks, setChecks] = useState<ManualCheckItem[]>([]);

  useEffect(() => {
    if (detail) {
      const v = detail.version;
      const microchip = detail.item.horseMicrochip;
      setChecks([
        {
          id: 'sample-date',
          label: 'The sample date on the paper matches the entered date',
          sub: v.sampledOn
            ? `${v.sampledOn} on certificate; matches entered date.`
            : 'Date on certificate matches entered date.',
          checked: false,
        },
        {
          id: 'lab-approved',
          label: 'The laboratory is on the destination country’s approved list',
          sub: v.issuer
            ? `${v.issuer}, accreditation verified.`
            : 'Accredited veterinary authority.',
          checked: false,
        },
        {
          id: 'result-negative',
          label: 'The result is negative / passed',
          checked: false,
        },
        {
          id: 'microchip-match',
          label: 'The microchip matches the horse’s passport',
          sub: microchip ? `…${microchip.slice(-6)} verified on both documents.` : undefined,
          checked: false,
        },
        {
          id: 'signed-stamped',
          label: 'Signed and stamped by the veterinarian or authority',
          checked: false,
        },
      ]);
      setSubmitError(null);
    }
  }, [detail]);

  const handleToggleCheck = (checkId: string) => {
    setChecks((prev) => prev.map((c) => (c.id === checkId ? { ...c, checked: !c.checked } : c)));
  };

  const allChecksTicked = checks.length > 0 && checks.every((c) => c.checked);
  const tickedCount = checks.filter((c) => c.checked).length;

  const toDocumentsList = () => {
    router.push(router.paths.get('documents'));
  };

  const handleApprove = async () => {
    if (!detail) return;
    setSubmitError(null);
    try {
      await reviewMutation.mutateAsync({
        versionId: detail.version.id,
        data: { review: DocumentReviewEnum.APPROVED },
      });
      message.success(
        `Approved ${detail.item.horseName ? detail.item.horseName + ' · ' : ''}${
          detail.item.documentTypeName || 'document'
        }`,
      );

      if (detail.nextVersionId) {
        router.push(router.paths.get('document-review', { pathParams: [detail.nextVersionId] }));
      } else {
        toDocumentsList();
      }
    } catch (err) {
      setSubmitError(apiErrorMessage(err, 'The review decision could not be saved.'));
    }
  };

  const handleReject = async (reason: string) => {
    if (!detail) return;
    setSubmitError(null);
    try {
      await reviewMutation.mutateAsync({
        versionId: detail.version.id,
        data: { review: DocumentReviewEnum.REJECTED, rejectReason: reason },
      });
      message.success(`Rejected with reason sent to ${detail.clubName || 'the customer'}.`);

      if (detail.nextVersionId) {
        router.push(router.paths.get('document-review', { pathParams: [detail.nextVersionId] }));
      } else {
        toDocumentsList();
      }
    } catch (err) {
      setSubmitError(apiErrorMessage(err, 'The rejection decision could not be saved.'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <Flex vertical gap={24} className="p-6">
        <Callout tone="bad" title="Document review not found">
          This document version may have already been reviewed or does not exist.
        </Callout>
        <div>
          <Button variant="secondary" onClick={toDocumentsList}>
            Back to Documents
          </Button>
        </div>
      </Flex>
    );
  }

  const { item, version, jobCode, requestCode, clubName, departureDate } = detail;
  const docTitle = `${item.horseName ? item.horseName + ' · ' : ''}${
    item.documentTypeName || 'Document'
  }`;

  const dueInfo = item.dueDate ? `Due on ${item.dueDate}` : 'Due in 1 business day';

  return (
    <Flex vertical gap={24} className="pb-12">
      {/* Header matching Figma docReviewScreen */}
      <PageHeader
        back={{ label: 'Documents', onClick: toDocumentsList }}
        title={docTitle}
        summary={
          <div className="flex flex-col gap-1">
            <span className="type-data text-ink">{jobCode || 'JOB'}</span>
            <span className="type-body-s text-ink-3">
              {[requestCode, clubName, departureDate ? `departs ${departureDate}` : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        }
        right={
          <div className="flex items-center gap-3">
            <StageMark stage="Documents" />
            <Chip tone="info">In review</Chip>
            <div className="text-right">
              <span className="type-label-s block text-ink">{dueInfo}</span>
              {item.dueDate && (
                <span className="type-caption font-mono text-ink-3">{item.dueDate}</span>
              )}
            </div>
          </div>
        }
      />

      {/* Main 2-column body: Document on the left, checks and decision on the right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column: File Viewer */}
        <div className="lg:col-span-7 xl:col-span-8">
          <FileViewer detail={detail} />
        </div>

        {/* Right column: Automatic Check, Your Checks, Decision, Versions */}
        <div className="flex flex-col gap-5 lg:col-span-5 xl:col-span-4">
          <AutomaticCheckPanel text={detail.automaticCheckText} tone={detail.automaticCheckTone} />

          <YourChecksPanel checks={checks} onToggle={handleToggleCheck} />

          <DecisionPanel
            detail={detail}
            allChecksTicked={allChecksTicked}
            tickedCount={tickedCount}
            totalChecks={checks.length}
            isSubmitting={reviewMutation.isPending}
            submitError={submitError}
            onApprove={handleApprove}
            onReject={handleReject}
            onBackToList={toDocumentsList}
          />

          <VersionsPanel currentVersionId={version.id} versions={detail.allVersions} />
        </div>
      </div>
    </Flex>
  );
};

export default DocumentReviewPage;
