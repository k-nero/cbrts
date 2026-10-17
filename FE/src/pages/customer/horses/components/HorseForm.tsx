import { type FC, type ReactNode, useMemo } from 'react';
import { type Resolver, useController, type UseFormReturn, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flex } from 'antd';

import { fromHorse, type HorseFormValues, makeHorseSchema, toHorseInput } from './horseSchema';

import { CancelButton } from '@/components/form/CancelButton';
import FormWrapper, { useFormCustom } from '@/components/form/FormWrapper';
import { SubmitButton } from '@/components/form/SubmitButton';
import { Checkbox, Chip, OptionCard } from '@/components/ui';
import { useSizeClasses } from '@/hooks/horse';
import {
  type Horse,
  HorseCoatEnum,
  type HorseInput,
  HorseSexEnum,
  type Temperament,
  TemperamentEnum,
} from '@/interfaces';
import { apiErrorView, formatHeight, ict, sexLabel, sizeClassFor } from '@/lib/utils';

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

const TEMPERAMENT_CARDS: {
  value: Temperament;
  title: string;
  description: string;
  meta: string;
}[] = [
  {
    value: TemperamentEnum.CALM,
    title: 'Calm',
    description: 'Loads with a standard team.',
    meta: 'Standard stall',
  },
  {
    value: TemperamentEnum.NERVOUS,
    title: 'Nervous',
    description: 'Loaded slowly, away from the ramp.',
    meta: 'Quiet position',
  },
  {
    value: TemperamentEnum.AGGRESSIVE,
    title: 'Aggressive',
    description: 'Experienced handlers only.',
    meta: 'Box stall',
  },
];

/** Where the API's refusals land (spec §3.5). */
const FIELDS_BY_CODE = {
  HORSE_NAME_TAKEN: 'name',
  MICROCHIP_REGISTERED: 'microchip',
  INVALID_HEIGHT: 'heightHh',
};

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

/** One section of the form: its title, why it asks, then its fields. */
const Section: FC<{ title: string; sub?: string; first?: boolean; children: ReactNode }> = ({
  title,
  sub,
  first,
  children,
}) => (
  <section
    className={first ? 'flex flex-col gap-3.5' : 'flex flex-col gap-3.5 border-t border-line pt-5'}
  >
    <div className="flex flex-col gap-0.5">
      <h4 className="type-h4 m-0 text-ink">{title}</h4>
      {sub && <p className="type-body-s m-0 text-ink-3">{sub}</p>}
    </div>
    {children}
  </section>
);

/** "Size M · 32 in. Worked out from 16.0 hh." */
const SizeLine: FC = () => {
  const heightHh = useWatch<HorseFormShape, 'heightHh'>({ name: 'heightHh' });
  const requiredStall = useWatch<HorseFormShape, 'requiredStall'>({ name: 'requiredStall' });
  const { data: classes } = useSizeClasses();
  const size = sizeClassFor(heightHh, requiredStall ?? 'STANDARD', classes ?? []);
  return (
    <div className="flex items-center gap-3 rounded-sm bg-sunken px-4 py-3">
      {size ? (
        <>
          <Chip tone="neutral">
            Size {size.code} · {size.widthIn} in
          </Chip>
          <span className="type-body-s text-ink-2">
            Worked out from {formatHeight(heightHh)}. It decides the stall width and the air
            position.
          </span>
        </>
      ) : (
        <span className="type-body-s text-ink-3">
          Your horse&apos;s size class appears when you enter a height.
        </span>
      )}
    </div>
  );
};

/** Calm, Nervous or Aggressive, as radio option cards. */
const TemperamentCards: FC = () => {
  const { field } = useController<HorseFormShape, 'temperament'>({ name: 'temperament' });
  return (
    <div className="grid grid-cols-3 gap-3">
      {TEMPERAMENT_CARDS.map((card) => (
        <OptionCard
          key={card.value}
          type="radio"
          name="temperament"
          value={card.value}
          selected={field.value === card.value}
          onChange={(selected) => selected && field.onChange(card.value)}
          title={card.title}
          description={card.description}
          meta={card.meta}
        />
      ))}
    </div>
  );
};

/** Climate-controlled and box stall: one value in the API, so ticking one unticks the other. */
const StallTicks: FC = () => {
  const { field } = useController<HorseFormShape, 'requiredStall'>({ name: 'requiredStall' });
  return (
    <div className="flex gap-6">
      <Checkbox
        label="Climate-controlled stall"
        checked={field.value === 'CLIMATE'}
        onChange={(e) => field.onChange(e.target.checked ? 'CLIMATE' : 'STANDARD')}
      />
      <Checkbox
        label="Box stall only"
        checked={field.value === 'BOX'}
        onChange={(e) => field.onChange(e.target.checked ? 'BOX' : 'STANDARD')}
      />
    </div>
  );
};

/** The form's values as the side column reads them ("How he'll appear"). */
const Side: FC<{ render: (values: HorseFormShape) => ReactNode }> = ({ render }) => {
  const values = useWatch<HorseFormShape>() as HorseFormShape;
  return <>{render(values)}</>;
};

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
  const schema = useMemo(() => makeHorseSchema(today), [today]);
  const locked = horse?.identityLocked === true;
  const methods = useFormCustom<HorseFormShape, unknown, HorseFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<HorseFormShape, unknown, HorseFormValues>,
    defaultValues: horse ? toShape(fromHorse(horse)) : EMPTY,
  });

  const submit = methods.handleSubmit(async (values) => {
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
      const view = apiErrorView(error, FIELDS_BY_CODE, 'Something went wrong. Try again.');
      Object.entries(view.fields).forEach(([field, message]) =>
        methods.setError(field as keyof HorseFormShape, { message }),
      );
      if (view.form) methods.setError('form_error', { message: view.form });
    }
  });

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
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 rounded-lg border border-line bg-card p-7">
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
                  componentProps={{ instruction: 'Shown to the escort and the fleet coordinator.' }}
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
            </div>
            {afterForm}
          </div>
          {side && (
            <div className="flex flex-col gap-6">
              <Side render={side} />
            </div>
          )}
        </div>
      )}
    </FormWrapper>
  );
};

export default HorseForm;
