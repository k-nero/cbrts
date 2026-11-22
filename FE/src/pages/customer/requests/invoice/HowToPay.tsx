import type { FC } from 'react';
import { Divider, Flex } from 'antd';

import { Button, Callout, Panel } from '@/components/ui';
import { useCardCheckout } from '@/hooks/invoice';
import type { Invoice } from '@/interfaces';
import { apiErrorMessage, money } from '@/lib/utils';

/**
 * How to pay (DESIGN.md, Invoice): by card online on Stripe's page when card payment is set up, or by bank transfer
 * with the invoice code as the reference.
 */
export const HowToPay: FC<{ invoice: Invoice }> = ({ invoice }) => {
  const checkout = useCardCheckout(invoice.id);
  return (
    <Panel title="How to pay">
      <Flex vertical gap={8}>
        {invoice.payableByCard && (
          <>
            <p className="type-body-m m-0 text-ink-2">
              By card, on Stripe&apos;s secure page. The payment shows here as soon as Stripe
              confirms it, and you can download its receipt.
            </p>
            <Button
              variant="primary"
              disabled={checkout.isPending}
              onClick={() =>
                checkout.mutate(undefined, {
                  onSuccess: (c) => window.location.assign(c.url),
                })
              }
            >
              Pay {money(invoice.amountDue, invoice.currency)} by card
            </Button>
            {checkout.isError && (
              <Callout tone="bad" title="Card payment couldn't start">
                {apiErrorMessage(checkout.error, 'Try again, or pay by bank transfer.')}
              </Callout>
            )}
            <Divider className="my-2" />
          </>
        )}
        <p className="type-body-m m-0 text-ink-2">
          By bank transfer, with <span className="type-data text-ink">{invoice.code}</span> as the
          reference. A payment is shown here once EquiFreight records it.
        </p>
        <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-4 gap-y-1">
          <dt className="type-caption text-ink-3">Account name</dt>
          <dd className="type-body-s m-0 text-ink">EquiFreight Co., Ltd.</dd>
          <dt className="type-caption text-ink-3">Bank</dt>
          <dd className="type-body-s m-0 text-ink">Placeholder: bank details to be confirmed</dd>
        </dl>
      </Flex>
    </Panel>
  );
};
