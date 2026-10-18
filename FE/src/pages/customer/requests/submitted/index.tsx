import type { FC } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { RequestLoadState } from '../components/RequestNotFound';
import { RequestPass } from '../components/RequestPass';
import { VersionsPanel } from '../components/VersionsPanel';

import PageHeader from '@/components/PageHeader';
import { Button, OwedItem, Panel } from '@/components/ui';
import { useRequest, useWizardHorses } from '@/hooks/request';
import { formatDate, fromRequest, latestRevision, passChip } from '@/lib/utils';
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
  const request = query.data;

  if (!request) return <RequestLoadState query={query} />;
  if (request.status === 'DRAFT')
    return <Navigate to={router.paths.get('request-edit', { pathParams: [request.id] })} replace />;

  const latest = latestRevision(request);
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
    />
  );

  if (request.status === 'INFO_REQUIRED') {
    const returnedAt = request.revisions.find((v) => v.revisionNo === latest)?.returnedAt ?? null;
    return (
      <div className="flex flex-col gap-7">
        <PageHeader
          back={back}
          title="Your request needs an answer"
          summary={
            <span className="flex flex-col gap-1">
              <span className="type-data-l text-ink">{request.code}</span>
              <span>
                Version {latest}
                {returnedAt ? ` · returned ${formatDate(returnedAt)}` : ''}
              </span>
            </span>
          }
        />
        <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
          <div className="flex flex-col gap-6">
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
              <div className="flex items-center gap-4 border-t border-line px-5 py-4">
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
                  Your request number stays the same; your changes go back as version {latest + 1}.
                </span>
              </div>
            </Panel>
          </div>
          <div className="flex flex-col gap-6">
            {pass(passChip(request.status))}
            <VersionsPanel request={request} current />
          </div>
        </div>
      </div>
    );
  }

  const latestSent = request.revisions.find((v) => v.revisionNo === latest)?.submittedAt;
  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        back={back}
        title="Request submitted"
        summary={
          <span className="flex flex-col gap-1">
            <span className="type-data-l text-ink">{request.code}</span>
            {latest >= 2 && latestSent ? (
              <span>
                Version {latest} sent {formatDate(latestSent)}.
              </span>
            ) : (
              request.submittedAt && <span>Submitted {formatDate(request.submittedAt)}.</span>
            )}
          </span>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
        <div className="flex flex-col gap-6">
          <Panel title="Nothing needed from you right now">
            <p className="type-body-m m-0 text-ink-2">
              Next: a logistics manager checks the route, dates and capacity, usually within 1
              business day. The itemised quotation arrives in My requests.
            </p>
          </Panel>
          <p className="type-body-s m-0 text-ink-3">
            Your request number stays the same from submission to handover.
          </p>
          <div className="flex gap-3">
            <Button variant="primary" onClick={toList}>
              Go to My requests
            </Button>
            <Button variant="ghost" onClick={() => router.push(router.paths.get('request-new'))}>
              Request another move
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          {pass(passChip(request.status))}
          {latest >= 2 && <VersionsPanel request={request} />}
        </div>
      </div>
    </div>
  );
};

export default RequestSubmittedPage;
