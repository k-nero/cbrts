import type { FC } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { RequestLoadState } from '../components/RequestNotFound';
import { RequestPass } from '../components/RequestPass';

import PageHeader from '@/components/PageHeader';
import { Button, Panel } from '@/components/ui';
import { useRequest, useWizardHorses } from '@/hooks/request';
import { formatDate, fromRequest } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/** The confirmation after submitting (spec §6): the REQ code, and what happens next. */
const RequestSubmittedPage: FC = () => {
  const { id = '' } = useParams();
  const router = useCustomRouter();
  const query = useRequest(id);
  const horses = useWizardHorses();
  const request = query.data;

  if (!request) return <RequestLoadState query={query} />;
  if (request.status === 'DRAFT')
    return <Navigate to={router.paths.get('request-edit', { pathParams: [request.id] })} replace />;

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        back={{ label: 'My requests', onClick: () => router.push(router.paths.get('my-requests')) }}
        title="Request submitted"
        summary={
          <span className="flex flex-col gap-1">
            <span className="type-data-l text-ink">{request.code}</span>
            {request.submittedAt && <span>Submitted {formatDate(request.submittedAt)}.</span>}
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
            <Button variant="primary" onClick={() => router.push(router.paths.get('my-requests'))}>
              Go to My requests
            </Button>
            <Button variant="ghost" onClick={() => router.push(router.paths.get('request-new'))}>
              Request another move
            </Button>
          </div>
        </div>
        <RequestPass
          values={fromRequest(request)}
          saved={request}
          route={request.route}
          notRun={false}
          horses={horses.data ?? []}
          chip={{ tone: 'neutral', label: 'Submitted' }}
        />
      </div>
    </div>
  );
};

export default RequestSubmittedPage;
