import { type FC, useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';

import { LINE_FIELDS, type LineForm, lineSchema } from './schema';
import {
  BASES,
  CERTAINTIES,
  GROUPS,
  type OnDraftGone,
  type Opt,
  refuse,
  SEXES,
  TRAILERS,
} from './editorOptions';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Callout } from '@/components/ui';
import { useSaveRateLine } from '@/hooks/rates';
import type { HorseSex, RateBasis, RateCorridorView, RateLine, TrailerType } from '@/interfaces';
import { lineScopeWarning } from '@/lib/utils';

/** Every field the line form shows, so a refusal for any other lands in the form message. */
const LINE_SHOWN = [
  'everyCorridor',
  'code',
  'group',
  'description',
  'basis',
  'rate',
  'appliesToSex',
  'appliesToTrailer',
  'minCharge',
  'defaultQuantity',
  'certainty',
  'estimateNote',
  'coveredByRoadLeg',
];

/** Add or change a catalog line in the draft, for this corridor or for every corridor. */
export const LineModal: FC<{
  open: boolean;
  editing: RateLine | null;
  view: RateCorridorView;
  onClose: () => void;
  onDraftGone: OnDraftGone;
}> = ({ open, editing, view, onClose, onDraftGone }) => {
  const { message } = App.useApp();
  const save = useSaveRateLine();
  const methods = useFormCustom<LineForm>({ resolver: zodResolver(lineSchema) });
  const pick = <T extends string>(list: Opt<T>[], value: T | null | undefined) =>
    list.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    methods.reset({
      everyCorridor: editing?.everyCorridor ?? false,
      code: editing?.code ?? '',
      group: pick(GROUPS, editing?.group ?? 'A') ?? GROUPS[0],
      description: editing?.description ?? '',
      basis: pick(BASES, editing?.basis ?? 'PER_HORSE') ?? BASES[0],
      appliesToSex: pick(SEXES, editing?.appliesToSex),
      appliesToTrailer: pick(TRAILERS, editing?.appliesToTrailer),
      rate: editing?.rate ?? (null as unknown as number),
      minCharge: editing?.minCharge ?? null,
      defaultQuantity: editing?.defaultQuantity ?? null,
      certainty: pick(CERTAINTIES, editing?.certainty ?? 'FIXED') ?? CERTAINTIES[0],
      estimateNote: editing?.estimateNote ?? '',
      coveredByRoadLeg: editing?.coveredByRoadLeg ?? false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, methods, open]);

  const everyCorridor = useWatch({ control: methods.control, name: 'everyCorridor' }) ?? false;
  const scopeWarning = lineScopeWarning(editing, everyCorridor, view.corridor.code);

  const onSubmit = methods.handleSubmit(async (v) => {
    // Unticking a shared line adds this corridor's own line, which replaces the shared one here only;
    // changing the shared row itself would take it away from every other corridor.
    const ownCopy = Boolean(editing?.everyCorridor) && !v.everyCorridor;
    try {
      await save.mutateAsync({
        lineId: ownCopy ? null : (editing?.id ?? null),
        view: view.corridor.id,
        body: {
          corridorId: v.everyCorridor ? null : view.corridor.id,
          code: v.code,
          group: v.group.value,
          description: v.description,
          basis: v.basis.value as RateBasis,
          appliesToSex: (v.appliesToSex?.value as HorseSex | undefined) ?? null,
          appliesToTrailer: (v.appliesToTrailer?.value as TrailerType | undefined) ?? null,
          rate: v.rate,
          minCharge: v.minCharge,
          defaultQuantity: v.defaultQuantity,
          certainty: v.certainty.value as 'FIXED' | 'ESTIMATED',
          estimateNote: v.estimateNote.trim() || null,
          coveredByRoadLeg: v.coveredByRoadLeg,
        },
      });
      message.success(
        ownCopy
          ? `Line added for ${view.corridor.code}`
          : editing
            ? 'Line saved to the draft'
            : 'Line added to the draft',
      );
      onClose();
    } catch (error) {
      if (onDraftGone(error)) return onClose();
      refuse(error, LINE_FIELDS, LINE_SHOWN, (name, msg, focus) =>
        methods.setError(name as never, { message: msg }, { shouldFocus: focus }),
      );
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title={editing ? 'Edit line' : 'Add line'}>
      <FormWrapper
        methods={methods}
        isSubmitting={save.isPending}
        mode={editing ? 'edit' : 'add'}
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <FormField
              name="everyCorridor"
              component="checkbox"
              componentProps={{ children: 'Applies to every corridor' }}
            />
            {scopeWarning && <Callout tone="warn" title={scopeWarning} />}
            <Flex gap={16}>
              <FormField
                name="code"
                label="Code"
                component="text"
                componentProps={{ isRequired: true }}
              />
              <FormField
                name="group"
                label="Group"
                component="select"
                componentProps={{ isRequired: true, options: GROUPS }}
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
                name="basis"
                label="Basis"
                component="select"
                componentProps={{ isRequired: true, options: BASES }}
              />
              <FormField
                name="rate"
                label="Rate, USD"
                component="number"
                componentProps={{ isRequired: true, min: 0, step: 0.01 }}
              />
            </Flex>
            <Flex gap={16}>
              <FormField
                name="appliesToSex"
                label="For one sex"
                component="select"
                componentProps={{ options: SEXES, isClearable: true, placeholder: 'Every sex' }}
              />
              <FormField
                name="appliesToTrailer"
                label="For one trailer (per km)"
                component="select"
                componentProps={{ options: TRAILERS, isClearable: true, placeholder: 'Both' }}
              />
            </Flex>
            <Flex gap={16}>
              <FormField
                name="minCharge"
                label="Minimum charge (per km)"
                component="number"
                componentProps={{ min: 0, step: 0.01 }}
              />
              <FormField
                name="defaultQuantity"
                label="Hours assumed (per hour)"
                component="number"
                componentProps={{ min: 0, step: 0.5 }}
              />
            </Flex>
            <FormField
              name="certainty"
              label="Certainty"
              component="select"
              componentProps={{ isRequired: true, options: CERTAINTIES }}
            />
            <FormField
              name="estimateNote"
              label="Why it may vary (estimated lines)"
              component="textarea"
              componentProps={{ rows: 2, maxLength: 300 }}
            />
            <FormField
              name="coveredByRoadLeg"
              component="checkbox"
              componentProps={{ children: 'Not charged when a road leg covers this end' }}
            />
            <Flex justify="end" gap={8}>
              <CancelButton label="Cancel" />
              <SubmitButton type="primary" label="Save to draft" />
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};
