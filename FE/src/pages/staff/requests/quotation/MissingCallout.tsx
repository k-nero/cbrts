import { Flex } from 'antd';
import type { FC } from 'react';

import { Callout } from '@/components/ui';
import type { QuotationDraft } from '@/interfaces';

/** The rates the catalog can't supply, and who keeps the catalog. */
export const MissingCallout: FC<{ quotation: QuotationDraft }> = ({ quotation }) => {
  if (quotation.missing.length === 0) return null;
  const n = quotation.missing.length;
  return (
    <Callout
      tone="bad"
      title={`${n} ${n === 1 ? 'rate is' : 'rates are'} missing on ${quotation.request.fromCity} → ${quotation.request.toCity}`}
    >
      <Flex component="span" vertical gap={4}>
        {quotation.missing.map((m) => (
          <span key={m.description}>{m.why}</span>
        ))}
        {quotation.catalogOwner && (
          <span>{`${quotation.catalogOwner}, transport specialist, keeps the rate catalog.`}</span>
        )}
      </Flex>
    </Callout>
  );
};
