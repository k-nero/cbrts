import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type DiscrepancyForm, discrepancySchema } from './discrepancySchema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useReportDiscrepancy } from '@/hooks/trip';
import { apiErrorMessage } from '@/lib/utils';

type Props = { jobCode: string; open: boolean; onClose: () => void };

/** Report a problem with the delivery (US-F6-02): the logistics manager is alerted and answers it. */
export const DiscrepancyModal: FC<Props> = ({ jobCode, open, onClose }) => {
  const { message } = App.useApp();
  const report = useReportDiscrepancy(jobCode);
  const methods = useFormCustom<DiscrepancyForm>({
    resolver: zodResolver(discrepancySchema),
    defaultValues: { description: '' },
  });

  const close = () => {
    report.reset();
    methods.reset({ description: '' });
    onClose();
  };

  const onSubmit = methods.handleSubmit((v) =>
    report.mutate(v.description, {
      onSuccess: () => {
        message.success('Sent. The logistics manager has your report and will contact you.');
        close();
      },
    }),
  );

  return (
    <BaseModal open={open} onCancel={close} title={`Report a problem with ${jobCode}`}>
      <FormWrapper
        methods={methods}
        isSubmitting={report.isPending}
        mode="edit"
        onCancel={close}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <>
            <FormField
              name="description"
              label="What went wrong (the logistics manager reads it as written)"
              component="textarea"
              componentProps={{
                rows: 4,
                maxLength: 1000,
                isRequired: true,
                placeholder: 'Which horse, what you found, and when',
              }}
            />
            <p className="type-body-s m-0 text-ink-3">
              The handover stays open until it is resolved. For anything urgent, call the duty line.
            </p>
            {report.isError && (
              <Callout tone="bad" title="Not sent">
                {apiErrorMessage(report.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Send the report" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
