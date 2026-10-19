import { type FC, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App, Skeleton } from 'antd';
import { useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';

import { IssuePanel, Ledger, MissingCallout, StallChoice, TotalsPanel } from './parts';

import PageHeader from '@/components/PageHeader';
import { Button, Callout, Chip, Panel, StageMark } from '@/components/ui';
import {
  useChangeQuotationClass,
  useQuotation,
  useRepriceQuotation,
  useStartQuotation,
} from '@/hooks/staffRequest';
import type { ServiceClass } from '@/interfaces';
import { queryKeys } from '@/constant/query';
import { apiErrorMessage, conflictMessage, quoteSummary } from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * Quotation builder (US-Q-01, US-Q-03, US-Q-09; spec §7.2): the draft priced from the pinned rate catalog,
 * grouped A–H, with each quantity's derivation, each percentage's base, the air stall fit and the missing rates.
 */
const QuotationBuilderPage: FC = () => {
  const { id } = useParams();
  const router = useCustomRouter();
  const { message } = App.useApp();
  const query = useQuotation(id);
  const start = useStartQuotation();
  const changeClass = useChangeQuotationClass();
  const reprice = useRepriceQuotation();
  const starting = useRef(false);
  const qc = useQueryClient();
  const [conflict, setConflict] = useState<string | null>(null);
  const toReview = () =>
    router.push(router.paths.get('request-review', { pathParams: [id ?? ''] }));
  const back = { label: 'Request review', onClick: toReview };

  const write = async (run: () => Promise<unknown>, done: string) => {
    try {
      await run();
      setConflict(null);
      message.success(done);
    } catch (error) {
      const conflict = conflictMessage(error);
      if (!conflict) {
        message.error(apiErrorMessage(error, "That didn't go through. Try again."));
        return;
      }
      // Someone returned the request or the draft moved on: say so, and show what is true now.
      setConflict(conflict);
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.quotation(id ?? '') });
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.one(id ?? ''), exact: true });
    }
  };

  const onStart = async () => {
    if (starting.current || !id) return;
    starting.current = true;
    await write(() => start.mutateAsync({ requestId: id, value: undefined }), 'Quotation started');
    starting.current = false;
  };

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-7">
        <PageHeader back={back} title="Quotation" />
        <Panel>
          <Skeleton active title={false} paragraph={{ rows: 8 }} />
        </Panel>
      </div>
    );
  }

  if (query.isError) {
    const notStarted = (query.error as AxiosError | undefined)?.response?.status === 404;
    return (
      <div className="flex flex-col gap-7">
        <PageHeader back={back} title="Quotation" />
        {notStarted ? (
          <Panel title="No quotation yet">
            <div className="flex flex-col items-start gap-3">
              <p className="type-body-m m-0 text-ink-2">
                Start the quotation to price this request from the published rate catalog.
              </p>
              <Button variant="secondary" disabled={start.isPending} onClick={() => void onStart()}>
                Start quotation
              </Button>
            </div>
          </Panel>
        ) : (
          <Callout
            tone="bad"
            title="The quotation didn't load."
            action={
              <Button size="sm" variant="secondary" onClick={() => void query.refetch()}>
                Try again
              </Button>
            }
          >
            Nothing has changed. Check your connection and try again.
          </Callout>
        )}
      </div>
    );
  }

  const q = query.data;
  const onClass = (airClass: ServiceClass) =>
    void write(
      () => changeClass.mutateAsync({ requestId: q.request.id, value: airClass }),
      `Priced with ${airClass.toLowerCase()}`,
    );
  const onReprice = () =>
    void write(
      () => reprice.mutateAsync({ requestId: q.request.id, value: undefined }),
      'Quotation re-priced',
    );

  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        back={back}
        title={`${q.request.fromCity} → ${q.request.toCity}`}
        summary={
          <span className="flex flex-col gap-1">
            <span className="type-data text-ink">{q.code}</span>
            <span>{quoteSummary(q)}</span>
          </span>
        }
        right={
          <span className="flex items-center gap-3">
            <StageMark stage="Quotation" />
            <Chip dot={false}>{`Rates v${q.pinnedVersion.versionNo} pinned`}</Chip>
          </span>
        }
      />
      <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
        <div className="flex min-w-0 flex-col gap-6">
          {conflict && (
            <Callout tone="bad" title={conflict}>
              The quotation has been reloaded to show where it stands now.
            </Callout>
          )}
          <MissingCallout quotation={q} />
          {q.repriceNeeded && (
            <Callout tone="warn" title="The request changed since this was priced">
              The lines below are as priced; re-price to work them out from the request as it is
              now.
            </Callout>
          )}
          {q.request.mode === 'AIR' && (
            <StallChoice quotation={q} pending={changeClass.isPending} onChange={onClass} />
          )}
          <Ledger quotation={q} />
          <TotalsPanel quotation={q} />
        </div>
        <IssuePanel quotation={q} repricing={reprice.isPending} onReprice={onReprice} />
      </div>
    </div>
  );
};

export default QuotationBuilderPage;
