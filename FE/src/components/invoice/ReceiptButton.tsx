import type { FC } from 'react';
import { message } from 'antd';

import { Button } from '@/components/ui';
import { useDownloadReceipt } from '@/hooks/invoice';
import type { Invoice, Payment } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/** Saves a confirmed payment's PDF receipt, for the customer or the logistics manager. */
export const ReceiptButton: FC<{
  side: 'customer' | 'staff';
  invoice: Invoice;
  payment: Payment;
}> = ({ side, invoice, payment }) => {
  const download = useDownloadReceipt(side);
  if (payment.status !== 'CONFIRMED') return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      leadingIcon="file"
      disabled={download.isPending}
      onClick={() =>
        download.mutate(
          {
            paymentId: payment.id,
            name: `receipt-${invoice.code}-${payment.receivedAt.slice(0, 10)}.pdf`,
          },
          {
            onError: (e) =>
              void message.error(apiErrorMessage(e, "The receipt couldn't be downloaded")),
          },
        )
      }
    >
      Receipt
    </Button>
  );
};
