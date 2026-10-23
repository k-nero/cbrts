import { type FC, type ReactNode, useMemo } from 'react';
import { type Resolver, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flex } from 'antd';

import { fromHorse, type HorseFormValues, makeHorseSchema, toHorseInput } from './schema';
import { Section } from './Section';
import { Side } from './Side';
import { SizeLine } from './SizeLine';
import { StallTicks } from './StallTicks';
import { TemperamentCards } from './TemperamentCards';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { type Horse, HorseCoatEnum, type HorseInput, HorseSexEnum } from '@/interfaces';
import { apiErrorView, formRefusal, ict, sexLabel } from '@/lib/utils';

type Option = { label: string; value: string };

/** What the form holds: the selects keep their chosen option ({ label, value }). */
export type HorseFormShape = Omit<HorseFormValues, 'sex' | 'coat'> & {
  sex: Option | null;
  coat: Option | null;
};

const SEX_OPTIONS: Option[] = Object.values(HorseSexEnum).map((s) => ({
  label: sexLabel(s),
  value: s,
}));

const COAT_OPTIONS: Option[] = Object.values(HorseCoatEnum).map((c) => ({
  label: c.charAt(0) + c.slice(1).toLowerCase(),
  value: c,
}));

const optionFor = (options: Option[], value: string | null | undefined) =>
  options.find((o) => o.value === value) ?? null;

/** Where the API's refusals land (spec §3.5). */
const FIELDS_BY_CODE = {
  HORSE_NAME_TAKEN: 'name',
  MICROCHIP_REGISTERED: 'microchip',
  INVALID_MICROCHIP: 'microchip',
  INVALID_HEIGHT: 'heightHh',
  INVALID_DATE_OF_BIRTH: 'dateOfBirth',
};

/** The fields in the order the form shows them; a locked horse doesn't show the first six. */
const IDENTITY_FIELDS = ['name', 'microchip', 'passportNo', 'sex', 'breed', 'dateOfBirth', 'coat'];

const OTHER_FIELDS = [
  'heightHh',
  'weightKg',
  'temperament',
  'requiredStall',
  'handlingNotes',
  'declaredValue',
];

const LOCKED_HIDDEN = new Set(['name', 'microchip', 'sex', 'breed', 'dateOfBirth', 'coat']);

const EMPTY: HorseFormShape = {
  name: '',
  microchip: '',
  passportNo: '',
  sex: null,
  breed: null,
  dateOfBirth: null,
  coat: null,
  heightHh: undefined as unknown as number,
  weightKg: null,
  temperament: null,
  requiredStall: 'STANDARD',
  handlingNotes: null,
  declaredValue: undefined as unknown as number,
};

const toShape = (values: HorseFormValues): HorseFormShape => ({
  ...values,
  sex: optionFor(SEX_OPTIONS, values.sex),
  coat: optionFor(COAT_OPTIONS, values.coat),
});

type Props = {
  /** A saved horse for Edit; empty for Add. */
  horse?: Horse;
  submitLabel: string;
  isSaving: boolean;
  onSubmit: (input: HorseInput) => Promise<Horse>;
  onCancel: () => void;
  onSaved: (horse: Horse) => void;
  /** The side column, from the values as they are typed. */
  side?: (values: HorseFormShape) => ReactNode;
  /** Under the form card, e.g. the locked passport panel on Edit. */
  afterForm?: ReactNode;
};

/**
 * Add a horse and Edit (spec §5): Identity, Size and weight, Temperament and needs, Declared value.
 * When the horse's identity is locked, the six passport fields leave the form and are sent back as
 * they were (the API refuses any change to them).
 */
