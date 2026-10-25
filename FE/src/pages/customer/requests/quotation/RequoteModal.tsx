import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { App, Flex } from 'antd';
import type { AxiosError } from 'axios';

import { type RequoteForm, requoteSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { queryKeys } from '@/constant/query';
import { useRequestQuote } from '@/hooks/request';
import type { CustomerQuotation } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/**
 * Ask for a re-quote of the expired quotation (core flows A4): the next version is drafted from the
 * rate catalog in force now for the manager, who reviews and issues it. The note is optional.
 */
export const RequoteModal: FC<{
  quotation: CustomerQuotation;
  open: boolean;
  onClose: () => void;
}> = ({ quotation, open, onClose }) => {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const requote = useRequestQuote(quotation.request.id);
  const manager = quotation.preparedBy?.name ?? 'the logistics manager';
  const methods = useFormCustom<RequoteForm>({
    resolver: zodResolver(requoteSchema),
    defaultValues: { note: '' },
  });

  const close = () => {
    requote.reset();
    methods.reset();
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) =>
    requote.mutate(
      { versionNo: quotation.versionNo, note: v.note || null },
      {
        onSuccess: () => {
          message.success('Re-quote asked');
          close();
        },
        // Refused because things moved on (asked in another tab, revised or issued meanwhile): reload, so
        // the panel shows where the quotation stands instead of offering the same ask again.
        onError: (error) => {
          if ((error as AxiosError).response?.status !== 409) return;
          void qc.invalidateQueries({ queryKey: queryKeys.requests.one(quotation.request.id) });
        },
      },
    ),
  );

  return (
    <BaseModal open={open} onCancel={close} title="Ask for a re-quote">
      <Flex vertical gap={16}>
        <p className="type-body-m m-0 text-ink-2">
          {`Ask ${manager} for a new version priced from the rate catalog in force now.`}
        </p>
        <FormWrapper
          methods={methods}
          isSubmitting={requote.isPending}
          mode="edit"
          onCancel={close}
          onFinish={onSubmit}
          layout="vertical"
          force
        >
          {({ FormField }) => (
            <>
              <FormField
                name="note"
                label="What should change?"
                component="textarea"
                componentProps={{ rows: 3, maxLength: 500 }}
              />
              {requote.isError && (
                <Callout tone="bad" title="A re-quote can’t be asked">
                  {apiErrorMessage(requote.error, 'Something went wrong. Try again.')}
                </Callout>
              )}
              <Flex justify="end" gap={8}>
                <CancelButton label="Not now" />
                <SubmitButton type="primary" label="Ask for a re-quote" />
              </Flex>
            </>
          )}
        </FormWrapper>
      </Flex>
    </BaseModal>
  );
};
