import { Flex } from 'antd';
import type { FC } from 'react';

import { Button, Callout } from '@/components/ui';
import type { QuotationDraft } from '@/interfaces';
import { useCustomRouter } from '@/router/route.hook';

/** The rates the catalog can't supply, who keeps the catalog, and a link to the corridor in it (US-Q-04). */
export const MissingCallout: FC<{ quotation: QuotationDraft }> = ({ quotation }) => {
  const router = useCustomRouter();
  if (quotation.missing.length === 0) return null;
  const n = quotation.missing.length;
  return (
    <Callout
      tone="bad"
      title={`${n} ${n === 1 ? 'rate is' : 'rates are'} missing on ${quotation.request.fromCity} → ${quotation.request.toCity}`}
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            router.push(
              router.paths.get('rates', {
                queryParams: { corridor: quotation.request.corridorId },
              }),
            )
          }
        >
          Open the corridor in the rate catalog
        </Button>
      }
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
