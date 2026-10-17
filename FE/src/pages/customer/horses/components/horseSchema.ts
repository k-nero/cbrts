import { z } from 'zod';

import {
  type Horse,
  HorseCoatEnum,
  type HorseInput,
  HorseSexEnum,
  StallTypeEnum,
  TemperamentEnum,
} from '@/interfaces';
import { formatDay, heightProblem } from '@/lib/utils';

const MICROCHIP_DIGITS = 15;

/** The kit's SelectField keeps the chosen option ({ label, value }); the API wants the value. */
const optionValue = (value: unknown): unknown =>
  value && typeof value === 'object' && 'value' in value
    ? (value as { value: unknown }).value
    : value;

const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
};

/**
 * The add/edit form's rules, mirroring the API (slice 1, H-01 to H-05) so most mistakes show before
 * saving. `today` is YYYY-MM-DD in Asia/Ho_Chi_Minh, for "not after today".
 */
export const makeHorseSchema = (today: string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Enter the horse's name." })
      .max(80, { error: 'A name has at most 80 characters.' }),
    microchip: z.string().superRefine((value, ctx) => {
      const digits = value.replace(/\s/g, '');
      if (!new RegExp(`^\\d{${MICROCHIP_DIGITS}}$`).test(digits)) {
        ctx.addIssue({
          code: 'custom',
          message: `A microchip has ${MICROCHIP_DIGITS} digits; ${digits.length} were entered.`,
        });
      }
    }),
    passportNo: z
      .string()
      .trim()
      .min(1, { error: 'Enter the passport number.' })
      .max(40, { error: 'A passport number has at most 40 characters.' }),
    sex: z.preprocess(optionValue, z.enum(HorseSexEnum, { error: "Choose the horse's sex." })),
    breed: z.string().max(60, { error: 'A breed has at most 60 characters.' }).nullish(),
    dateOfBirth: z
      .string()
      .nullish()
      .refine((value) => !value || value <= today, {
        error: (issue) => `The date of birth ${formatDay(String(issue.input))} is after today.`,
      }),
    coat: z.preprocess(optionValue, z.enum(HorseCoatEnum).nullish()),
    heightHh: z.number({ error: "Enter the horse's height." }).superRefine((value, ctx) => {
      const problem = heightProblem(value);
      if (problem) ctx.addIssue({ code: 'custom', message: problem });
    }),
    weightKg: z
      .number()
      .min(100, { error: 'Weight runs from 100 to 1,500 kg.' })
      .max(1500, { error: 'Weight runs from 100 to 1,500 kg.' })
      .nullish(),
    temperament: z.enum(TemperamentEnum).nullish(),
    requiredStall: z.enum(StallTypeEnum).default('STANDARD'),
    handlingNotes: z.string().nullish(),
    declaredValue: z
      .number({ error: 'Enter a declared value above $0.' })
      .gt(0, { error: 'Enter a declared value above $0.' })
      .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
        error: 'A declared value has at most 2 decimals.',
      }),
  });

/** The parsed form: what the resolver hands to submit, and what the tests build. */
export type HorseFormValues = z.output<ReturnType<typeof makeHorseSchema>>;

/** The API body: strings trimmed, the microchip without its spaces, blanks as null. */
export const toHorseInput = (values: HorseFormValues): HorseInput => ({
  name: values.name.trim(),
  microchip: values.microchip.replace(/\s/g, ''),
  passportNo: values.passportNo.trim(),
  sex: values.sex,
  breed: blankToNull(values.breed),
  dateOfBirth: blankToNull(values.dateOfBirth),
  coat: values.coat ?? null,
  heightHh: values.heightHh,
  weightKg: values.weightKg ?? null,
  temperament: values.temperament ?? null,
  requiredStall: values.requiredStall ?? 'STANDARD',
  handlingNotes: blankToNull(values.handlingNotes),
  declaredValue: values.declaredValue,
});

/** A saved horse as form values; a locked horse sends these identity values back unchanged. */
export const fromHorse = (horse: Horse): HorseFormValues => ({
  name: horse.name,
  microchip: horse.microchip ?? '',
  passportNo: horse.passportNo ?? '',
  sex: horse.sex,
  breed: horse.breed,
  dateOfBirth: horse.dateOfBirth,
  coat: horse.coat,
  heightHh: horse.heightHh,
  weightKg: horse.weightKg,
  temperament: horse.temperament,
  requiredStall: horse.requiredStall,
  handlingNotes: horse.handlingNotes,
  declaredValue: horse.declaredValue,
});
