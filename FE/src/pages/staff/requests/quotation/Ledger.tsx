import { type FC, useState } from 'react';
import { App, Flex } from 'antd';

import type { RunWrite } from './editorOptions';
import { ManualLineEditor } from './ManualLineEditor';
import { OverrideEditor } from './OverrideEditor';

import { Button, Chip, Panel, QuoteLine } from '@/components/ui';
import { useRemoveLine, useRemoveOverride } from '@/hooks/staffRequest';
import type { QuotationDraft, QuoteLineRow } from '@/interfaces';
import { changedSince, money, moneyOrDash } from '@/lib/utils';

const certainty = (line: QuoteLineRow) =>
  line.overrideAmount != null || line.certainty === 'OVERRIDDEN'
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
  const currency = quotation.currency;
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
    const changed = changedSince(l, quotation.previous, currency);
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
          <div className="pt-1">
            <Flex component="span" wrap gap={8}>
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
                      aria-label={`Remove the override on ${l.description}`}
                      disabled={pending}
                      onClick={() => onRemoveOverride(l)}
                    >
                      Remove override
                    </Button>
                  )}
                </>
              )}
            </Flex>
          </div>
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
          <div className="px-5 pt-4 pb-2">
            <Flex gap={12} align="center">
              <Flex
                component="span"
                align="center"
                justify="center"
                className="type-mono-chip size-6 rounded-sm bg-muted text-ink-2"
              >
                {g.code}
              </Flex>
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
              <span className="type-data text-ink-2">{moneyOrDash(g.subtotal, currency)}</span>
            </Flex>
          </div>
          {g.lines.map((l) => (
            <div key={l.id}>
              <QuoteLine
                certainty={certainty(l)}
                description={
                  l.manual ? (
                    <Flex component="span" gap={8} align="center">
                      {l.description}
                      <Chip dot={false}>Manual</Chip>
                    </Flex>
                  ) : (
                    l.description
                  )
                }
                basis={l.basisText}
                qty={qty(l.quantity)}
                rate={l.unitRate == null ? null : money(l.unitRate, currency)}
                amount={l.amount == null ? null : money(l.amount, currency)}
                catalogAmount={
                  l.catalogAmount == null ? undefined : money(l.catalogAmount, currency)
                }
                note={note(l)}
                extra={extra(l)}
              />
              {editable && open?.kind === 'override' && open.lineId === l.id && (
                <OverrideEditor
                  requestId={requestId}
                  line={l}
                  currency={currency}
                  run={run}
                  onClose={close}
                />
              )}
              {editable && open?.kind === 'edit' && open.lineId === l.id && (
                <ManualLineEditor
                  requestId={requestId}
                  group={g.code}
                  editing={l}
                  currency={currency}
                  run={run}
                  onClose={close}
                />
              )}
            </div>
          ))}
          {editable && open?.kind === 'add' && open.group === g.code && (
            <ManualLineEditor
              requestId={requestId}
              group={g.code}
              editing={null}
              currency={currency}
              run={run}
              onClose={close}
            />
          )}
        </section>
      ))}
    </Panel>
  );
};
