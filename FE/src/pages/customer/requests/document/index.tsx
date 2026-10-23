import type { FC } from 'react';
import { Col, Flex, Row, Spin } from 'antd';
import { useParams } from 'react-router-dom';

import { RulePanel } from './RulePanel';
import { StatusPanel } from './StatusPanel';
import { UploadPanel } from './UploadPanel';
import { VersionsPanel } from './VersionsPanel';

import PageHeader from '@/components/PageHeader';
import { RequestLoadState } from '@/components/request/RequestLoadState';
import { Callout } from '@/components/ui';
import { useRequestChecklist } from '@/hooks/clearance';
import { useRequest } from '@/hooks/request';
import { customerMayUpload, itemDeadline } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * Document upload (US-F2-03, DESIGN.md "Document upload (customer)"): one page per required document. The rule
 * in words, the file and its dates with the automatic check's answer under them, where the document stands, and
 * every version.
 */
const RequestDocumentPage: FC = () => {
  const { id = '', itemId = '' } = useParams();
  const router = useCustomRouter();
  const request = useRequest(id);
  const checklist = useRequestChecklist(id);
  const now = new Date().toISOString();

  if (!request.data) return <RequestLoadState query={request} />;
  const item = checklist.data?.find((i) => i.id === itemId);
  const deadline = item && itemDeadline(item, now);

  return (
    <Flex vertical gap={28}>
      <PageHeader
        back={{
          label: 'Your documents',
          onClick: () =>
            router.push(router.paths.get('request-documents', { pathParams: [request.data!.id] })),
        }}
        title={
          item
            ? `${item.horseName ?? 'Shipment'} · ${item.documentTypeName || item.documentTypeCode}`
            : 'Document'
        }
        summary={
          <span className="type-data text-ink-2">
            {request.data.code}
            {item ? ` · job ${item.jobCode}` : ''}
          </span>
        }
      />

      {checklist.isPending && (
        <Flex justify="center" className="p-12">
          <Spin size="large" />
        </Flex>
      )}

      {(checklist.isError || (checklist.isSuccess && !item)) && (
        <Callout tone="bad" title="This document could not be found">
          Go back to your documents and open it from the list.
        </Callout>
      )}

      {item && deadline && (
        <Row gutter={[24, 24]} align="top">
          <Col span={16}>
            <Flex vertical gap={24}>
              <RulePanel item={item} />
              {customerMayUpload(item) && (
                <UploadPanel item={item} requestId={id} deadline={deadline} />
              )}
            </Flex>
          </Col>
          <Col span={8}>
            <Flex vertical gap={24}>
              <StatusPanel item={item} deadline={deadline} />
              <VersionsPanel checklistItemId={item.id} currentId={item.currentVersion?.id} />
            </Flex>
          </Col>
        </Row>
      )}
    </Flex>
  );
};

export default RequestDocumentPage;
