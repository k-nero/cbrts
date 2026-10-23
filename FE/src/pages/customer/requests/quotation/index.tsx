import type { FC } from 'react';
import { Flex } from 'antd';
import { Navigate, useParams } from 'react-router-dom';

import { AfterYouAccept } from './AfterYouAccept';
import { AgainstEstimate } from './AgainstEstimate';
import { CustomerLedger } from './CustomerLedger';
import { CustomerTotals } from './CustomerTotals';
import { MoneyPanel } from './MoneyPanel';
import { OwedPanel } from './OwedPanel';
import { QuotedPass } from './QuotedPass';
import { TermsAndVersions } from './TermsAndVersions';
import { WhoPrepared } from './WhoPrepared';

import PageHeader from '@/components/PageHeader';
import { RequestLoadState } from '@/components/request/RequestLoadState';
import { Chip, StageMark } from '@/components/ui';
import { useCustomerQuotation } from '@/hooks/request';
import { useCustomRouter } from '@/router/route.hook';

/**
 * The customer's Quotation page (spec §7.2; DESIGN.md, Quotation page and Quotation side column): the
 * latest issued version on the tracking page model. The ledger tags what is fixed or estimated, what the
 * manager overrode or added and why; the side column holds the estimate, the steps after accepting, who
 * prepared it, and the terms and versions.
 */
const RequestQuotationPage: FC = () => {
  const { id = '' } = useParams();
  const router = useCustomRouter();
  const query = useCustomerQuotation(id);
  const q = query.data;
  const back = {
    label: 'My requests',
    onClick: () => router.push(router.paths.get('my-requests')),
  };

  if (!q)
    return (
      <RequestLoadState
        query={query}
        notFound={
          <Navigate to={router.paths.get('request-submitted', { pathParams: [id] })} replace />
        }
      />
    );

  return (
    <Flex vertical gap={28}>
      <PageHeader
        back={back}
        title={`${q.request.fromCity} → ${q.request.toCity}`}
        summary={
          <span className="type-data text-ink-2">{`${q.request.code} · quotation ${q.code} v${q.versionNo}`}</span>
        }
        right={
          <Flex component="span" align="center" gap={12}>
            <StageMark stage="Quotation" />
            <Chip dot={false}>{`Rates v${q.pinnedVersionNo} pinned`}</Chip>
          </Flex>
        }
      />
      <OwedPanel quotation={q} />
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
        <Flex vertical gap={24} className="min-w-0">
          <MoneyPanel quotation={q} />
          <CustomerLedger quotation={q} />
          <CustomerTotals quotation={q} />
        </Flex>
        <Flex vertical gap={24}>
          <QuotedPass quotation={q} />
          <AgainstEstimate quotation={q} />
          <AfterYouAccept quotation={q} />
          <WhoPrepared quotation={q} />
          <TermsAndVersions quotation={q} />
        </Flex>
      </div>
    </Flex>
  );
};

export default RequestQuotationPage;
