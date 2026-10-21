import { type FC, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App, Skeleton } from 'antd';
import { useParams, useSearchParams } from 'react-router-dom';

import type { RunWrite } from './editorOptions';
import { IssuePanel } from './IssuePanel';
import { Ledger } from './Ledger';
import { MissingCallout } from './MissingCallout';
import { StallChoice } from './StallChoice';
import { StatusPanel } from './StatusPanel';
import { TotalsPanel } from './TotalsPanel';
import { VersionChip } from './VersionChip';
import { VersionsPanel } from './VersionsPanel';

import PageHeader from '@/components/PageHeader';
import { Button, Callout, Chip, Panel, StageMark } from '@/components/ui';
import {
  useChangeQuotationClass,
  useDiscardRevision,
  useIssueQuotation,
  useQuotation,
  useRepriceQuotation,
  useReviseQuotation,
  useStartQuotation,
} from '@/hooks/staffRequest';
import type { QuotationDraft, ServiceClass } from '@/interfaces';
import { queryKeys } from '@/constant/query';
import {
  apiErrorMessage,
  conflictMessage,
  formatDate,
  ict,
  money,
  quoteSummary,
  statusActions,
} from '@/lib/utils';
import { useCustomRouter } from '@/router/route.hook';

/**
 * Quotation builder (US-Q-01, US-Q-03, US-Q-09; spec §7.2): the draft priced from the pinned rate catalog,
 * grouped A–H, with each quantity's derivation, each percentage's base, the air stall fit and the missing rates.
 */
const QuotationBuilderPage: FC = () => {
  const { id } = useParams();
  const router = useCustomRouter();
  const { message, modal } = App.useApp();
  const [params, setParams] = useSearchParams();
  const version = Number(params.get('version')) || undefined;
  const query = useQuotation(id, version);
  const start = useStartQuotation();
  const changeClass = useChangeQuotationClass();
  const reprice = useRepriceQuotation();
  const issue = useIssueQuotation();
  const revise = useReviseQuotation();
  const discard = useDiscardRevision();
  const showVersion = (v: number | null) => setParams(v == null ? {} : { version: String(v) });
  const starting = useRef(false);
  const qc = useQueryClient();
  const [conflict, setConflict] = useState<string | null>(null);
  const toReview = () =>
    router.push(router.paths.get('request-review', { pathParams: [id ?? ''] }));
  const back = { label: 'Request review', onClick: toReview };

  const write: RunWrite = async (run, done) => {
    try {
      const answer = await run();
      setConflict(null);
      message.success(done);
      // An override whose line the catalog no longer quotes can't be carried: say which.
      const dropped = (answer as Partial<QuotationDraft> | undefined)?.droppedOverrides ?? [];
      if (dropped.length > 0) message.warning(`Override dropped. ${dropped.join(' ')}`);
      return true;
    } catch (error) {
      const conflict = conflictMessage(error);
      if (!conflict) {
        message.error(apiErrorMessage(error, "That didn't go through. Try again."));
        return false;
      }
      // Someone returned the request or the draft moved on: say so, and show what is true now.
      setConflict(conflict);
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.quotations(id ?? '') });
      void qc.invalidateQueries({ queryKey: queryKeys.staffRequests.one(id ?? ''), exact: true });
      return false;
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

  // Any other failure went to the error boundary (useQuotation): no data here means none was started, or
  // the version in the address doesn't exist.
  if (!query.data && version) {
    return (
      <div className="flex flex-col gap-7">
        <PageHeader back={back} title="Quotation" />
        <Callout
          tone="info"
          title={`This quotation has no version ${version}.`}
          action={
            <Button size="sm" variant="secondary" onClick={() => showVersion(null)}>
              Open the latest
            </Button>
          }
        />
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="flex flex-col gap-7">
        <PageHeader back={back} title="Quotation" />
        {conflict && <Callout tone="bad" title={conflict} />}
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
  const draft = q.status === 'DRAFT';
  const actions = statusActions(q);
  const onIssue = (changeNote: string | null) =>
    modal.confirm({
      title: `Issue ${q.code} v${q.versionNo} for ${q.totals.total == null ? '—' : money(q.totals.total, q.currency)}?`,
      content: `${q.request.club ?? 'The club'} can accept it until ${ict(new Date().toISOString())
        .add(q.validityDays ?? 0, 'day')
        .format(
          'D MMM YYYY',
        )}. An issued quotation is never edited; a change makes version ${q.versionNo + 1}.`,
      okText: 'Issue quotation',
      cancelText: 'Not yet',
      onOk: async () => {
        const ok = await write(
          () => issue.mutateAsync({ requestId: q.request.id, value: changeNote }),
          `${q.code} v${q.versionNo} issued`,
        );
        if (ok) showVersion(null);
      },
    });
  const onRevise = () =>
    void write(
      () => revise.mutateAsync({ requestId: q.request.id, value: undefined }),
      `Version ${q.versionNo + 1} drafted`,
    ).then((ok) => ok && showVersion(null));
  const onDiscard = () =>
    modal.confirm({
      title: `Discard draft v${q.versionNo}?`,
      content: `Every change in it is lost. Version ${q.versionNo - 1} stands as issued.`,
      okText: 'Discard draft',
      okButtonProps: { danger: true },
      cancelText: 'Keep editing',
      onOk: async () => {
        try {
          await discard.mutateAsync({ requestId: q.request.id });
          message.success(`Draft v${q.versionNo} discarded`);
          showVersion(null);
        } catch (error) {
          message.error(apiErrorMessage(error, "The draft wasn't discarded. Try again."));
        }
      },
    });

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
            <VersionChip status={q.status} />
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
          {draft && <MissingCallout quotation={q} />}
          {!draft && (
            <Callout
              tone="info"
              title={`Version ${q.versionNo} was issued${q.issuedAt ? ` on ${formatDate(q.issuedAt)}` : ''}`}
            >
              An issued quotation is a document: it reads as it was issued and is never edited.
            </Callout>
          )}
          {draft && q.repriceNeeded && (
            <Callout tone="warn" title="The request changed since this was priced">
              The lines below are as priced; re-price to work them out from the request as it is
              now.
            </Callout>
          )}
          {draft && q.request.mode === 'AIR' && (
            <StallChoice quotation={q} pending={changeClass.isPending} onChange={onClass} />
          )}
          <Ledger key={`${q.versionNo}-${q.status}`} quotation={q} editable={draft} run={write} />
          <TotalsPanel quotation={q} />
        </div>
        <div className="flex flex-col gap-6">
          {draft ? (
            <IssuePanel
              quotation={q}
              repricing={reprice.isPending}
              onReprice={onReprice}
              issuing={issue.isPending}
              onIssue={onIssue}
              discarding={discard.isPending}
              onDiscard={onDiscard}
            />
          ) : (
            <StatusPanel
              quotation={q}
              latest={actions.latest}
              canRevise={actions.canRevise}
              draftVersionNo={actions.draftVersionNo}
              revising={revise.isPending}
              onRevise={onRevise}
              onOpenDraft={() => showVersion(null)}
            />
          )}
          {q.versions.length > 1 && (
            <VersionsPanel
              quotation={q}
              onPick={(v) => showVersion(v === q.versions[0].versionNo ? null : v)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotationBuilderPage;
