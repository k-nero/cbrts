import type { FC } from 'react';

import { Chip, cx, Panel, QuoteLine } from '@/components/ui';
import type { CustomerQuotation, CustomerQuoteLine } from '@/interfaces';
import {
  noticeBandLabel,
  estimateVerdict,
  formatDate,
  largestLine,
  money,
  moneyHead,
  moneyOrDash,
  moneyRows,
  rangeText,
  shareText,
} from '@/lib/utils';

const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

const Badge: FC<{ code: string | null }> = ({ code }) => (
  <span className="type-mono-chip flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted text-ink-2">
    {code ?? '+'}
  </span>
);

/**
 * Where the money goes (DESIGN.md, Quotation page): one row per ledger group plus fees, fuel and cover,
 * largest first, each a single-hue bar on a muted track. One series, so no legend.
 */
export const MoneyPanel: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const { subtotal, total } = quotation.totals;
  if (subtotal == null || total == null || total <= 0) return null;
  const rows = moneyRows(quotation.groups, { subtotal, total });
  if (rows.length === 0) return null;
  return (
    <Panel title="Where the money goes">
      <div className="flex flex-col gap-3">
        <p className="type-body-m m-0 text-ink-2">{moneyHead(rows)}</p>
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3">
            <Badge code={r.code} />
            <span className="type-label-s min-w-[96px] flex-1 truncate text-ink" title={r.name}>
              {r.name}
            </span>
            <span
              aria-hidden
              className="h-1 w-[220px] min-w-10 shrink overflow-hidden rounded bg-muted"
            >
              <span
                className="block h-full rounded bg-ink-2"
                style={{ width: `${Math.max(r.share * 100, 1)}%` }}
              />
            </span>
            <span className="type-data w-28 shrink-0 text-right text-ink">{money(r.amount)}</span>
            <span className="type-mono-caption w-10 shrink-0 text-right text-ink-3">
              {shareText(r.share)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
};

const certainty = (l: CustomerQuoteLine) =>
  l.overridden ? 'overridden' : l.certainty === 'ESTIMATED' ? 'estimated' : 'fixed';

/**
 * The ledger as the customer reads it: groups A–H with subtotals, every line Fixed or Estimated (and
 * why), an overridden line with the catalog amount struck through and the reason, an added line marked
 * Manual. How the air stall was sized sits as a sunken note under the air freight group.
 */
export const CustomerLedger: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => (
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
          <Badge code={g.code} />
          <span className="type-h4 flex-1 text-ink">{g.name}</span>
          <span className="type-data text-ink-2">{moneyOrDash(g.subtotal)}</span>
        </div>
        {g.lines.map((l, i) => (
          <QuoteLine
            key={`${g.code}-${i}`}
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
            basis={l.basisText ?? ''}
            qty={qty(l.quantity)}
            rate={l.unitRate == null ? null : money(l.unitRate)}
            amount={l.amount == null ? null : money(l.amount)}
            catalogAmount={l.catalogAmount == null ? undefined : money(l.catalogAmount)}
            note={l.overridden ? (l.overrideReason ?? undefined) : (l.estimateNote ?? undefined)}
            extra={
              <>
                {l.overridden && l.estimateNote && (
                  <span className="type-body-s text-warn">{l.estimateNote}</span>
                )}
                {l.manual && l.manualReason && (
                  <span className="type-body-s text-ink-3">{l.manualReason}</span>
                )}
              </>
            }
          />
        ))}
        {g.code === 'C' && quotation.stallNote && (
          <div className="flex flex-col gap-1 border-b border-line bg-sunken px-5 pt-2.5 pb-3.5">
            <span className="type-label-s text-ink-2">How the stall was sized</span>
            <span className="type-body-s text-ink-3">{quotation.stallNote}</span>
          </div>
        )}
      </section>
    ))}
  </Panel>
);

/** The totals in the fixed order, each percentage naming its base; the volume break is its own row. */
export const CustomerTotals: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const t = quotation.totals;
  return (
    <Panel title="Totals">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <span className="flex flex-col gap-0.5">
            <span className="type-label-m text-ink">Direct cost subtotal</span>
            <span className="type-caption text-ink-3">Groups A–H</span>
          </span>
          <span className="type-data text-ink">{moneyOrDash(t.subtotal)}</span>
        </div>
        {t.rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4">
            <span className="flex flex-col gap-0.5">
              <span className="type-label-m text-ink">{r.label}</span>
              {r.baseText && <span className="type-mono-caption text-ink-3">{r.baseText}</span>}
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
      </div>
    </Panel>
  );
};

const DlRow: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="type-body-s text-ink-3">{label}</span>
    <span className="type-data text-ink">{value}</span>
  </div>
);

