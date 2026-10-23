import { type FC, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type RejectForm, rejectSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Button, Callout } from '@/components/ui';
import { useRejectRequest } from '@/hooks/staffRequest';
import type { RequestReview } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

/**
 * Reject with a reason (BR-F1-04, Figma "Reject with a reason"): a Ghost button that opens the reason
 * in place. The customer reads the reason exactly as written.
 */
export const RejectBox: FC<{ review: RequestReview }> = ({ review }) => {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const reject = useRejectRequest();
  const { request } = review;
  const methods = useFormCustom<RejectForm>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: '' },
  });

  const close = () => {
    reject.reset();
    methods.reset({ reason: '' });
    setOpen(false);
  };

  const onSubmit = methods.handleSubmit((v) =>
    reject.mutate(
      { id: request.id, value: v.reason },
      { onSuccess: () => void message.success(`Rejected ${request.code}.`) },
    ),
  );

  if (!open) {
    return (
      <Button variant="ghost" block onClick={() => setOpen(true)}>
        Reject with a reason
      </Button>
    );
  }
  return (
    <div className="p-4 rounded-md border border-line-strong bg-raised">
      <FormWrapper
        methods={methods}
        isSubmitting={reject.isPending}
        mode="edit"
        onCancel={close}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <Flex vertical gap={8}>
            <FormField
              name="reason"
              label={`Reason for ${request.club}`}
              component="textarea"
              componentProps={{ isRequired: true, rows: 3, maxLength: 500 }}
            />
            <p className="type-body-s m-0 text-ink-3">
              The customer reads it exactly as written and can copy the request into a new draft.
            </p>
            {reject.isError && (
              <Callout tone="bad" title="The request wasn’t rejected">
                {apiErrorMessage(reject.error, 'Something went wrong. Try again.')}
              </Callout>
            )}
            <Flex justify="end" gap={8}>
              <CancelButton label="Keep it" />
              <SubmitButton danger label="Reject request" />
            </Flex>
          </Flex>
        )}
      </FormWrapper>
    </div>
  );
};
