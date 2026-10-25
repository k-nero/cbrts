import type { FC } from 'react';
import { useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flex } from 'antd';

import { EditorFrame } from './EditorFrame';
import { CERTAINTIES, GROUPS, type RunWrite } from './editorOptions';
import { type ManualLineForm, manualLineSchema } from './schema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { useAddLine, useEditLine } from '@/hooks/staffRequest';
import type { QuoteLineRow } from '@/interfaces';

/** Add a line the catalog doesn't know, or change one the manager added, inline in its group. */
export const ManualLineEditor: FC<{
  requestId: string;
  group: string;
  /** The version on screen; an added line names it (an edited line's id already does). */
  version: number;
  editing: QuoteLineRow | null;
  currency: string;
  run: RunWrite;
  onClose: () => void;
}> = ({ requestId, group, version, editing, currency, run, onClose }) => {
  const add = useAddLine();
  const edit = useEditLine();
  // Set once when the editor opens: a background refetch hands the ledger a new line object, and resetting
  // on it would throw away what the manager is typing.
  const methods = useFormCustom<ManualLineForm>({
    resolver: zodResolver(manualLineSchema),
    defaultValues: {
      group: GROUPS.find((g) => g.value === group) ?? GROUPS[7],
      description: editing?.description ?? '',
      quantity: editing?.quantity ?? 1,
      unitRate: editing?.unitRate ?? undefined,
      certainty: CERTAINTIES.find((c) => c.value === editing?.certainty) ?? CERTAINTIES[0],
      estimateNote: editing?.estimateNote ?? '',
      reason: editing?.manualReason ?? '',
    },
  });

  const certainty = useWatch({ control: methods.control, name: 'certainty' });

  const onSubmit = methods.handleSubmit(async (v) => {
    const body = {
      group: v.group.value,
      description: v.description.trim(),
      quantity: v.quantity,
      unitRate: v.unitRate,
      certainty: v.certainty.value as 'FIXED' | 'ESTIMATED',
      estimateNote: v.certainty.value === 'ESTIMATED' ? v.estimateNote.trim() : null,
      reason: v.reason.trim(),
    };
    const ok = editing
      ? await run(
          () => edit.mutateAsync({ requestId, value: { lineId: editing.id, body } }),
          'Line saved',
        )
      : await run(() => add.mutateAsync({ requestId, value: body, version }), 'Line added');
    if (ok) onClose();
  });

  return (
    <EditorFrame title={editing ? `Edit ${editing.description}` : 'Add a line'}>
      <FormWrapper
        methods={methods}
        isSubmitting={add.isPending || edit.isPending}
        mode={editing ? 'edit' : 'add'}
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
        force
      >
        {({ FormField }) => (
          <>
            <Flex gap={16}>
              <FormField
                name="group"
                label="Group"
                component="select"
                componentProps={{ isRequired: true, options: GROUPS }}
              />
              <FormField
                name="certainty"
                label="Certainty"
                component="select"
                componentProps={{ isRequired: true, options: CERTAINTIES }}
              />
            </Flex>
            <FormField
              name="description"
              label="Description"
              component="text"
              componentProps={{ isRequired: true }}
            />
            <Flex gap={16}>
              <FormField
                name="quantity"
                label="Quantity"
                component="number"
                componentProps={{ isRequired: true, min: 0, step: 1 }}
              />
              <FormField
                name="unitRate"
                label={`Unit rate, ${currency}`}
                component="number"
                componentProps={{ isRequired: true, min: 0, step: 0.01 }}
              />
            </Flex>
            {certainty?.value === 'ESTIMATED' && (
              <FormField
                name="estimateNote"
                label="Why it may vary"
                component="textarea"
                componentProps={{ isRequired: true, rows: 2, maxLength: 300 }}
              />
            )}
            <FormField
              name="reason"
              label="What the catalog doesn't know (the customer sees it)"
              component="textarea"
              componentProps={{ isRequired: true, rows: 2, maxLength: 300 }}
            />
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label={editing ? 'Save line' : 'Add line'} />
            </Flex>
          </>
        )}
      </FormWrapper>
    </EditorFrame>
  );
};
