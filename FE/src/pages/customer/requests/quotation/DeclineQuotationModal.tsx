import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type DeclineForm, declineSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useDeclineQuotation } from '@/hooks/request';
import type { CustomerQuotation } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/** Decline the quotation (US-F1-06): it closes the request; the reason is optional. */
export const DeclineQuotationModal: FC<{
  quotation: CustomerQuotation;
  open: boolean;
  onClose: () => void;
}> = ({ quotation, open, onClose }) => {
  const { message } = App.useApp();
  const decline = useDeclineQuotation(quotation.request.id);
  const manager = quotation.preparedBy?.name ?? 'the logistics manager';
  const methods = useFormCustom<DeclineForm>({
    resolver: zodResolver(declineSchema),
    defaultValues: { reason: '' },
  });

  const close = () => {
    decline.reset();
    methods.reset();
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) =>
    decline.mutate(v.reason || null, {
      onSuccess: () => {
        message.success(`You declined version ${quotation.versionNo}.`);
        close();
      },
    }),
  );

  return (
    <BaseModal open={open} onCancel={close} title={`Decline version ${quotation.versionNo}?`}>
      <Flex vertical gap={16}>
        <p className="type-body-m m-0 text-ink-2">
          {`Declining closes ${quotation.request.code}. To move these horses later, send a new request.`}
        </p>
        <FormWrapper
          methods={methods}
          isSubmitting={decline.isPending}
          mode="edit"
          onCancel={close}
          onFinish={onSubmit}
          layout="vertical"
          force
        >
          {({ FormField }) => (
            <>
              <FormField
                name="reason"
                label={`Why? (optional, ${manager} sees it)`}
                component="textarea"
                componentProps={{ rows: 3, maxLength: 500 }}
              />
              {decline.isError && (
                <Callout tone="bad" title="This quotation can’t be declined">
                  {apiErrorMessage(decline.error, 'Something went wrong. Try again.')}
                </Callout>
              )}
              <Flex justify="end" gap={8}>
                <CancelButton label="Keep it" />
                <SubmitButton danger label="Decline quotation" />
              </Flex>
            </>
          )}
        </FormWrapper>
      </Flex>
    </BaseModal>
  );
};
