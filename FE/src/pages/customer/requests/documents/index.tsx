import { type FC, useState } from 'react';
import { Flex, Spin } from 'antd';
import { useParams } from 'react-router-dom';

import ChecklistGroupTable from './ChecklistGroupTable';
import DocumentsSummary from './DocumentsSummary';

import PageHeader from '@/components/PageHeader';
import { RequestLoadState } from '@/components/request/RequestLoadState';
import { Callout, Panel, Tabs } from '@/components/ui';
import { useRequestChecklist } from '@/hooks/clearance';
import { useRequest } from '@/hooks/request';
import type { ChecklistItem } from '@/interfaces';
import { groupChecklist, isCleared, isOwedByCustomer, isWithAuthority } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

type View = 'all' | 'you' | 'authorities' | 'cleared';

const VIEWS: Record<View, (item: ChecklistItem) => boolean> = {
  all: () => true,
  you: isOwedByCustomer,
  authorities: isWithAuthority,
  cleared: isCleared,
};

/**
 * All documents (US-F2-02, DESIGN.md "All documents (customer)"): every document the move needs, grouped by
 * horse and then the shipment, with who holds each and by when. What the club owes and is overdue stands out.
 */
const RequestDocumentsPage: FC = () => {
  const { id = '' } = useParams();
  const router = useCustomRouter();
  const request = useRequest(id);
  const checklist = useRequestChecklist(id);
  const [view, setView] = useState<View>('all');
  const now = new Date().toISOString();

  if (!request.data) return <RequestLoadState query={request} />;
  const items = checklist.data ?? [];
  const jobCode = items[0]?.jobCode;
  const count = (v: View) => items.filter(VIEWS[v]).length;
  const groups = groupChecklist(items)
    .map((g) => ({ ...g, items: g.items.filter(VIEWS[view]) }))
    .filter((g) => g.items.length > 0);

  return (
    <Flex vertical gap={28}>
      <PageHeader
        back={{
          label: 'Back to the request',
          onClick: () =>
            router.push(router.paths.get('request-submitted', { pathParams: [request.data!.id] })),
        }}
        title="Documents"
        summary={
          <span className="type-data text-ink-2">
            {request.data.code}
            {jobCode ? ` · ${jobCode}` : ''}
          </span>
        }
      />

      {checklist.isPending && (
        <Flex justify="center" className="p-12">
          <Spin size="large" />
        </Flex>
      )}

      {checklist.isError && (
        <Callout tone="bad" title="Your documents could not be loaded">
          Refresh the page. If it keeps failing, sign in again.
        </Callout>
      )}

      {checklist.isSuccess && items.length === 0 && (
        <Panel title="No documents yet">
          <p className="type-body-m m-0 text-ink-2">
            The list of documents is made from the countries on your route once the logistics
            manager approves your move. Each one then shows here with its deadline.
          </p>
        </Panel>
      )}

      {items.length > 0 && (
        <>
          <DocumentsSummary items={items} now={now} />
          <Flex vertical gap={16}>
            <Tabs
              label="Documents"
              activeKey={view}
              onChange={setView}
              items={[
                { key: 'all', label: 'All', count: items.length },
                { key: 'you', label: 'With you', count: count('you') },
                { key: 'authorities', label: 'With the authorities', count: count('authorities') },
                { key: 'cleared', label: 'Cleared', count: count('cleared') },
              ]}
            />
            {groups.length === 0 ? (
              <Panel>
                <p className="type-body-m m-0 text-ink-2">
                  {view === 'you' ? 'Nothing needed from you right now.' : 'No documents here.'}
                </p>
              </Panel>
            ) : (
              <div className="overflow-hidden rounded-lg border border-line bg-card">
                {groups.map((group) => (
                  <ChecklistGroupTable key={group.key} group={group} now={now} />
                ))}
              </div>
            )}
            <p className="type-body-s m-0 text-ink-3">
              We remind you 7, 3 and 1 days before each document you owe is due.
            </p>
          </Flex>
        </>
      )}
    </Flex>
  );
};

export default RequestDocumentsPage;
