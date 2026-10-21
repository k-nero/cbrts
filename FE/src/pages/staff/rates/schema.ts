import { z } from 'zod';

import type { RateBasis, RatePolicyKey } from '@/interfaces';

const option = z.object({ label: z.string(), value: z.string() });

/** The catalog keeps money, hours and discounts with two decimals (numeric(…, 2)). */
const TWO_DECIMALS = 'Use at most 2 decimals.';
const twoDecimals = (v: number) => Number.isInteger(Math.round(v * 100 * 1e6) / 1e6);

const amount = z
  .number({ error: 'Enter an amount.' })
  .min(0, "An amount can't be negative.")
  .refine(twoDecimals, TWO_DECIMALS);

/** The quotation adds " · stallion" (the longest sex) to a sex line's 160-character description. */
const SEX_DESCRIPTION_MAX = 160 - ' · stallion'.length;
const SEX_BASES: RateBasis[] = ['PER_HORSE', 'PER_DAY'];

// --- catalog lines ------------------------------------------------------------------------------------

export const lineSchema = z
  .object({
    everyCorridor: z.boolean(),
    code: z
      .string()
      .trim()
      .min(1, 'Enter a code.')
      .max(40, 'At most 40 characters.')
      .regex(/^[A-Z0-9_]+$/, 'Use capitals, digits and underscores.'),
    group: option,
    description: z.string().trim().min(1, 'Describe the line.').max(160, 'At most 160 characters.'),
    basis: option,
    appliesToSex: option.nullable(),
    appliesToTrailer: option.nullable(),
    rate: amount,
    minCharge: z
      .number()
      .min(0, "An amount can't be negative.")
      .refine(twoDecimals, TWO_DECIMALS)
      .nullable(),
    defaultQuantity: z
      .number()
      .positive('Enter more than zero.')
      .refine(twoDecimals, TWO_DECIMALS)
      .nullable(),
    certainty: option,
    estimateNote: z.string().max(300, 'At most 300 characters.'),
  })
  .superRefine((v, ctx) => {
    const basis = v.basis.value as RateBasis;
    if (v.appliesToSex && !SEX_BASES.includes(basis))
      ctx.addIssue({
        code: 'custom',
        path: ['appliesToSex'],
        message: 'Only a per-horse or per-day line can be for one sex.',
      });
    if (v.appliesToSex && v.description.length > SEX_DESCRIPTION_MAX)
      ctx.addIssue({
        code: 'custom',
        path: ['description'],
        message: `A line for one sex can have at most ${SEX_DESCRIPTION_MAX} characters: the quotation adds the sex to it.`,
      });
    if (v.appliesToTrailer && basis !== 'PER_KM')
      ctx.addIssue({
        code: 'custom',
        path: ['appliesToTrailer'],
        message: 'Only a per-km line can be for one trailer kind.',
      });
    if (v.minCharge != null && basis !== 'PER_KM')
      ctx.addIssue({
        code: 'custom',
        path: ['minCharge'],
        message: 'Only a per-km line has a minimum charge.',
      });
    if (basis === 'PER_HOUR' && v.defaultQuantity == null)
      ctx.addIssue({
        code: 'custom',
        path: ['defaultQuantity'],
        message: 'A per-hour line needs the hours it assumes.',
      });
    if (v.certainty.value === 'ESTIMATED' && !v.estimateNote.trim())
      ctx.addIssue({
        code: 'custom',
        path: ['estimateNote'],
        message: 'Say why an estimated line may vary.',
      });
  });
export type LineForm = z.infer<typeof lineSchema>;

export const LINE_FIELDS: Record<string, string> = {
  DUPLICATE_RATE_CODE: 'code',
  BASIS: 'basis',
  DESCRIPTION: 'description',
  APPLIES_TO_SEX: 'appliesToSex',
  APPLIES_TO_TRAILER: 'appliesToTrailer',
  MIN_CHARGE: 'minCharge',
  DEFAULT_QUANTITY: 'defaultQuantity',
  ESTIMATE_NOTE: 'estimateNote',
};

// --- air stall classes ----------------------------------------------------------------------------------

export const classSchema = z.object({
  serviceClass: option,
  widthPerHorseIn: z
    .number({ error: 'Enter the width.' })
    .int('Whole inches.')
    .min(1, 'The width per horse must be 1 to 96 in.')
    .max(96, 'The width per horse must be 1 to 96 in.'),
  positionRate: amount,
});
export type ClassForm = z.infer<typeof classSchema>;

// --- volume breaks -------------------------------------------------------------------------------------

const WHOLE_HORSES = 'Use a whole number of horses.';
const DISCOUNT_RANGE = 'A discount must be between 0 and 100%.';

export const bandsSchema = z.object({
  ownBands: z.boolean(),
  bands: z.array(
    z.object({
      minHorses: z.number().int(WHOLE_HORSES).nullable(),
      maxHorses: z.number().int(WHOLE_HORSES).nullable(),
      discountPct: z
        .number()
        .min(0, DISCOUNT_RANGE)
        .max(100, DISCOUNT_RANGE)
        .refine(twoDecimals, TWO_DECIMALS)
        .nullable(),
    }),
  ),
});
export type BandsForm = z.infer<typeof bandsSchema>;

export const POLICY_FIELDS: { key: RatePolicyKey; label: string; max?: number; step: number }[] = [
  { key: 'FUEL_PCT', label: 'Fuel surcharge, % of air lines', max: 100, step: 0.5 },
  { key: 'INSURANCE_PCT', label: 'Insurance, % of declared value', max: 100, step: 0.1 },
  { key: 'CONTINGENCY_PCT', label: 'Contingency, %', max: 100, step: 0.5 },
  { key: 'SERVICE_FEE_PCT', label: 'Service fee, % after contingency', max: 100, step: 0.5 },
  { key: 'DEPOSIT_PCT', label: 'Deposit, %', max: 100, step: 1 },
  { key: 'QUOTE_VALIDITY_DAYS', label: 'Quote validity, days', max: 30, step: 1 },
  { key: 'ESTIMATE_BAND_PCT', label: 'Estimate band, %', max: 100, step: 1 },
  { key: 'FLIGHT_VET_MIN_HORSES', label: 'Flight vet from, horses', step: 1 },
  { key: 'HIGH_VALUE_THRESHOLD', label: 'High value threshold, USD', step: 1000 },
];

export const policySchema = z.object(
  Object.fromEntries(
    POLICY_FIELDS.map((f) => [
      f.key,
      z.number({ error: 'Enter a value.' }).min(0, "It can't be negative."),
    ]),
  ) as Record<RatePolicyKey, z.ZodNumber>,
);
export type PolicyForm = z.infer<typeof policySchema>;

export const CHANGE_NOTE_MAX = 500;
export const publishSchema = z.object({
  changeNote: z
    .string()
    .trim()
    .min(1, 'Say what changed in this version.')
    .max(CHANGE_NOTE_MAX, `The change note must be ${CHANGE_NOTE_MAX} characters or fewer.`),
});
export type PublishForm = z.infer<typeof publishSchema>;
