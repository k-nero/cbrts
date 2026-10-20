import { type FC, useState } from 'react';
import { App } from 'antd';

import { zodResolver } from '@hookform/resolvers/zod';

import { ManualLineEditor, OverrideEditor, type RunWrite } from './LineEditor';
import { type IssueForm, issueSchema } from './schemas';

import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';

import { Button, Callout, Chip, Panel, QuoteLine, Tabs } from '@/components/ui';
import { useRemoveLine, useRemoveOverride } from '@/hooks/staffRequest';
import type { QuotationDraft, QuoteLineRow, ServiceClass } from '@/interfaces';
import {
  changedSince,
  classOptions,
  depositText,
  formatDate,
  issueBlocker,
  money,
  moneyOrDash,
  readinessView,
  repriceOffer,
  validityText,
} from '@/lib/utils';

const certainty = (line: QuoteLineRow) =>
  line.overrideAmount != null
    ? 'overridden'
    : line.certainty === 'ESTIMATED'
      ? 'estimated'
      : 'fixed';

const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

type Open = { kind: 'override' | 'edit'; lineId: string } | { kind: 'add'; group: string } | null;

/**
 * The ledger (DESIGN.md, Quotation builder): groups A–H with letter badges and subtotals, then the lines.
 * On a draft each priced line can be overridden inline under it, and each group takes a line the manager
 * adds; a revision marks what changed since the version it replaces.
 */
export const Ledger: FC<{ quotation: QuotationDraft; editable: boolean; run: RunWrite }> = ({
  quotation,
  editable,
  run,
}) => {
  const { modal } = App.useApp();
  const [open, setOpen] = useState<Open>(null);
  const removeOverride = useRemoveOverride();
  const removeLine = useRemoveLine();
  const requestId = quotation.request.id;
  const close = () => setOpen(null);
  const pending = removeOverride.isPending || removeLine.isPending;

  const onRemoveOverride = (l: QuoteLineRow) =>
    void run(
      () => removeOverride.mutateAsync({ requestId, value: l.id }),
      'Back to the catalog amount',
    );
  const onRemoveLine = (l: QuoteLineRow) =>
    modal.confirm({
      title: `Remove ${l.description}?`,
      content: 'The line leaves the draft and the totals are worked out again.',
      okText: 'Remove line',
      okButtonProps: { danger: true },
      cancelText: 'Keep it',
      onOk: () => run(() => removeLine.mutateAsync({ requestId, value: l.id }), 'Line removed'),
    });

  const extra = (l: QuoteLineRow) => {
    const changed = changedSince(l, quotation.previous);
    const actions = editable && open === null;
    return (
      <>
        {l.manual && l.manualReason && (
          <span className="type-body-s text-ink-3">{`Added: ${l.manualReason}`}</span>
        )}
        {l.manual && l.estimateNote && (
          <span className="type-body-s text-warn">{l.estimateNote}</span>
        )}
        {changed && <span className="type-mono-caption text-ink-3">{changed}</span>}
        {actions && (l.manual || l.amount != null) && (
          <span className="flex flex-wrap gap-2 pt-1">
            {l.manual ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Edit ${l.description}`}
                  onClick={() => setOpen({ kind: 'edit', lineId: l.id })}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${l.description}`}
                  disabled={pending}
                  onClick={() => onRemoveLine(l)}
                >
                  Remove
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Override ${l.description}`}
                  onClick={() => setOpen({ kind: 'override', lineId: l.id })}
                >
                  {l.overrideAmount != null ? 'Change override' : 'Override'}
                </Button>
                {l.overrideAmount != null && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => onRemoveOverride(l)}
                  >
                    Remove override
                  </Button>
                )}
              </>
            )}
          </span>
        )}
      </>
    );
  };

  const note = (l: QuoteLineRow) => {
    if (l.overrideAmount != null) return l.overrideReason ?? undefined;
    return l.manual ? undefined : (l.estimateNote ?? undefined);
  };

  return (
    <Panel title="Quotation lines" flush>
      <div className="grid grid-cols-[minmax(0,1fr)_48px_96px_120px_110px] gap-4 bg-sunken px-5 py-3">
        <span className="type-mono-label text-ink-3">Item</span>
        <span className="type-mono-label text-right text-ink-3">Qty</span>
        <span className="type-mono-label text-right text-ink-3">Rate</span>
        <span className="type-mono-label text-right text-ink-3">Amount</span>
        <span />
      </div>
      {quotation.groups.map((g) => (
        <section key={g.code} aria-label={`${g.code} ${g.name}`}>
          <div className="flex items-center gap-3 px-5 pt-4 pb-2">
            <span className="type-mono-chip flex size-6 items-center justify-center rounded-sm bg-muted text-ink-2">
              {g.code}
            </span>
            <span className="type-h4 flex-1 text-ink">{g.name}</span>
            {editable && open === null && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Add a line to ${g.name}`}
                onClick={() => setOpen({ kind: 'add', group: g.code })}
              >
                Add line
              </Button>
            )}
            <span className="type-data text-ink-2">{moneyOrDash(g.subtotal)}</span>
          </div>
          {g.lines.map((l) => (
            <div key={l.id}>
              <QuoteLine
                certainty={certainty(l)}
                description={
                  l.manual ? (
                    <span className="flex items-center gap-2">
                      {l.description}
                      <Chip dot={false}>Manual</Chip>
                    </span>
                  ) : (
                    l.description
                  )
                }
                basis={l.basisText}
                qty={qty(l.quantity)}
                rate={l.unitRate == null ? null : money(l.unitRate)}
                amount={l.amount == null ? null : money(l.amount)}
                catalogAmount={l.catalogAmount == null ? undefined : money(l.catalogAmount)}
                note={note(l)}
                extra={extra(l)}
              />
              {open?.kind === 'override' && open.lineId === l.id && (
                <OverrideEditor requestId={requestId} line={l} run={run} onClose={close} />
              )}
              {open?.kind === 'edit' && open.lineId === l.id && (
                <ManualLineEditor
                  requestId={requestId}
                  group={g.code}
                  editing={l}
                  run={run}
                  onClose={close}
                />
              )}
            </div>
          ))}
          {open?.kind === 'add' && open.group === g.code && (
            <ManualLineEditor
              requestId={requestId}
              group={g.code}
              editing={null}
              run={run}
              onClose={close}
            />
          )}
        </section>
      ))}
    </Panel>
  );
};

