import { type FC, useRef, useState } from 'react';
import { useFormState, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { FileCard } from '../document/FileCard';
import { type AskForm, askSchema, EMPTY_ASK } from './schema';
import { ASK_TOPICS, replyDueDay, whoAnswers } from './topics';

import { fileApi } from '@/apis/file';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { Button, Callout, Deadline, OptionCard, Panel } from '@/components/ui';
import { useRequestChecklist } from '@/hooks/clearance';
import { useCreateRequestNote } from '@/hooks/customerNote';
import { apiErrorMessage, DOCUMENT_ACCEPT, formatDate } from '@/lib/utils';

/**
 * Ask about this request (US-00-08; Figma, Tracking · Ask a question). The customer picks what the note is about,
 * and the topic decides who answers; the routing and the reply time are stated before it is sent. A note is never a
 * free chat: staff reply under it, and it stays on the request's history.
 */
export const AskPanel: FC<{ requestId: string }> = ({ requestId }) => {
  const { message } = App.useApp();
  const picker = useRef<HTMLInputElement>(null);
  // The select keeps its last option when reset to null, so each sent note remounts it empty.
  const [sent, setSent] = useState(0);
  const create = useCreateRequestNote(requestId);
  const checklist = useRequestChecklist(requestId);
  const methods = useFormCustom<AskForm>({
    resolver: zodResolver(askSchema),
    defaultValues: EMPTY_ASK,
  });
  const { errors, isSubmitting } = useFormState({ control: methods.control });
  const topic = useWatch({ control: methods.control, name: 'topic' });
  const file = useWatch({ control: methods.control, name: 'file' });
  const who = whoAnswers(topic);
  const due = replyDueDay();
  const items = (checklist.data ?? []).map((i) => ({
    value: i.id,
    label: `${i.horseName ?? 'Shipment'} · ${i.documentTypeName || i.documentTypeCode}${
      i.dueDate ? ` · due ${formatDate(i.dueDate)}` : ''
    }`,
  }));

  const choose = (f: File | null) => methods.setValue('file', f, { shouldDirty: true });

  const send = methods.handleSubmit(async (v) => {
    try {
      const attachedFileId = v.file ? (await fileApi.upload(v.file)).id : undefined;
      await create.mutateAsync({
        topic: v.topic,
        checklistItemId: v.topic === 'DOCUMENTS' ? v.item?.value : undefined,
        body: v.body,
        attachedFileId,
      });
      methods.reset({ ...EMPTY_ASK, topic: v.topic });
      setSent((n) => n + 1);
      void message.success(`Sent to ${who}. You’ll have a reply by ${due.format('ddd D MMM')}.`);
    } catch (err) {
      methods.setError('root', {
        message: `${apiErrorMessage(err, 'Your note couldn’t be sent.')} Nothing was sent; your note is kept above.`,
      });
    }
  });

  return (
    <Panel>
      <FormWrapper
        methods={methods}
        isSubmitting={isSubmitting}
        mode="add"
        onFinish={send}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <Flex vertical gap={18}>
            <Flex vertical gap={4}>
              <h2 className="type-h3 m-0 text-ink">Ask about this request</h2>
              <p className="type-body-s m-0 text-ink-2">
                Your note goes to the person who handles that part of your move and stays on this
                request’s history.
              </p>
            </Flex>

            <Flex vertical gap={10} role="radiogroup" aria-label="What is it about?">
              <span className="type-label-s text-ink-2">What is it about?</span>
              <div className="grid grid-cols-3 gap-3">
                {ASK_TOPICS.map((t) => (
                  <OptionCard
                    key={t.topic}
                    className="h-full"
                    name="topic"
                    value={t.topic}
                    selected={topic === t.topic}
                    onChange={() =>
                      methods.setValue('topic', t.topic, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    title={t.title}
                    description={t.description}
                    meta={`Answered by ${t.who}`}
                  />
                ))}
              </div>
            </Flex>

            {topic === 'DOCUMENTS' && items.length > 0 && (
              <FormField
                key={sent}
                name="item"
                label="Which item"
                component="select"
                componentProps={{
                  options: items,
                  isClearable: true,
                  placeholder: 'Not about one document',
                  instruction: 'Optional: the document your note is about.',
                }}
              />
            )}

            <FormField
              name="body"
              label="Your note"
              component="textarea"
              componentProps={{
                isRequired: true,
                rows: 5,
                maxLength: 2000,
                instruction: 'Be specific, and attach what you have.',
              }}
            />

            <input
              ref={picker}
              type="file"
              hidden
              accept={DOCUMENT_ACCEPT}
              aria-label="Choose a file to attach"
              onChange={(e) => {
                choose(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <FileCard
              file={file}
              refused={false}
              error={errors.file?.message}
              onChoose={() => picker.current?.click()}
              onRemove={() => choose(null)}
            />

            <div className="rounded-lg bg-sunken px-4 py-3.5">
              <Flex justify="space-between" align="center" gap={16}>
                <span className="type-body-s text-ink-2">
                  {who === 'the logistics manager'
                    ? 'Goes to the logistics manager.'
                    : `Goes to ${who}. The logistics manager can read it too.`}
                </span>
                <Deadline left="Within 1 business day" date={`by ${due.format('ddd D MMM')}`} />
              </Flex>
            </div>

            {errors.root?.message && (
              <Callout tone="bad" title="Not sent">
                {errors.root.message}
              </Callout>
            )}

            <div>
              <Button
                variant="primary"
                type="submit"
                trailingIcon="arrow-right"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending…' : `Send to ${who}`}
              </Button>
            </div>
          </Flex>
        )}
      </FormWrapper>
    </Panel>
  );
};
