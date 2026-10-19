import type { FC } from 'react';

import { Button, Callout, Chip, Panel, QuoteLine, Tabs } from '@/components/ui';
import type { QuotationDraft, QuoteLineRow, ServiceClass } from '@/interfaces';
import { classOptions, money, moneyOrDash, readinessView, repriceOffer } from '@/lib/utils';

const certainty = (line: QuoteLineRow) =>
  line.certainty === 'ESTIMATED'
    ? 'estimated'
    : line.certainty === 'OVERRIDDEN'
      ? 'overridden'
      : 'fixed';

const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** The ledger (DESIGN.md, Quotation builder): groups A–H with letter badges and subtotals, then the lines. */
export const Ledger: FC<{ quotation: QuotationDraft }> = ({ quotation }) => (
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
          <span className="type-data text-ink-2">{moneyOrDash(g.subtotal)}</span>
        </div>
        {g.lines.map((l, i) => (
          <QuoteLine
            key={`${g.code}-${i}`}
            certainty={certainty(l)}
            description={l.description}
            basis={l.basisText}
            qty={qty(l.quantity)}
            rate={l.unitRate == null ? null : money(l.unitRate)}
            amount={l.amount == null ? null : money(l.amount)}
            note={l.estimateNote ?? undefined}
          />
        ))}
      </section>
    ))}
  </Panel>
);

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
  const options = classOptions(quotation.fit, current);
  const fit = quotation.fit;
  return (
    <Panel title="Air stall">
      <div className="flex flex-col gap-3">
        <Tabs<ServiceClass>
          label="Service class"
          items={options.map((o) => ({ key: o.value, label: o.label }))}
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

/** The issue panel: total, validity said twice, currency, readiness. Issuing comes with the next step. */
export const IssuePanel: FC<{
  quotation: QuotationDraft;
  repricing: boolean;
  onReprice: () => void;
}> = ({ quotation, repricing, onReprice }) => {
  const offer = repriceOffer(quotation);
  const readiness = readinessView(quotation);
  return (
    <Panel>
      <div className="flex flex-col gap-3">
        <span className="type-h4 text-ink">{`Issue version ${quotation.versionNo}`}</span>
        <div className="flex items-center justify-between gap-4">
          <span className="type-body-s text-ink-2">Total</span>
          <span className="type-data text-ink">{moneyOrDash(quotation.totals.total)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="type-body-s text-ink-2">Validity</span>
          <span className="flex flex-col items-end gap-0.5">
            <span className="type-label-s text-ink">
              {quotation.validityDays == null ? '—' : `In ${quotation.validityDays} days`}
            </span>
            <span className="type-caption text-ink-3">from issue</span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="type-body-s text-ink-2">Currency</span>
          <span className="type-label-s text-ink">{`${quotation.currency} · FX pinned at issue`}</span>
        </div>
        <div className="flex items-center gap-3 border-t border-line pt-3">
          {readiness.tone === 'ok' ? (
            <Chip tone="ok">{readiness.chip}</Chip>
          ) : (
            <Chip dot={false}>{readiness.chip}</Chip>
          )}
          <span className="type-body-s text-ink-2">{readiness.text}</span>
        </div>
        <Button variant="secondary" block disabled>
          Issue quotation
        </Button>
        <span className="type-body-s text-ink-3">
          Issuing comes with the next release of Flow 1.
        </span>
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