/** Totals in the fixed order, each percentage row naming its base. */
export const TotalsPanel: FC<{ quotation: QuotationDraft }> = ({ quotation }) => {
  const t = quotation.totals;
  return (
    <Panel title="Totals">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <span className="flex flex-col gap-0.5">
            <span className="type-label-m text-ink">
              {t.subtotal == null ? 'Priced lines' : 'Direct cost subtotal'}
            </span>
            <span className="type-caption text-ink-3">Groups A–H</span>
          </span>
          <span className="type-data text-ink">{money(t.subtotal ?? t.pricedLines)}</span>
        </div>
        {t.rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4">
            <span className="flex flex-col gap-0.5">
              <span className="type-label-m text-ink">{r.label}</span>
              <span className="type-caption text-ink-3">{r.baseText}</span>
            </span>
            <span className="type-data text-ink">
              {r.amount == null ? '—' : `${r.key === 'VOLUME_BREAK' ? '−' : ''}${money(r.amount)}`}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
          <span className="type-h3 text-ink">{`Total, ${quotation.currency}`}</span>
          <span className="type-display-m text-ink">{moneyOrDash(t.total)}</span>
        </div>
        {quotation.status === 'DRAFT' && quotation.previous?.total != null && (
          <span className="type-mono-caption self-end text-ink-3">
            {`v${quotation.previous.versionNo} total ${money(quotation.previous.total)}`}
          </span>
        )}
        <p className="type-body-s m-0 text-ink-3">
          {`Applied in a fixed order: the volume break on air and ground lines, fuel on the discounted air lines, insurance on declared value, then contingency, then the service fee. Rate catalog v${quotation.pinnedVersion.versionNo} is pinned to this quotation.`}
        </p>
      </div>
    </Panel>
  );
};

/** The air class the draft is priced with; a refusal names the classes the horses fit. */
export const StallChoice: FC<{
  quotation: QuotationDraft;
  pending: boolean;
  onChange: (c: ServiceClass) => void;
}> = ({ quotation, pending, onChange }) => {
  const current = quotation.airClass ?? quotation.request.requestedClass ?? 'BUSINESS';
  const options = classOptions(quotation.request.mode, quotation.fit, pending);
  const fit = quotation.fit;
  return (
    <Panel title="Air stall">
      <div className="flex flex-col gap-3">
        <Tabs<ServiceClass>
          label="Service class"
          items={options.map((o) => ({ key: o.value, label: o.label, disabled: o.disabled }))}
          activeKey={current}
          onChange={(key) => !pending && key !== current && onChange(key)}
        />
        {fit?.refusal ? (
          <span className="flex flex-col gap-1">
            <span className="type-body-s text-bad">{fit.refusal}</span>
            <span className="type-body-s text-ink-2">
              {fit.achievableClasses.length
                ? `Fits: ${options
                    .filter((o) => o.fits)
                    .map((o) => o.label)
                    .join(', ')}`
                : 'No class in the catalog fits these horses.'}
            </span>
          </span>
        ) : fit ? (
          <span className="type-body-s text-ink-2">
            {`${fit.widthUsedIn} in across ${fit.positions} ${fit.positions === 1 ? 'position' : 'positions'} of 96 in.`}
          </span>
        ) : (
          <span className="type-body-s text-ink-3">
            This class has no stall rate in the catalog.
          </span>
        )}
        {quotation.request.requestedClass && current !== quotation.request.requestedClass && (
          <span className="type-body-s text-ink-3">
            {`The customer asked for ${quotation.request.requestedClass.toLowerCase()}.`}
          </span>
        )}
      </div>
    </Panel>
  );
};

const Row: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="type-body-s text-ink-2">{label}</span>
    {children}
  </div>
);

