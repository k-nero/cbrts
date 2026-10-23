import type { FC } from 'react';
import { Empty, Flex, Spin } from 'antd';
import { Button, Callout, Chip } from '@/components/ui';
import type { DocumentVersion } from '@/interfaces';

type Props = {
  reviews: DocumentVersion[];
  loading: boolean;
  failed: boolean;
  onView: (fileId: string) => void;
  onReview: (version: DocumentVersion) => void;
};

/** The "Waiting for review" tab: every uploaded version the specialist still has to check. */
const ReviewInbox: FC<Props> = ({ reviews, loading, failed, onView, onReview }) => (
  <Flex vertical gap={16}>
    <Flex align="center" justify="space-between">
      <div>
        <h2 className="type-h3 text-ink">Review inbox</h2>
        <p className="type-body-s text-ink-3">
          Only the transport specialist reviews documents. A document checked as RED can't be
          approved.
        </p>
      </div>
      <span className="type-caption text-ink-3">
        {reviews.length} {reviews.length === 1 ? 'document' : 'documents'} pending review
      </span>
    </Flex>

    {loading && (
      <div className="p-12">
        <Flex justify="center">
          <Spin size="large" />
        </Flex>
      </div>
    )}

    {failed && (
      <Callout tone="bad" title="The review inbox could not be loaded">
        Refresh the page. If it keeps failing, sign in again.
      </Callout>
    )}

    {!loading && !failed && reviews.length === 0 && (
      <div className="rounded-lg border border-line bg-card p-12 text-center">
        <Empty
          description="Nothing is waiting for your review."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    )}

    {!loading && reviews.length > 0 && (
      <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
        {reviews.map((version) => (
          <div key={version.id} className="p-4">
            <Flex align="center" justify="space-between" gap={16}>
              <Flex vertical gap={4} className="min-w-0 flex-1">
                <Flex align="center" gap={8}>
                  <span className="type-label-m text-ink">{version.fileName}</span>
                  <Chip tone="info">v{version.versionNo}</Chip>
                  <Chip tone="warn">Waiting for review</Chip>
                </Flex>
                <Flex align="center" gap={12} className="type-body-s text-ink-3">
                  {version.uploadedByName && <span>Uploaded by: {version.uploadedByName}</span>}
                  {version.validUntil && <span>Valid until: {version.validUntil}</span>}
                  {version.issuer && <span>Issuer: {version.issuer}</span>}
                </Flex>
              </Flex>

              <Flex align="center" gap={8} className="shrink-0">
                <Button variant="secondary" size="sm" onClick={() => onView(version.fileId)}>
                  View file
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onReview(version)}>
                  Review
                </Button>
              </Flex>
            </Flex>
          </div>
        ))}
      </div>
    )}
  </Flex>
);

export default ReviewInbox;
