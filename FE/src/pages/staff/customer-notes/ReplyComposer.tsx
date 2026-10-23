import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { type ReplyForm, replySchema } from './schema';

import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { Button, Callout } from '@/components/ui';
import { useReplyCustomerNote } from '@/hooks/customerNote';
import type { CustomerNote } from '@/interfaces';
import { apiErrorMessage } from '@/lib';

/**
 * The reply composer (DESIGN.md, Notes on a request). It can carry one action, moving the due date
 * of the checklist item the note is about, with the reason the customer sees. A reply that doesn't
 * send says so in place and keeps what was written (DESIGN.md, A decision that doesn't send).
 */
export const ReplyComposer: FC<{ note: CustomerNote }> = ({ note }) => {
  const { message } = App.useApp();
  const reply = useReplyCustomerNote();
  const methods = useFormCustom<ReplyForm>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      body: '',
      moveDueDate: false,
      moveDueDateTo: note.checklistItemDueDate ?? '',
      reasonForMove: '',
    },
  });
  const moveDueDate = methods.watch('moveDueDate');

  const send = methods.handleSubmit((v) =>
    reply.mutate(
      {
        id: note.id,
        data: {
          body: v.body,
          moveDueDateTo: v.moveDueDate ? v.moveDueDateTo : undefined,
          reasonForMove: v.moveDueDate ? v.reasonForMove : undefined,
        },
      },
      {
        onSuccess: () => {
          methods.reset();
          void message.success('Reply sent to the customer and recorded on the job.');
        },
      },
    ),
  );

  return (
    // AntD resets padding on Flex, so the box is a div around it.
    <div className="rounded-lg border border-line-strong bg-card p-5">
      <Flex vertical gap={16}>
        <span className="type-label-m text-ink">Reply</span>
        <FormWrapper
          methods={methods}
          isSubmitting={reply.isPending}
          mode="add"
          onFinish={send}
          layout="vertical"
          force
        >
          {({ FormField }) => (
            <>
              <FormField
                name="body"
                label={`Reply to ${note.clubName}`}
                component="textarea"
                componentProps={{
                  isRequired: true,
                  rows: 4,
                  maxLength: 2000,
                  instruction: 'Sent as written; it also appears on the request page.',
                }}
              />
              {note.checklistItemId && (
                <FormField
                  name="moveDueDate"
                  component="checkbox"
                  componentProps={{
                    showLabel: false,
                    children: `Also move the due date of ${note.checklistItemName ?? 'the checklist item'}`,
                  }}
                />
              )}
              {moveDueDate && (
                <>
                  <FormField
                    name="moveDueDateTo"
                    label="New due date"
                    component="datepicker"
                    componentProps={{ isRequired: true, format: 'D MMM YYYY' }}
                  />
                  <FormField
                    name="reasonForMove"
                    label="Reason shown to the customer"
                    component="textarea"
                    componentProps={{ isRequired: true, rows: 2, maxLength: 300 }}
                  />
                </>
              )}
              {reply.isError ? (
                <Callout
                  tone="bad"
                  title="Not sent"
                  action={
                    <Flex gap={8}>
                      <Button variant="primary" size="sm" type="submit">
                        Try again
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => reply.reset()}>
                        Keep for later
                      </Button>
                    </Flex>
                  }
                >
                  {`${apiErrorMessage(reply.error, 'The reply couldn’t be sent.')} Nothing was recorded and the customer wasn’t told; your reply is kept above.`}
                </Callout>
              ) : (
                <Button
                  variant="primary"
                  block
                  type="submit"
                  trailingIcon="arrow-right"
                  disabled={reply.isPending}
                >
                  {reply.isPending ? 'Sending…' : 'Send reply'}
                </Button>
              )}
            </>
          )}
        </FormWrapper>
      </Flex>
    </div>
  );
};
