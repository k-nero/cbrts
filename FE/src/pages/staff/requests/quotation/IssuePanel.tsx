import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import { PanelRow } from './PanelRow';
import { type IssueForm, issueSchema } from './schema';
import { TwoLines } from './TwoLines';

import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { Button, Chip, Panel } from '@/components/ui';
import type { QuotationDraft } from '@/interfaces';
import { issueBlocker, moneyOrDash, readinessView, repriceOffer, validityText } from '@/lib/utils';

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
    resolver: zodResolver(issueSchema),
    defaultValues: { versionNo: quotation.versionNo, changeNote: '' },
  });
  const onSubmit = methods.handleSubmit((v) => onIssue(v.changeNote.trim() || null));
  return (
    <Panel>
      <div className="flex flex-col gap-3">
        <span className="type-h4 text-ink">{`Issue version ${quotation.versionNo}`}</span>
        <PanelRow label="Total">
          <span className="type-data text-ink">
            {quotation.repriceNeeded
              ? '—'
              : moneyOrDash(quotation.totals.total, quotation.currency)}
          </span>
        </PanelRow>
        <PanelRow label="Deposit">
          <TwoLines line1="On acceptance" line2="from the pinned catalog, fixed at issue" />
        </PanelRow>
        <PanelRow label="Validity">
          <TwoLines line1={validity.line1} line2={validity.line2} />
        </PanelRow>
        <PanelRow label="Currency">
          <span className="type-label-s text-ink">{`${quotation.currency} · FX pinned at issue`}</span>
        </PanelRow>
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
