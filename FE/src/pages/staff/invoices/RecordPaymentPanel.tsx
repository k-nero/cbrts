import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type PaymentForm, paymentSchema } from './schema';

import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { PAYMENT_METHOD } from '@/components/invoice/invoiceFormat';
import { Callout, Panel } from '@/components/ui';
import { useRecordPayment } from '@/hooks/invoice';
import type { Invoice } from '@/interfaces';
import { apiErrorMessage, ict, money } from '@/lib/utils';

/**
 * Record a payment (DESIGN.md, "Invoices · Record payment"): the amount (prefilled with what is owed), how it was
 * paid, the bank reference and the day it arrived. A recorded payment is never edited.
 */
export const RecordPaymentPanel: FC<{ invoice: Invoice }> = ({ invoice }) => {
  const { message } = App.useApp();
  const record = useRecordPayment(invoice.id);
  const today = ict(new Date().toISOString()).format('YYYY-MM-DD');
  const defaults: PaymentForm = {
    amount: Number(invoice.amountDue),
    method: { label: PAYMENT_METHOD.BANK_TRANSFER, value: 'BANK_TRANSFER' },
    reference: '',
    receivedOn: today,
  };
  const methods = useFormCustom<PaymentForm>({
    resolver: zodResolver(paymentSchema(Number(invoice.amountDue))),
    values: defaults,
  });

  const onSubmit = methods.handleSubmit((v) =>
    record.mutate(
      { ...v, method: v.method.value, reference: v.reference || undefined },
      {
        onSuccess: (r) =>
          message.success(
            r.status === 'PAID'
              ? `${invoice.code} is paid in full.`
              : `Recorded. ${money(r.amountDue, r.currency)} is still due.`,
          ),
      },
    ),
  );

  return (
    <Panel title="Record a payment">
      <FormWrapper
        methods={methods}
        isSubmitting={record.isPending}
        mode="edit"
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <>
            <FormField
              name="amount"
              label={`Amount (${invoice.currency})`}
              component="number"
              componentProps={{ isRequired: true, min: 0.01, step: 0.01 }}
            />
            <FormField
              name="method"
              label="Method"
              component="select"
              componentProps={{
                isRequired: true,
                options: Object.entries(PAYMENT_METHOD).map(([value, label]) => ({ value, label })),
              }}
            />
            <FormField
              name="reference"
              label="Bank reference"
              component="text"
              componentProps={{ maxLength: 100, placeholder: 'VCB 20261024 8841' }}
            />
            <FormField
              name="receivedOn"
              label="Received on"
              component="datepicker"
              componentProps={{ isRequired: true, format: 'D MMM YYYY' }}
            />
            <Callout tone="info" title="Never edited">
              A recorded payment stays as it is. The invoice becomes Paid once the full amount is
              in.
            </Callout>
            {record.isError && (
              <Callout tone="bad" title="Not recorded">
                {apiErrorMessage(record.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end">
              <SubmitButton type="primary" label="Record the payment" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </Panel>
  );
};
