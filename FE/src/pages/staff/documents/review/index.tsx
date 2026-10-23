import { useEffect, useMemo, useState, type FC } from 'react';
import { useParams } from 'react-router-dom';
import { App, Col, Flex, Row, Skeleton } from 'antd';
import PageHeader from '@/components/PageHeader';
import { Callout, Chip, StageMark } from '@/components/ui';
import { useDocumentReviewDetail, useReviewDocument } from '@/hooks/clearance';
import { DocumentReviewEnum, type ReviewDocumentRequest } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

import { AutomaticCheckPanel } from './AutomaticCheckPanel';
import { DecisionPanel } from './DecisionPanel';
import { FileViewer } from './FileViewer';
import { VersionsPanel } from './VersionsPanel';
import { type ManualCheckItem, YourChecksPanel } from './YourChecksPanel';

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

  const { data: detail } = useDocumentReviewDetail(id);
  const reviewMutation = useReviewDocument(detail?.jobId);

  const [submitError, setSubmitError] = useState<string | null>(null);
  // The decision that last failed, so Try again sends the same one (an approve or a reject with its reason).
  const [lastDecision, setLastDecision] = useState<ReviewDocumentRequest | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(new Set());

  // A new version starts with no ticks; a refetch of the same version keeps them.
  const versionId = detail?.version.id;
  useEffect(() => {
    setTicked(new Set());
    setSubmitError(null);
    setLastDecision(null);
  }, [versionId]);

  const checks = useMemo<ManualCheckItem[]>(() => {
    if (!detail) return [];
    const { version, item } = detail;
    const definitions: Omit<ManualCheckItem, 'checked'>[] = [
      {
        id: 'sample-date',
        label: 'The sample date on the paper matches the entered date',
        sub: version.sampledOn ? `Entered: ${version.sampledOn}.` : undefined,
      },
      {
        id: 'lab-approved',
        label: 'The laboratory is on the destination country’s approved list',
        sub: version.issuer ? `Entered issuer: ${version.issuer}.` : undefined,
      },
      { id: 'result-negative', label: 'The result is negative / passed' },
      {
        id: 'microchip-match',
        label: 'The microchip matches the horse’s passport',
        sub: item.horseMicrochip
          ? `Microchip on file: …${item.horseMicrochip.slice(-6)}.`
          : undefined,
      },
      { id: 'signed-stamped', label: 'Signed and stamped by the veterinarian or authority' },
    ];
    return definitions.map((check) => ({ ...check, checked: ticked.has(check.id) }));
  }, [detail, ticked]);

  const handleToggleCheck = (checkId: string) => {
    setTicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(checkId)) next.add(checkId);
      return next;
    });
  };

  const allChecksTicked = checks.length > 0 && checks.every((c) => c.checked);
  const tickedCount = ticked.size;

  const toDocumentsList = () => {
    router.push(router.paths.get('documents'));
  };

  const decide = async (data: ReviewDocumentRequest) => {
    if (!detail) return;
    setSubmitError(null);
    setLastDecision(data);
    try {
      await reviewMutation.mutateAsync({ versionId: detail.version.id, data });
      message.success(
        data.review === DocumentReviewEnum.APPROVED
          ? `Approved ${detail.item.horseName ? `${detail.item.horseName} · ` : ''}${
              detail.item.documentTypeName || 'document'
            }`
          : `Rejected with reason sent to ${detail.clubName || 'the customer'}.`,
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

  if (!detail) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  const { item, version, jobCode, requestCode, clubName, departureDate } = detail;
  const docTitle = `${item.horseName ? `${item.horseName} · ` : ''}${
    item.documentTypeName || 'Document'
  }`;
  const pending = version.review === DocumentReviewEnum.PENDING;

  return (
    <Flex vertical gap={24}>
      <PageHeader
        back={{ label: 'Documents', onClick: toDocumentsList }}
        title={docTitle}
        summary={
          <Flex vertical gap={4}>
            <span className="type-data text-ink">{jobCode}</span>
            <span className="type-body-s text-ink-3">
              {[requestCode, clubName, departureDate ? `departs ${departureDate}` : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </Flex>
        }
        right={
          <>
            <StageMark stage="Documents" />
            {pending ? (
              <Chip tone="info">In review</Chip>
            ) : version.review === DocumentReviewEnum.APPROVED ? (
              <Chip tone="ok">Approved</Chip>
            ) : (
              <Chip tone="bad">Rejected</Chip>
            )}
            {item.dueDate && <span className="type-label-s text-ink">Due {item.dueDate}</span>}
          </>
        }
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14} xl={16}>
          <FileViewer version={version} />
        </Col>

        <Col xs={24} lg={10} xl={8}>
          <Flex vertical gap={20}>
            <AutomaticCheckPanel
              text={detail.automaticCheckText}
              tone={detail.automaticCheckTone}
            />
            {pending ? (
              <>
                <YourChecksPanel checks={checks} onToggle={handleToggleCheck} />
                <DecisionPanel
                  detail={detail}
                  allChecksTicked={allChecksTicked}
                  tickedCount={tickedCount}
                  totalChecks={checks.length}
                  isSubmitting={reviewMutation.isPending}
                  submitError={submitError}
                  onApprove={() => decide({ review: DocumentReviewEnum.APPROVED })}
                  onReject={(reason) =>
                    decide({ review: DocumentReviewEnum.REJECTED, rejectReason: reason })
                  }
                  onRetry={() => (lastDecision ? decide(lastDecision) : Promise.resolve())}
                  onBackToList={toDocumentsList}
                />
              </>
            ) : (
              <Callout tone="info" title="Already reviewed">
                This version was{' '}
                {version.review === DocumentReviewEnum.APPROVED ? 'approved' : 'rejected'}
                {version.reviewedByName ? ` by ${version.reviewedByName}` : ''}. Nothing is left to
                decide here.
              </Callout>
            )}
            <VersionsPanel currentVersionId={version.id} versions={detail.allVersions} />
          </Flex>
        </Col>
      </Row>
    </Flex>
  );
};

export default DocumentReviewPage;
