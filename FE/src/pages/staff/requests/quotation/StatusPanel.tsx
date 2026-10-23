import { Flex } from 'antd';
import type { FC } from 'react';

import { PanelRow } from './PanelRow';
import { TwoLines } from './TwoLines';
import { VersionChip } from './VersionChip';

import { Button, Panel } from '@/components/ui';
import type { QuotationDraft } from '@/interfaces';
import { depositText, formatDate, moneyOrDash, validityText } from '@/lib/utils';

/**
 * An issued version is a document: no edit controls, only when it was issued and until when it holds,
 * the deposit, and on the latest version the way on: revise it into the next version, or open that draft.
 */
export const StatusPanel: FC<{
  quotation: QuotationDraft;
  latest: boolean;
  canRevise: boolean;
  draftVersionNo: number | null;
  revising: boolean;
  onRevise: () => void;
  onOpenDraft: () => void;
}> = ({ quotation, latest, canRevise, draftVersionNo, revising, onRevise, onOpenDraft }) => {
  const validity = validityText(quotation.validUntil, quotation.validityDays);
  const expired = quotation.status === 'EXPIRED';
  return (
    <Panel>
      <Flex vertical gap={12}>
        <Flex component="span" gap={12} align="center" justify="space-between">
          <span className="type-h4 text-ink">{`Version ${quotation.versionNo}`}</span>
          <VersionChip status={quotation.status} />
        </Flex>
        <PanelRow label="Total">
          <span className="type-data text-ink">
            {moneyOrDash(quotation.totals.total, quotation.currency)}
          </span>
        </PanelRow>
        <PanelRow label="Issued">
          <span className="type-label-s text-ink">
            {quotation.issuedAt ? formatDate(quotation.issuedAt) : '—'}
          </span>
        </PanelRow>
        <PanelRow label={expired ? 'Expired' : 'Valid'}>
          <TwoLines line1={validity.line1} line2={validity.line2} />
        </PanelRow>
        <PanelRow label="Deposit">
          <span className="type-data text-ink">
            {depositText(quotation.deposit, quotation.currency)}
          </span>
        </PanelRow>
        <PanelRow label="Currency">
          <span className="type-label-s text-ink">{quotation.currency}</span>
        </PanelRow>
        {latest && (
          <div className="pt-3 border-t border-line">
            <Flex vertical gap={8}>
              {draftVersionNo != null ? (
                <Button variant="secondary" block onClick={onOpenDraft}>
                  {`Open draft v${draftVersionNo}`}
                </Button>
              ) : canRevise ? (
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
              ) : null}
            </Flex>
          </div>
        )}
      </Flex>
    </Panel>
  );
};
