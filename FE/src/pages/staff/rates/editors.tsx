import { type FC, useEffect } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { App, Flex } from 'antd';
import { z } from 'zod';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import BaseModal from '@/components/modal/BaseModal';
import { Button, Callout } from '@/components/ui';
import {
  usePutPolicies,
  usePutServiceClass,
  usePutVolumeBreaks,
  useSaveRateLine,
} from '@/hooks/rates';
import type {
  HorseSex,
  RateBasis,
  RateCorridorView,
  RateLine,
  RatePolicyKey,
  ServiceClass,
  ServiceClassRow,
  TrailerType,
} from '@/interfaces';
import { bandRefusal, bandsSave, editorRefusal, lineScopeWarning } from '@/lib/utils';

import {
  type BandsForm,
  bandsSchema,
  type ClassForm,
  classSchema,
  LINE_FIELDS,
  type LineForm,
  lineSchema,
} from './schemas';

type Opt<T extends string> = { label: string; value: T };
const opt = <T extends string>(value: T, label: string): Opt<T> => ({ value, label });

const BASES: Opt<RateBasis>[] = [
  opt('PER_HORSE', 'Per horse'),
  opt('PER_SHIPMENT', 'Per shipment'),
  opt('PER_KM', 'Per km (road)'),
  opt('PER_DAY', 'Per day (quarantine days)'),
  opt('PER_CROSSING', 'Per border crossing'),
  opt('PER_HOUR', 'Per hour (estimated)'),
  opt('PER_THREE_HORSES', 'One per three horses'),
  opt('FLIGHT_VET', 'Flight vet rule'),
];
const GROUPS: Opt<string>[] = [
  opt('A', 'A · Ground transport, origin'),
  opt('B', 'B · Pre-export'),
  opt('C', 'C · Freight'),
  opt('D', 'D · Escort'),
  opt('E', 'E · Documentation'),
  opt('F', 'F · Post-arrival'),
  opt('G', 'G · Ground transport, destination'),
  opt('H', 'H · Surcharges'),
];
const SEXES: Opt<HorseSex>[] = [
  opt('STALLION', 'Stallion'),
  opt('MARE', 'Mare'),
  opt('GELDING', 'Gelding'),
  opt('COLT', 'Colt'),
  opt('FILLY', 'Filly'),
];
const TRAILERS: Opt<TrailerType>[] = [
  opt('SHARED', 'Shared load'),
  opt('PRIVATE', 'Private trailer'),
];
const CERTAINTIES: Opt<'FIXED' | 'ESTIMATED'>[] = [
  opt('FIXED', 'Fixed'),
  opt('ESTIMATED', 'Estimated'),
];
const CLASSES: Opt<ServiceClass>[] = [
  opt('ECONOMY', 'Economy'),
  opt('BUSINESS', 'Business'),
  opt('FIRST', 'First'),
];

/** A modal's save failed: the page handles a vanished draft, the form shows everything else. */
type OnDraftGone = (error: unknown) => boolean;

/** Puts a refusal on the fields the form shows (focusing the first) and the rest in the form message. */
const refuse = (
  error: unknown,
  fieldsByCode: Record<string, string>,
  shownFields: string[],
  setError: (name: string, message: string, focus: boolean) => void,
) => {
  const refusal = editorRefusal(error, fieldsByCode, shownFields);
  Object.entries(refusal.fields).forEach(([field, message]) =>
    setError(field, message, field === refusal.focus),
  );
  if (refusal.form) setError('form_error', refusal.form, false);
};

// --- catalog lines ------------------------------------------------------------------------------------

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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, methods, open]);

  const everyCorridor = useWatch({ control: methods.control, name: 'everyCorridor' }) ?? false;
  const scopeWarning = lineScopeWarning(editing, everyCorridor, view.corridor.code);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      await save.mutateAsync({
        lineId: editing?.id ?? null,
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
        },
      });
      message.success(editing ? 'Line saved to the draft' : 'Line added to the draft');
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

// --- air stall classes ----------------------------------------------------------------------------------

