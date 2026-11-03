import { type FC } from 'react';
import { Flex } from 'antd';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';

import { WizardForm } from './WizardForm';

import { RequestLoadState } from '@/components/request/RequestLoadState';
import PageHeader from '@/components/PageHeader';
import { Callout, Steps } from '@/components/ui';
import { useRequest } from '@/hooks/request';
import { editable, firstOpenStep, savedLine, WIZARD_STEPS, type WizardStep } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

const STEP_LABELS = ['Horses', 'Route & dates', 'Service', 'Review'];

/** The request wizard (spec §5): /requests/new, and /requests/{id}/edit?step=… on a draft. */
const RequestWizardPage: FC = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const router = useCustomRouter();
  const query = useRequest(id);
  const saved = query.data;

  if (id && !saved) return <RequestLoadState query={query} />;
  if (saved && !editable(saved.status))
    return <Navigate to={router.paths.get('request', { pathParams: [saved.id] })} replace />;

  const asked = params.get('step') as WizardStep | null;
  const step: WizardStep = !saved
    ? 'horses'
    : asked && WIZARD_STEPS.includes(asked)
      ? asked
      : firstOpenStep(saved);

  return (
    <Flex vertical gap={28}>
      <PageHeader
        back={{ label: 'My requests', onClick: () => router.push(router.paths.get('my-requests')) }}
        title="Request transport"
        summary={`${saved ? `${savedLine(saved)} ` : ''}Your move fills in on the right as you go; the binding price comes as an itemised quotation.`}
      />
      {saved?.status === 'INFO_REQUIRED' && saved.infoRequiredNote && (
        <Callout tone="warn" title="The logistics manager asked:">
          <span className="whitespace-pre-line">{saved.infoRequiredNote}</span>
        </Callout>
      )}
      <Steps steps={STEP_LABELS} current={WIZARD_STEPS.indexOf(step)} />
      <WizardForm key={saved?.id ?? 'new'} saved={saved} step={step} />
    </Flex>
  );
};

export default RequestWizardPage;
