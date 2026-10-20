import type { FC } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import {
  AfterYouAccept,
  AgainstEstimate,
  CustomerLedger,
  CustomerTotals,
  MoneyPanel,
  TermsAndVersions,
  WhoPrepared,
} from './panels';
import { QuotedPass } from './QuotedPass';

import { RequestLoadState } from '@/components/request/RequestNotFound';
import PageHeader from '@/components/PageHeader';
import { Button, Chip, OwedItem, Panel, StageMark } from '@/components/ui';
import { useCustomerQuotation } from '@/hooks/request';
import type { CustomerQuotation } from '@/interfaces';
import { daysUntil, deadlineText, formatDate, money, owedKind } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/** The one owed item: accept or decline before the quotation expires. Accepting comes next release. */
const OwedPanel: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const manager = quotation.preparedBy?.name ?? 'The logistics manager';
  const kind = owedKind(quotation.status);
  if (kind === 'accepted' || kind === 'declined') {
    return (
      <Panel
        title="Nothing to answer"
        extra={
          <Chip tone={kind === 'accepted' ? 'ok' : 'neutral'}>
            {kind === 'accepted' ? 'Accepted' : 'Declined'}
          </Chip>
        }
      >
        <p className="type-body-m m-0 text-ink-2">
          {kind === 'accepted'
            ? `You accepted version ${quotation.versionNo}. Its price and horse list hold for this move.`
            : `You declined version ${quotation.versionNo}.`}
        </p>
      </Panel>
    );
  }
  if (kind === 'expired') {
    return (
      <Panel title="Nothing to answer" extra={<Chip dot={false}>Expired</Chip>}>
        <p className="type-body-m m-0 text-ink-2">
          {`This quotation expired on ${quotation.validUntil ? formatDate(quotation.validUntil) : '—'}. ${manager} can re-price it from the rate catalog in force now.`}
        </p>
      </Panel>
    );
  }
  const issued = quotation.issuedAt;
  const until = quotation.validUntil;
  const days = issued && until ? daysUntil(until, issued) : null;
  const deadline = until
    ? deadlineText(until, new Date().toISOString())
    : { line1: '—', line2: '' };
  return (
    <Panel title="1 item" extra={<Chip tone="warn">Waiting for you</Chip>} flush>
      <OwedItem
        urgency="soon"
        title="Accept or decline this quotation"
        subject={`${quotation.code} · version ${quotation.versionNo} · ${
          quotation.totals.total == null ? '—' : money(quotation.totals.total)
        }`}
        reason={
          days != null && issued && until
            ? `It holds its price for ${days} days from ${formatDate(issued)}. After ${formatDate(until)} it expires and ${manager} re-prices it from the rate catalog in force then.`
            : undefined
        }
        deadline={{ left: deadline.line1, date: deadline.line2 }}
      />
      <div className="flex items-center gap-3 border-t border-line px-5 py-4">
        <Button variant="secondary" disabled>
          Accept quotation
        </Button>
        <Button variant="secondary" disabled>
          Decline
        </Button>
        <span className="type-body-s text-ink-3">Accepting comes with the next release.</span>
      </div>
    </Panel>
  );
};

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
    <div className="flex flex-col gap-7">
      <PageHeader
        back={back}
        title={`${q.request.fromCity} → ${q.request.toCity}`}
        summary={
          <span className="type-data text-ink-2">{`${q.request.code} · quotation ${q.code} v${q.versionNo}`}</span>
        }
        right={
          <span className="flex items-center gap-3">
            <StageMark stage="Quotation" />
            <Chip dot={false}>{`Rates v${q.pinnedVersionNo} pinned`}</Chip>
          </span>
        }
      />
      <OwedPanel quotation={q} />
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
        <div className="flex min-w-0 flex-col gap-6">
          <MoneyPanel quotation={q} />
          <CustomerLedger quotation={q} />
          <CustomerTotals quotation={q} />
        </div>
        <div className="flex flex-col gap-6">
          <QuotedPass quotation={q} />
          <AgainstEstimate quotation={q} />
          <AfterYouAccept quotation={q} />
          <WhoPrepared quotation={q} />
          <TermsAndVersions quotation={q} />
        </div>
      </div>
    </div>
  );
};

export default RequestQuotationPage;
