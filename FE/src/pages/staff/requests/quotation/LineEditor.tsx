import { type FC, useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flex } from 'antd';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { useAddLine, useEditLine, useOverrideLine } from '@/hooks/staffRequest';
import type { QuoteLineRow } from '@/interfaces';
import { money, overrideDefaults } from '@/lib/utils';

import {
  type ManualLineForm,
  manualLineSchema,
  type OverrideForm,
  overrideSchema,
} from './schemas';

/** Runs a quotation write the page way (toast, conflict callout); true when it went through. */
export type RunWrite = (write: () => Promise<unknown>, done: string) => Promise<boolean>;

type Opt = { label: string; value: string };

const GROUPS: Opt[] = [
  { value: 'A', label: 'A · Ground transport, origin' },
  { value: 'B', label: 'B · Pre-export' },
  { value: 'C', label: 'C · Freight' },
  { value: 'D', label: 'D · Escort' },
  { value: 'E', label: 'E · Documentation' },
  { value: 'F', label: 'F · Post-arrival' },
  { value: 'G', label: 'G · Ground transport, destination' },
  { value: 'H', label: 'H · Surcharges' },
];
const CERTAINTIES: Opt[] = [
  { value: 'FIXED', label: 'Fixed' },
  { value: 'ESTIMATED', label: 'Estimated' },
];

const Frame: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-3 border-b border-line bg-sunken px-5 py-4">
    <span className="type-label-m text-ink">{title}</span>
    {children}
  </div>
);

/**
 * Override a priced line inline under it (DESIGN.md, Quotation builder): the catalog value struck through,
 * the new amount and a required reason. The total is never typed; it is worked out from the lines.
 */
export const OverrideEditor: FC<{
  requestId: string;
  line: QuoteLineRow;
  run: RunWrite;
  onClose: () => void;
}> = ({ requestId, line, run, onClose }) => {
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
    <Frame title={`Override ${line.description}`}>
      <span className="type-body-s text-ink-3">
        Catalog amount{' '}
        <span className="type-data text-ink-3 line-through">
          {line.catalogAmount == null ? '—' : money(line.catalogAmount)}
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
              label="New amount, USD"
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
    </Frame>
  );
};

/** Add a line the catalog doesn't know, or change one the manager added, inline in its group. */
export const ManualLineEditor: FC<{
  requestId: string;
  group: string;
  editing: QuoteLineRow | null;
  run: RunWrite;
  onClose: () => void;
}> = ({ requestId, group, editing, run, onClose }) => {
  const add = useAddLine();
  const edit = useEditLine();
  const methods = useFormCustom<ManualLineForm>({ resolver: zodResolver(manualLineSchema) });

  useEffect(() => {
    methods.reset({
      group: GROUPS.find((g) => g.value === group) ?? GROUPS[7],
      description: editing?.description ?? '',
      quantity: editing?.quantity ?? 1,
      unitRate: editing?.unitRate ?? (null as unknown as number),
      certainty: CERTAINTIES.find((c) => c.value === editing?.certainty) ?? CERTAINTIES[0],
      estimateNote: editing?.estimateNote ?? '',
      reason: editing?.manualReason ?? '',
    });
  }, [editing, group, methods]);

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
      : await run(() => add.mutateAsync({ requestId, value: body }), 'Line added');
    if (ok) onClose();
  });

  return (
    <Frame title={editing ? `Edit ${editing.description}` : 'Add a line'}>
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
                label="Unit rate, USD"
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
    </Frame>
  );
};
