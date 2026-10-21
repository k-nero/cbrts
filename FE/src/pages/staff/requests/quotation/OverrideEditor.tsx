import type { FC } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flex } from 'antd';

import { EditorFrame } from './EditorFrame';
import type { RunWrite } from './editorOptions';
import { type OverrideForm, overrideSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { useOverrideLine } from '@/hooks/staffRequest';
import type { QuoteLineRow } from '@/interfaces';
import { moneyOrDash, overrideDefaults } from '@/lib/utils';

/**
 * Override a priced line inline under it (DESIGN.md, Quotation builder): the catalog value struck through,
 * the new amount and a required reason. The total is never typed; it is worked out from the lines.
 */
export const OverrideEditor: FC<{
  requestId: string;
  line: QuoteLineRow;
  currency: string;
  run: RunWrite;
  onClose: () => void;
}> = ({ requestId, line, currency, run, onClose }) => {
  const save = useOverrideLine();
  const defaults = overrideDefaults(line);
  const methods = useFormCustom<OverrideForm>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { amount: Number(defaults.amount), reason: defaults.reason },
  });

  const onSubmit = methods.handleSubmit(async (v) => {
    const ok = await run(
      () =>
        save.mutateAsync({
          requestId,
          value: { lineId: line.id, body: { amount: v.amount, reason: v.reason.trim() } },
        }),
      'Override saved',
    );
    if (ok) onClose();
  });

  return (
    <EditorFrame title={`Override ${line.description}`}>
      <span className="type-body-s text-ink-3">
        Catalog amount{' '}
        <span className="type-data text-ink-3 line-through">
          {moneyOrDash(line.catalogAmount, currency)}
        </span>
      </span>
      <FormWrapper
        methods={methods}
        isSubmitting={save.isPending}
        mode="edit"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <>
            <FormField
              name="amount"
              label={`New amount, ${currency}`}
              component="number"
              componentProps={{ isRequired: true, min: 0, step: 0.01 }}
            />
            <FormField
              name="reason"
              label="Reason (the customer sees it)"
              component="textarea"
              componentProps={{ isRequired: true, rows: 2, maxLength: 300 }}
            />
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Save override" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </EditorFrame>
  );
};