/** Set an air stall class's width per horse and position rate; horses per position follow from the width. */
export const ClassModal: FC<{
  open: boolean;
  editing: ServiceClassRow | null;
  view: RateCorridorView;
  onClose: () => void;
  onDraftGone: OnDraftGone;
}> = ({ open, editing, view, onClose, onDraftGone }) => {
  const { message } = App.useApp();
  const put = usePutServiceClass();
  const methods = useFormCustom<ClassForm>({ resolver: zodResolver(classSchema) });
  const free = CLASSES.filter((c) => !view.serviceClasses.some((s) => s.serviceClass === c.value));

  useEffect(() => {
    if (!open) return;
    methods.reset({
      serviceClass: CLASSES.find((c) => c.value === editing?.serviceClass) ?? free[0] ?? CLASSES[0],
      widthPerHorseIn: editing?.widthPerHorseIn ?? (null as unknown as number),
      positionRate: editing?.positionRate ?? (null as unknown as number),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, methods, open]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      await put.mutateAsync({
        corridorId: view.corridor.id,
        serviceClass: v.serviceClass.value as ServiceClass,
        body: { widthPerHorseIn: v.widthPerHorseIn, positionRate: v.positionRate },
      });
      message.success('Class saved to the draft');
      onClose();
    } catch (error) {
      if (onDraftGone(error)) return onClose();
      refuse(
        error,
        { WIDTH_PER_HORSE_IN: 'widthPerHorseIn' },
        ['serviceClass', 'widthPerHorseIn', 'positionRate'],
        (name, msg, focus) =>
          methods.setError(name as never, { message: msg }, { shouldFocus: focus }),
      );
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title={editing ? 'Edit class' : 'Add class'}>
      <FormWrapper
        methods={methods}
        isSubmitting={put.isPending}
        mode={editing ? 'edit' : 'add'}
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <FormField
              name="serviceClass"
              label="Class"
              component="select"
              componentProps={{
                isRequired: true,
                options: editing ? CLASSES : free,
                isDisabled: Boolean(editing),
              }}
            />
            <Flex gap={16}>
              <FormField
                name="widthPerHorseIn"
                label="Width per horse, in"
                component="number"
                componentProps={{
                  isRequired: true,
                  min: 1,
                  max: 96,
                  instruction: 'One position is 96 in.',
                }}
              />
              <FormField
                name="positionRate"
                label="Position rate, USD"
                component="number"
                componentProps={{ isRequired: true, min: 0, step: 0.01 }}
              />
            </Flex>
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

// --- volume breaks -------------------------------------------------------------------------------------

/** Edit the volume breaks as a whole: this corridor's own bands, or the bands for every corridor. */
export const BreaksModal: FC<{
  open: boolean;
  view: RateCorridorView;
  onClose: () => void;
  onDraftGone: OnDraftGone;
}> = ({ open, view, onClose, onDraftGone }) => {
  const { message } = App.useApp();
  const put = usePutVolumeBreaks();
  const methods = useFormCustom<BandsForm>({ resolver: zodResolver(bandsSchema) });
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'bands' });

  useEffect(() => {
    if (!open) return;
    methods.reset({
      ownBands: view.volumeBreaksScope === 'CORRIDOR',
      bands: view.volumeBreaks.map((b) => ({ ...b })),
    });
  }, [methods, open, view]);

  const onSubmit = methods.handleSubmit(async (v) => {
    const save = bandsSave(view.volumeBreaksScope, v.ownBands, v.bands);
    // An empty corridor list only removes the corridor's own bands; anything else must be a valid set.
    const refusal = save.corridorScoped && save.bands.length === 0 ? null : bandRefusal(save.bands);
    if (refusal) {
      methods.setError('form_error', { message: refusal });
      return;
    }
    try {
      await put.mutateAsync({
        corridorId: save.corridorScoped ? view.corridor.id : null,
        bands: save.bands,
        view: view.corridor.id,
      });
      message.success('Volume breaks saved to the draft');
      onClose();
    } catch (error) {
      if (onDraftGone(error)) return onClose();
      // The bands are edited as a set: every refusal is about the whole list.
      refuse(error, {}, [], (name, msg) => methods.setError(name as never, { message: msg }));
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title="Volume breaks">
      <FormWrapper
        methods={methods}
        isSubmitting={put.isPending}
        mode="edit"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <FormField
              name="ownBands"
              component="checkbox"
              componentProps={{
                children: `Bands for ${view.corridor.code} only (leave them empty to use the bands for every corridor)`,
              }}
            />
            {fields.map((f, i) => (
              <Flex key={f.id} gap={12} align="end">
                <FormField
                  name={`bands.${i}.minHorses`}
                  label="From horses"
                  component="number"
                  componentProps={{ min: 1 }}
                />
                <FormField
                  name={`bands.${i}.maxHorses`}
                  label="To horses"
                  component="number"
                  componentProps={{ min: 1, placeholder: 'and up' }}
                />
                <FormField
                  name={`bands.${i}.discountPct`}
                  label="Discount, %"
                  component="number"
                  componentProps={{ min: 0, max: 100, step: 0.5 }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove band ${i + 1}`}
                  onClick={() => remove(i)}
                >
                  Remove
                </Button>
              </Flex>
            ))}
            <Flex justify="space-between" gap={8}>
              <Button
                size="sm"
                variant="secondary"
                leadingIcon="plus"
                onClick={() => append({ minHorses: null, maxHorses: null, discountPct: 0 })}
              >
                Add band
              </Button>
              <Flex gap={8}>
                <CancelButton label="Cancel" />
                <SubmitButton type="primary" label="Save to draft" />
              </Flex>
            </Flex>
          </>
        )}
      </FormWrapper>
    </BaseModal>
  );
};

// --- percentages and policy ------------------------------------------------------------------------------

const POLICY_FIELDS: { key: RatePolicyKey; label: string; max?: number; step: number }[] = [
  { key: 'FUEL_PCT', label: 'Fuel surcharge, % of air lines', max: 100, step: 0.5 },
  { key: 'INSURANCE_PCT', label: 'Insurance, % of declared value', max: 100, step: 0.1 },
  { key: 'CONTINGENCY_PCT', label: 'Contingency, %', max: 100, step: 0.5 },
  { key: 'SERVICE_FEE_PCT', label: 'Service fee, % after contingency', max: 100, step: 0.5 },
  { key: 'DEPOSIT_PCT', label: 'Deposit, %', max: 100, step: 1 },
  { key: 'QUOTE_VALIDITY_DAYS', label: 'Quote validity, days', max: 30, step: 1 },
  { key: 'FLIGHT_VET_MIN_HORSES', label: 'Flight vet from, horses', step: 1 },
  { key: 'HIGH_VALUE_THRESHOLD', label: 'High value threshold, USD', step: 1000 },
];
const policySchema = z.object(
  Object.fromEntries(
    POLICY_FIELDS.map((f) => [
      f.key,
      z.number({ error: 'Enter a value.' }).min(0, "It can't be negative."),
    ]),
  ) as Record<RatePolicyKey, z.ZodNumber>,
);
type PolicyForm = z.infer<typeof policySchema>;

/** Edit the percentages and policy values; the fee bands stay read-only in this slice. */
export const PoliciesModal: FC<{
  open: boolean;
  view: RateCorridorView;
  onClose: () => void;
  onDraftGone: OnDraftGone;
}> = ({ open, view, onClose, onDraftGone }) => {
  const { message } = App.useApp();
  const put = usePutPolicies();
  const methods = useFormCustom<PolicyForm>({ resolver: zodResolver(policySchema) });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      Object.fromEntries(
        POLICY_FIELDS.map((f) => [f.key, view.policies[f.key] ?? null]),
      ) as PolicyForm,
    );
  }, [methods, open, view]);

  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      await put.mutateAsync({ values: v, view: view.corridor.id });
      message.success('Percentages saved to the draft');
      onClose();
    } catch (error) {
      if (onDraftGone(error)) return onClose();
      const keys = POLICY_FIELDS.map((f) => f.key);
      refuse(error, Object.fromEntries(keys.map((k) => [k, k])), keys, (name, msg, focus) =>
        methods.setError(name as never, { message: msg }, { shouldFocus: focus }),
      );
    }
  });

  return (
    <BaseModal open={open} onCancel={onClose} title="Percentages and policy">
      <FormWrapper
        methods={methods}
        isSubmitting={put.isPending}
        mode="edit"
        onCancel={onClose}
        onFinish={onSubmit}
        layout="vertical"
      >
        {({ FormField }) => (
          <>
            <div className="grid grid-cols-2 gap-x-4">
              {POLICY_FIELDS.map((f) => (
                <FormField
                  key={f.key}
                  name={f.key}
                  label={f.label}
                  component="number"
                  componentProps={{ isRequired: true, min: 0, max: f.max, step: f.step }}
                />
              ))}
            </div>
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