/** The quote against the range kept at submission; it doesn't repeat the total. */
export const AgainstEstimate: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const verdict = estimateVerdict(quotation.estimate);
  const total = quotation.totals.total ?? 0;
  const top = total > 0 ? largestLine(quotation.groups, total) : null;
  const estimated = quotation.groups
    .flatMap((g) => g.lines)
    .filter((l) => l.certainty === 'ESTIMATED')
    .map((l) => l.description);
  return (
    <Panel>
      <div className="flex flex-col gap-3">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="type-h4 text-ink">Against your estimate</span>
          {verdict && <Chip tone={verdict.tone}>{verdict.label}</Chip>}
        </span>
        {quotation.estimate ? (
          <DlRow
            label="Your estimate at submission"
            value={rangeText(quotation.estimate.low, quotation.estimate.high)}
          />
        ) : (
          <span className="type-body-s text-ink-3">
            No estimate was shown when you submitted this request.
          </span>
        )}
        {quotation.deposit && (
          <DlRow
            label="Deposit on acceptance"
            value={`${quotation.deposit.pct}% · ${money(quotation.deposit.amount)}`}
          />
        )}
        <span className="type-body-s text-ink-3">
          {[
            top
              ? `The largest line is ${top.description}, ${money(top.amount)}, or ${shareText(top.share)} of the total.`
              : null,
            estimated.length > 0
              ? `${estimated.join(', ')} ${estimated.length === 1 ? 'is the only line' : 'are the lines'} that can change on the final invoice.`
              : 'Every line is fixed: none can change on the final invoice.',
          ]
            .filter(Boolean)
            .join(' ')}
        </span>
      </div>
    </Panel>
  );
};

/** What happens after accepting, in three numbered steps. */
export const AfterYouAccept: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  const manager = quotation.preparedBy?.name ?? 'The logistics manager';
  const steps: [string, string][] = [
    [
      'Your deposit is acknowledged',
      quotation.deposit
        ? `${quotation.deposit.pct}% · ${money(quotation.deposit.amount)}`
        : 'From the quotation',
    ],
    [`${manager} approves the job and it gets its CBRT code`, 'Price and horses lock'],
    [
      'Your document checklist opens',
      `${quotation.request.horses.length} ${quotation.request.horses.length === 1 ? 'horse' : 'horses'}`,
    ],
  ];
  return (
    <Panel title="After you accept">
      <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
        {steps.map(([title, sub], i) => (
          <li key={title} className="flex items-start gap-3.5">
            <span className="type-mono-caption flex size-6.5 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-3">
              {i + 1}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="type-label-s text-ink">{title}</span>
              <span className="type-body-s text-ink-3">{sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
};

/** Who prepared the quotation, and when; asking about a line comes with messaging. */
export const WhoPrepared: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => {
  if (!quotation.preparedBy) return null;
  const superseded = quotation.versions.find((v) => v.supersededReason)?.supersededReason;
  return (
    <Panel title="Who prepared it">
      <div className="flex flex-col gap-1">
        <span className="type-label-s text-ink">{`${quotation.preparedBy.name}, ${quotation.preparedBy.role}`}</span>
        <span className="type-body-s text-ink-3">
          {`Built this quotation from rate catalog v${quotation.pinnedVersionNo}${
            quotation.issuedAt ? ` on ${formatDate(quotation.issuedAt)}` : ''
          }${quotation.versionNo > 1 && superseded ? `, and re-issued it: ${superseded}` : '.'}`}
        </span>
      </div>
    </Panel>
  );
};

/** The cancellation fee by notice period (today's band marked), the late-arrival terms, the versions. */
export const TermsAndVersions: FC<{ quotation: CustomerQuotation }> = ({ quotation }) => (
  <Panel title="Terms and versions">
    <div className="flex flex-col gap-2">
      <span className="type-label-s text-ink-2">Cancellation fee by notice period</span>
      {quotation.cancellation.bands.length === 0 && (
        <span className="type-body-s text-ink-3">The rate catalog has no cancellation bands.</span>
      )}
      {[...quotation.cancellation.bands].reverse().map((b) => (
        <div
          key={b.minDays}
          className={cx(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2',
            b.current && 'bg-info-soft',
          )}
        >
          <span className="type-body-s flex-1 text-ink-2">{noticeBandLabel(b)}</span>
          {b.current && (
            <Chip
              tone="info"
              dot={false}
            >{`Now · ${quotation.cancellation.daysToDeparture} days`}</Chip>
          )}
          <span className="type-data w-12 text-right text-ink">{`${b.pct}%`}</span>
        </div>
      ))}
      {quotation.latePenalty && (
        <span className="type-body-s text-ink-3">
          {`Late arrival: ${quotation.latePenalty.pctPerHour}% per hour late, up to ${quotation.latePenalty.capPct}%.`}
        </span>
      )}
      <span className="mt-2 border-t border-line pt-3 type-label-s text-ink-2">Versions</span>
      {quotation.versions.map((v) => {
        const current = v.versionNo === quotation.versionNo;
        return (
          <div key={v.versionNo} className="flex items-start gap-2.5">
            <span
              className={cx('type-data', current ? 'text-ink' : 'text-ink-3')}
            >{`v${v.versionNo}`}</span>
            <span className={cx('type-body-s flex-1', current ? 'text-ink-2' : 'text-ink-3')}>
              {v.status === 'SUPERSEDED'
                ? `Superseded. ${v.supersededReason ?? ''}`.trim()
                : v.status === 'EXPIRED'
                  ? `Expired ${v.validUntil ? formatDate(v.validUntil) : ''}`.trim()
                  : `Issued ${v.issuedAt ? formatDate(v.issuedAt) : ''}`.trim()}
            </span>
            {current && (
              <Chip tone="info" dot={false}>
                Current
              </Chip>
            )}
          </div>
        );
      })}
    </div>
  </Panel>
);