const HorseForm: FC<Props> = ({
  horse,
  submitLabel,
  isSaving,
  onSubmit,
  onCancel,
  onSaved,
  side,
  afterForm,
}) => {
  const today = ict(new Date().toISOString()).format('YYYY-MM-DD');
  const locked = horse?.identityLocked === true;
  const schema = useMemo(() => makeHorseSchema(today, { locked }), [today, locked]);
  const shownFields = [...IDENTITY_FIELDS, ...OTHER_FIELDS].filter(
    (field) => !locked || !LOCKED_HIDDEN.has(field),
  );
  const methods = useFormCustom<HorseFormShape, unknown, HorseFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<HorseFormShape, unknown, HorseFormValues>,
    defaultValues: horse ? toShape(fromHorse(horse)) : EMPTY,
  });

  // Save sits at the foot of a long form, and the kit's inputs give React Hook Form no focusable ref:
  // after any refusal, bring the first field error (or the form-level alert at the top) into view.
  const revealRefusal = (formLevel: boolean) =>
    requestAnimationFrame(() => {
      const field = document.querySelector('.ant-form-item-has-error');
      if (field && !formLevel) field.scrollIntoView({ block: 'center', behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });

  const submit = methods.handleSubmit(
    async (values) => {
      const input = toHorseInput(values);
      if (locked && horse) {
        Object.assign(input, {
          name: horse.name,
          microchip: horse.microchip ?? '',
          sex: horse.sex,
          breed: horse.breed,
          dateOfBirth: horse.dateOfBirth,
          coat: horse.coat,
        });
      }
      try {
        onSaved(await onSubmit(input));
      } catch (error) {
        const refusal = formRefusal(
          apiErrorView(error, FIELDS_BY_CODE, 'Something went wrong. Try again.'),
          shownFields,
        );
        Object.entries(refusal.fields).forEach(([field, message]) =>
          methods.setError(
            field as keyof HorseFormShape,
            { message },
            { shouldFocus: field === refusal.focus },
          ),
        );
        if (refusal.form) methods.setError('form_error', { message: refusal.form });
        revealRefusal(refusal.form !== null && refusal.focus === null);
      }
    },
    () => revealRefusal(false),
  );

  return (
    <FormWrapper
      // FormWrapper doesn't type a resolver that transforms values (a select's option to its value).
      methods={methods as unknown as UseFormReturn<HorseFormShape>}
      isSubmitting={isSaving}
      mode={horse ? 'edit' : 'add'}
      onCancel={onCancel}
      onFinish={submit}
      layout="vertical"
    >
      {({ FormField }) => (
        <div className="grid grid-cols-[minmax(0,1fr)_400px] items-start gap-6">
          <Flex vertical gap={24}>
            <div className="rounded-lg border border-line bg-card p-7">
              <Flex vertical gap={20}>
                {!locked && (
                  <Section
                    first
                    title="Identity"
                    sub="As on the passport. We check these against it when you request transport."
                  >
                    <Flex gap={16}>
                      <FormField
                        name="name"
                        label="Name"
                        component="text"
                        componentProps={{ isRequired: true }}
                      />
                      <FormField
                        name="microchip"
                        label="Microchip"
                        component="text"
                        componentProps={{
                          isRequired: true,
                          instruction: 'From the passport: 15 digits. Borders check it.',
                        }}
                      />
                    </Flex>
                    <Flex gap={16}>
                      <FormField
                        name="passportNo"
                        label="Passport number"
                        component="text"
                        componentProps={{ isRequired: true }}
                      />
                      <FormField
                        name="sex"
                        label="Sex"
                        component="select"
                        componentProps={{ isRequired: true, options: SEX_OPTIONS }}
                      />
                    </Flex>
                    <Flex gap={16}>
                      <FormField name="breed" label="Breed" component="text" />
                      <FormField name="dateOfBirth" label="Date of birth" component="datepicker" />
                      <FormField
                        name="coat"
                        label="Coat"
                        component="select"
                        componentProps={{ options: COAT_OPTIONS }}
                      />
                    </Flex>
                  </Section>
                )}
                <Section first={locked} title="Size and weight">
                  <Flex gap={16}>
                    <FormField
                      name="heightHh"
                      label="Height (hh)"
                      component="number"
                      componentProps={{
                        isRequired: true,
                        instruction: 'Hands, e.g. 16.2',
                        step: 0.1,
                        precision: 1,
                      }}
                    />
                    <FormField
                      name="weightKg"
                      label="Weight (kg)"
                      component="number"
                      componentProps={{ step: 1 }}
                    />
                  </Flex>
                  <SizeLine />
                </Section>
                <Section title="Temperament and needs">
                  <TemperamentCards />
                  <StallTicks />
                  <FormField
                    name="handlingNotes"
                    label="Handling notes"
                    component="textarea"
                    componentProps={{
                      instruction: 'Shown to the escort and the fleet coordinator.',
                    }}
                  />
                </Section>
                <Section title="Declared value">
                  <FormField
                    name="declaredValue"
                    label="Declared value (USD)"
                    component="number"
                    componentProps={{
                      isRequired: true,
                      instruction: 'Used for insurance if you insure through us (1.5%).',
                      min: 0,
                      step: 1000,
                    }}
                  />
                </Section>
                <Flex justify="end" gap={8} className="border-t border-line pt-5">
                  <CancelButton label="Cancel" />
                  <SubmitButton type="primary" label={submitLabel} />
                </Flex>
              </Flex>
            </div>
            {afterForm}
          </Flex>
          {side && (
            <Flex vertical gap={24}>
              <Side render={side} />
            </Flex>
          )}
        </div>
      )}
    </FormWrapper>
  );
};

export default HorseForm;
