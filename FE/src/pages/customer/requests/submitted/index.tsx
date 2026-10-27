import { type FC, useState } from 'react';
import { Flex } from 'antd';
import { Navigate, useParams } from 'react-router-dom';

import CancelRequestModal from '../CancelRequestModal';
import DocumentsCallout from './DocumentsCallout';
import { WhereItStands } from './WhereItStands';
import { RequestPass } from '../components/RequestPass';
import { VersionsPanel } from '../components/VersionsPanel';

import { InvoicesPanel } from '@/components/invoice/InvoicesPanel';
import { HistoryPanel } from '@/components/request/HistoryPanel';
import { RequestLoadState } from '@/components/request/RequestLoadState';
import PageHeader from '@/components/PageHeader';
import { Button, Callout, Chip, OwedItem, Panel } from '@/components/ui';
import { useRequestInvoices } from '@/hooks/invoice';
import { useRequest, useWizardHorses } from '@/hooks/request';
import {
  cancelledText,
  estimateStub,
  formatDate,
  fromRequest,
  latestRevision,
  passChip,
  quotationCallout,
} from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * The request after submission (spec §6.2): the confirmation with the REQ code, or, when the logistics
 * manager returned it for information, the note it owes an answer to and its versions.
 */
const RequestSubmittedPage: FC = () => {
  const { id = '' } = useParams();
  const router = useCustomRouter();
  const query = useRequest(id);
  const horses = useWizardHorses();
  const { data: invoices } = useRequestInvoices(id);
  const request = query.data;
  const [cancelling, setCancelling] = useState(false);

  if (!request) return <RequestLoadState query={query} />;
  if (request.status === 'DRAFT')
    return <Navigate to={router.paths.get('request-edit', { pathParams: [request.id] })} replace />;

  const latest = latestRevision(request);
  // Before a quotation is issued there is no price to take a fee from; once one is, the quotation page
  // cancels with its fee band (BR-F1-07).
  const cancellable =
    !request.quotation && ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUIRED'].includes(request.status);
  const cancelAction = cancellable && (
    <>
      <Button variant="ghost" onClick={() => setCancelling(true)}>
        Cancel this request
      </Button>
      <CancelRequestModal
        requestId={request.id}
        code={request.code ?? ''}
        fee="No fee: no quotation has been issued yet."
        open={cancelling}
        onClose={() => setCancelling(false)}
      />
    </>
  );
  const callout = request.quotation ? quotationCallout(request.quotation) : null;
  const history = request.history?.length ? <HistoryPanel history={request.history} /> : null;
  const toList = () => router.push(router.paths.get('my-requests'));
  const back = { label: 'My requests', onClick: toList };
  const pass = (chip: ReturnType<typeof passChip>) => (
    <RequestPass
      values={fromRequest(request)}
      live={[]}
      route={request.route}
      notRun={false}
      horses={horses.data ?? []}
      chip={chip}
      {...estimateStub({
        loading: false,
        error: false,
        stored: { low: request.estimateLow, high: request.estimateHigh },
        step: 'review',
      })}
    />
  );

  if (request.status === 'INFO_REQUIRED') {
    const returnedAt = request.revisions.find((v) => v.revisionNo === latest)?.returnedAt ?? null;
    return (
      <Flex vertical gap={28}>
        <PageHeader
          back={back}
          title="Your request needs an answer"
          summary={
            <Flex component="span" vertical gap={4}>
              <span className="type-data-l text-ink">{request.code}</span>
              <span>
                Version {latest}
                {returnedAt ? ` · returned ${formatDate(returnedAt)}` : ''}
              </span>
            </Flex>
          }
        />
        <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
          <Flex vertical gap={24}>
            <Panel title="1 item" flush>
              <OwedItem
                urgency="soon"
                title="A logistics manager needs an answer before quoting"
                subject={`${request.code} · version ${latest}`}
                reason={<span className="whitespace-pre-line">{request.infoRequiredNote}</span>}
                deadline={{
                  left: 'Waiting for you',
                  date: returnedAt ? `Returned ${formatDate(returnedAt)}` : '',
                }}
              />
              <div className="border-t border-line px-5 py-4">
                <Flex align="center" gap={16}>
                  <Button
                    variant="primary"
                    trailingIcon="arrow-right"
                    onClick={() =>
                      router.push(router.paths.get('request-edit', { pathParams: [request.id] }))
                    }
                  >
                    Update your request
                  </Button>
                  <span className="type-body-s text-ink-3">
                    Your request number stays the same; your changes go back as version {latest + 1}
                    .
                  </span>
                  {cancelAction}
                </Flex>
              </div>
            </Panel>
            <WhereItStands request={request} />
            {history}
          </Flex>
          <Flex vertical gap={24}>
            {pass(passChip(request.status))}
            <VersionsPanel request={request} current />
          </Flex>
        </div>
      </Flex>
    );
  }

  const latestSent = request.revisions.find((v) => v.revisionNo === latest)?.submittedAt;
  return (
    <Flex vertical gap={28}>
      <PageHeader
        back={back}
        title={
          request.status === 'CANCELLED'
            ? 'Request cancelled'
            : request.status === 'REJECTED'
              ? 'Request rejected'
              : 'Request submitted'
        }
        summary={
          <Flex component="span" vertical gap={4}>
            <span className="type-data-l text-ink">{request.code}</span>
            {latest >= 2 && latestSent ? (
              <span>
                Version {latest} sent {formatDate(latestSent)}.
              </span>
            ) : (
              request.submittedAt && <span>Submitted {formatDate(request.submittedAt)}.</span>
            )}
          </Flex>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
        <Flex vertical gap={24}>
          {request.status === 'REJECTED' ? (
            <Panel title="Nothing needed from you" extra={<Chip tone="bad">Rejected</Chip>}>
              <Flex vertical gap={8}>
                <p className="type-body-m m-0 text-ink-2">
                  The logistics manager can’t take this move. Their reason:
                </p>
                <p className="type-body-m m-0 whitespace-pre-line text-ink">
                  {request.rejectReason}
                </p>
              </Flex>
            </Panel>
          ) : request.status === 'CANCELLED' ? (
            <Panel title="Nothing needed from you" extra={<Chip dot={false}>Cancelled</Chip>}>
              <p className="type-body-m m-0 text-ink-2">
                {cancelledText(
                  request.cancelledAt,
                  request.cancellationFeePct,
                  request.quotation != null,
                )}
              </p>
            </Panel>
          ) : callout ? (
            <Callout
              tone={callout.tone}
              title={callout.title}
              action={
                <Button
                  size="sm"
                  onClick={() =>
                    router.push(router.paths.get('request-quotation', { pathParams: [request.id] }))
                  }
                >
                  Open quotation
                </Button>
              }
            >
              {callout.body}
            </Callout>
          ) : (
            <Panel title="Nothing needed from you right now">
              <p className="type-body-m m-0 text-ink-2">
                The next step is with {request.nextStep?.owner ?? 'the logistics manager'}. The
                itemised quotation arrives in My requests.
              </p>
            </Panel>
          )}
          {request.status === 'APPROVED' && <DocumentsCallout requestId={request.id} />}
          <WhereItStands request={request} />
          <InvoicesPanel
            invoices={invoices}
            onOpen={(inv) =>
              router.push(router.paths.get('request-invoice', { pathParams: [request.id, inv.id] }))
            }
          />
          {history}
          <p className="type-body-s m-0 text-ink-3">
            Your request number stays the same from submission to handover.
          </p>
          <Flex gap={12}>
            <Button variant="primary" onClick={toList}>
              Go to My requests
            </Button>
            <Button variant="ghost" onClick={() => router.push(router.paths.get('request-new'))}>
              Request another move
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                router.push(router.paths.get('request-ask', { pathParams: [request.id] }))
              }
            >
              Ask a question
            </Button>
            {cancelAction}
          </Flex>
        </Flex>
        <Flex vertical gap={24}>
          {pass(passChip(request.status))}
          {latest >= 2 && <VersionsPanel request={request} />}
        </Flex>
      </div>
    </Flex>
  );
};

export default RequestSubmittedPage;
