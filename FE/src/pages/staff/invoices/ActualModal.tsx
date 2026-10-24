import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type ActualForm, actualSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { qty } from '@/components/invoice/invoiceFormat';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useSetInvoiceActual } from '@/hooks/invoice';
import type { Invoice, InvoiceLine } from '@/interfaces';
import { apiErrorMessage, money } from '@/lib/utils';

type Props = { invoice: Invoice; line: InvoiceLine | null; onClose: () => void };

/** What actually happened on an estimated line (US-F6-03): the quantity, and why it differs from the quotation. */
export const ActualModal: FC<Props> = ({ invoice, line, onClose }) => {
  const { message } = App.useApp();
  const set = useSetInvoiceActual(invoice.id);
  const quoted = Number(line?.quotedQuantity ?? 0);
  const methods = useFormCustom<ActualForm>({
    resolver: zodResolver(actualSchema(quoted)),
    values: line
      ? {
          quantity: Number(line.quantity ?? quoted),
          note: line.kind === 'ACTUALISED' ? (line.note ?? '') : '',
        }
      : undefined,
  });

  const close = () => {
    set.reset();
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) => {
    if (!line) return;
    set.mutate(
      { lineId: line.id, input: { quantity: v.quantity, note: v.note || undefined } },
      {
        onSuccess: () => {
          message.success('Line updated; the totals follow.');
          close();
        },
      },
    );
  });

  return (
    <BaseModal
      open={line !== null}
      onCancel={close}
      title={line ? `Actual: ${line.description}` : ''}
    >
      {line && (
        <FormWrapper
          methods={methods}
          isSubmitting={set.isPending}
          mode="edit"
          onCancel={close}
          onFinish={onSubmit}
          layout="vertical"
          force
        >
          {({ FormField }) => (
            <>
              <p className="type-body-s m-0 text-ink-2">
                Quoted {qty(quoted)} × {money(line.unitRate ?? 0, invoice.currency)} ={' '}
                {money(line.quotedAmount ?? 0, invoice.currency)}, estimated.
              </p>
              <FormField
                name="quantity"
                label="Actual quantity"
                component="number"
                componentProps={{ isRequired: true, min: 0, step: 0.25 }}
              />
              <FormField
                name="note"
                label="Why it differs (the customer reads it)"
                component="textarea"
                componentProps={{ rows: 2, maxLength: 300 }}
              />
              {set.isError && (
                <Callout tone="bad" title="Not saved">
                  {apiErrorMessage(set.error, 'Something went wrong. Try again.')}
                </Callout>
              )}
              <Flex justify="end" gap={8}>
                <CancelButton label="Cancel" />
                <SubmitButton type="primary" label="Save the actual quantity" />
              </Flex>
            </>
          )}
        </FormWrapper>
      )}
    </BaseModal>
  );
};
