import type { FC } from 'react';
import { Flex } from 'antd';
import { useParams } from 'react-router-dom';

import { AskPanel } from './AskPanel';
import { EarlierNotes } from './EarlierNotes';
import { WhoAnswers } from './WhoAnswers';

import PageHeader from '@/components/PageHeader';
import { RequestLoadState } from '@/components/request/RequestLoadState';
import { useRequestNotes } from '@/hooks/customerNote';
import { useRequest } from '@/hooks/request';
import { useCustomRouter } from '@/router/route.hook';

/**
 * Ask a question (US-00-08; Figma, Tracking · Ask a question): a note on the request, routed by its topic to the
 * person who answers it, beside every earlier note and its replies.
 */
const RequestAskPage: FC = () => {
  const { id = '' } = useParams();
  const router = useCustomRouter();
  const request = useRequest(id);
  const notes = useRequestNotes(id);

  if (!request.data) return <RequestLoadState query={request} />;

  return (
    <Flex vertical gap={28}>
      <PageHeader
        back={{
          label: 'Back to the request',
          onClick: () =>
            router.push(router.paths.get('request-submitted', { pathParams: [request.data!.id] })),
        }}
        title="Ask a question"
        summary={<span className="type-data text-ink-2">{request.data.code}</span>}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
        <AskPanel requestId={request.data.id} />
        <Flex vertical gap={24}>
          <EarlierNotes notes={notes.data ?? []} />
          <WhoAnswers />
        </Flex>
      </div>
    </Flex>
  );
};

export default RequestAskPage;