const TwoLines: FC<{ line1: string; line2: string }> = ({ line1, line2 }) => (
  <span className="flex flex-col items-end gap-0.5">
    <span className="type-label-s text-ink">{line1}</span>
    <span className="type-caption text-ink-3">{line2}</span>
  </span>
);

/**
 * The issue panel (DESIGN.md, Quotation builder): total, validity said twice, the currency, readiness,
 * and the one gold "Issue quotation" once nothing blocks it. Otherwise the button is a disabled Secondary
 * and the first blocker is named. From version 2 on, what changed since the last version is required.
 */
export const IssuePanel: FC<{
  quotation: QuotationDraft;
  repricing: boolean;
  onReprice: () => void;
  issuing: boolean;
  onIssue: (changeNote: string | null) => void;
  discarding: boolean;
  onDiscard: () => void;
}> = ({ quotation, repricing, onReprice, issuing, onIssue, discarding, onDiscard }) => {
  const offer = repriceOffer(quotation);
  const readiness = readinessView(quotation);
  const blocker = issueBlocker(quotation.readiness);
  const validity = validityText(null, quotation.validityDays);
  const methods = useFormCustom<IssueForm>({
    resolver: zodResolver(issueSchema(quotation.versionNo)),
    defaultValues: { changeNote: '' },
  });
  const onSubmit = methods.handleSubmit((v) => onIssue(v.changeNote.trim() || null));
  return (
    <Panel>
      <div className="flex flex-col gap-3">
        <span className="type-h4 text-ink">{`Issue version ${quotation.versionNo}`}</span>
        <Row label="Total">
          <span className="type-data text-ink">{moneyOrDash(quotation.totals.total)}</span>
        </Row>
        <Row label="Deposit">
          <TwoLines line1="On acceptance" line2="from the pinned catalog, fixed at issue" />
        </Row>
        <Row label="Validity">
          <TwoLines line1={validity.line1} line2={validity.line2} />
        </Row>
        <Row label="Currency">
          <span className="type-label-s text-ink">{`${quotation.currency} · FX pinned at issue`}</span>
        </Row>
        <div className="flex items-center gap-3 border-t border-line pt-3">
          {readiness.tone === 'ok' ? (
            <Chip tone="ok">{readiness.chip}</Chip>
          ) : (
            <Chip dot={false}>{readiness.chip}</Chip>
          )}
          <span className="type-body-s text-ink-2">{readiness.text}</span>
        </div>
        <FormWrapper
          methods={methods}
          isSubmitting={issuing}
          mode="add"
          onFinish={onSubmit}
          layout="vertical"
          force
        >
          {({ FormField }) => (
            <>
              {quotation.versionNo > 1 && (
                <FormField
                  name="changeNote"
                  label={`What changed since version ${quotation.versionNo - 1}`}
                  component="textarea"
                  componentProps={{ isRequired: true, rows: 3, maxLength: 300 }}
                />
              )}
              {blocker ? (
                <span className="flex flex-col gap-2">
                  <Button variant="secondary" block disabled>
                    Issue quotation
                  </Button>
                  <span className="type-body-s text-ink-2">{blocker}</span>
                </span>
              ) : (
                <Button variant="primary" block type="submit" disabled={issuing}>
                  Issue quotation
                </Button>
              )}
            </>
          )}
        </FormWrapper>
        {quotation.versionNo > 1 && (
          <Button variant="ghost" block disabled={discarding} onClick={onDiscard}>
            {`Discard draft v${quotation.versionNo}`}
          </Button>
        )}
        {(offer || quotation.repriceNeeded) && (
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <span className="type-body-s text-ink-2">
              {offer
                ? `Rate catalog v${quotation.latestPublishedVersionNo} is published.`
                : 'Re-price to work it out again from the request as it is now.'}
            </span>
            <Button variant="secondary" block disabled={repricing} onClick={onReprice}>
              {offer ?? 'Re-price'}
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
};

/** The rates the catalog can't supply, and who keeps the catalog. */
export const MissingCallout: FC<{ quotation: QuotationDraft }> = ({ quotation }) => {
  if (quotation.missing.length === 0) return null;
  const n = quotation.missing.length;
  return (
    <Callout
      tone="bad"
      title={`${n} ${n === 1 ? 'rate is' : 'rates are'} missing on ${quotation.request.fromCity} → ${quotation.request.toCity}`}
    >
      <span className="flex flex-col gap-1">
        {quotation.missing.map((m) => (
          <span key={m.description}>{m.why}</span>
        ))}
        {quotation.catalogOwner && (
          <span>{`${quotation.catalogOwner}, transport specialist, keeps the rate catalog.`}</span>
        )}
      </span>
    </Callout>
  );
};

const STATUS_TONE: Record<string, 'info' | 'neutral' | 'ok' | 'warn'> = {
  ISSUED: 'info',
  ACCEPTED: 'ok',
  EXPIRED: 'neutral',
  SUPERSEDED: 'neutral',
  DECLINED: 'neutral',
  DRAFT: 'warn',
};

/** The version's status as a chip: "Issued" Info, "Expired" or "Superseded" Neutral, "Draft" Warn. */
export const VersionChip: FC<{ status: QuotationDraft['status'] }> = ({ status }) => (
  <Chip tone={STATUS_TONE[status]} dot={false}>
    {status.charAt(0) + status.slice(1).toLowerCase()}
  </Chip>
);

/**
 * An issued version is a document: no edit controls, only when it was issued and until when it holds,
 * the deposit, and on the latest version the way on: revise it into the next version, or open that draft.
 */
export const StatusPanel: FC<{
  quotation: QuotationDraft;
  latest: boolean;
  draftVersionNo: number | null;
  revising: boolean;
  onRevise: () => void;
  onOpenDraft: () => void;
}> = ({ quotation, latest, draftVersionNo, revising, onRevise, onOpenDraft }) => {
  const validity = validityText(quotation.validUntil, quotation.validityDays);
  const expired = quotation.status === 'EXPIRED';
  return (
    <Panel>
      <div className="flex flex-col gap-3">
        <span className="flex items-center justify-between gap-3">
          <span className="type-h4 text-ink">{`Version ${quotation.versionNo}`}</span>
          <VersionChip status={quotation.status} />
        </span>
        <Row label="Total">
          <span className="type-data text-ink">{moneyOrDash(quotation.totals.total)}</span>
        </Row>
        <Row label="Issued">
          <span className="type-label-s text-ink">
            {quotation.issuedAt ? formatDate(quotation.issuedAt) : '—'}
          </span>
        </Row>
        <Row label={expired ? 'Expired' : 'Valid'}>
          <TwoLines line1={validity.line1} line2={validity.line2} />
        </Row>
        <Row label="Deposit">
          <span className="type-data text-ink">{depositText(quotation.deposit)}</span>
        </Row>
        <Row label="Currency">
          <span className="type-label-s text-ink">{quotation.currency}</span>
        </Row>
        {latest && (
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            {draftVersionNo != null ? (
              <Button variant="secondary" block onClick={onOpenDraft}>
                {`Open draft v${draftVersionNo}`}
              </Button>
            ) : (
              <>
                <span className="type-body-s text-ink-2">
                  {expired
                    ? 'Revise it to price it again from the rate catalog in force now.'
                    : 'An issued quotation is never edited. A change makes the next version; this one holds until that is issued.'}
                </span>
                <Button variant="secondary" block disabled={revising} onClick={onRevise}>
                  Revise quotation
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
};

/** Every version of the quotation, newest first; choosing one shows it. */
export const VersionsPanel: FC<{
  quotation: QuotationDraft;
  onPick: (versionNo: number) => void;
}> = ({ quotation, onPick }) => (
  <Panel title="Versions">
    <div className="flex flex-col gap-2">
      {quotation.versions.map((v) => (
        <button
          key={v.versionNo}
          type="button"
          onClick={() => onPick(v.versionNo)}
          aria-current={v.versionNo === quotation.versionNo ? 'true' : undefined}
          className={`flex flex-col gap-1 rounded-md border px-3 py-2 text-left ${
            v.versionNo === quotation.versionNo ? 'border-line-strong bg-sunken' : 'border-line'
          }`}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="type-data text-ink">{`v${v.versionNo}`}</span>
            <VersionChip status={v.status} />
          </span>
          <span className="type-body-s text-ink-2">
            {[
              v.total == null ? null : money(v.total),
              v.issuedAt ? `issued ${formatDate(v.issuedAt)}` : 'draft',
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          {v.supersededReason && (
            <span className="type-body-s text-ink-3">{`Superseded. ${v.supersededReason}`}</span>
          )}
        </button>
      ))}
    </div>
  </Panel>
);
