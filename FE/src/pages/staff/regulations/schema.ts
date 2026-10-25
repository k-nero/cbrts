import { z } from 'zod';

import { RegulationRuleKindEnum } from '@/interfaces';

const option = z.object({ label: z.string(), value: z.string() });

const days = (min: number, max: number) =>
  z
    .number({ error: 'Enter a number of days.' })
    .int('Use whole days.')
    .min(min, `At least ${min}.`)
    .max(max, `At most ${max}.`);

// --- country ----------------------------------------------------------------------------------------------

export const countrySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'Two letters, the ISO 3166-1 code: US for the United States.'),
  name: z.string().trim().min(1, "Enter the country's name.").max(80, 'At most 80 characters.'),
});
export type CountryForm = z.infer<typeof countrySchema>;

// --- version parameters -----------------------------------------------------------------------------------

export const parametersSchema = z.object({
  leadTimeDays: days(1, 365),
  domesticLeadTimeDays: days(1, 365),
  quarantineMinDays: days(0, 365),
  arrivalBufferDays: days(0, 365),
});
export type ParametersForm = z.infer<typeof parametersSchema>;

// --- document rules ---------------------------------------------------------------------------------------

const ruleShape = {
  ruleKind: option,
  minDays: z.number().int('Use whole days.').min(0, "Days can't be negative.").nullable(),
  maxDays: z.number().int('Use whole days.').min(0, "Days can't be negative.").nullable(),
  mandatory: z.boolean(),
  description: z.string().max(500, 'At most 500 characters.'),
};

/** The days a rule needs follow its shape, as the server checks them. */
const refineDays = (
  v: { ruleKind: { value: string }; minDays: number | null; maxDays: number | null },
  ctx: z.RefinementCtx,
) => {
  const kind = v.ruleKind.value;
  const needsMax = kind !== RegulationRuleKindEnum.PRESENCE_ONLY;
  if (needsMax && v.maxDays == null)
    ctx.addIssue({ code: 'custom', path: ['maxDays'], message: 'Enter the days.' });
  if (
    (kind === RegulationRuleKindEnum.WINDOW_BEFORE_DEPARTURE ||
      kind === RegulationRuleKindEnum.BOOSTER_WINDOW) &&
    v.maxDays === 0
  )
    ctx.addIssue({ code: 'custom', path: ['maxDays'], message: 'At least 1 day.' });
  if (
    kind === RegulationRuleKindEnum.BOOSTER_WINDOW &&
    v.minDays != null &&
    v.maxDays != null &&
    v.minDays > v.maxDays
  )
    ctx.addIssue({
      code: 'custom',
      path: ['minDays'],
      message: "The fewest days can't be more than the most.",
    });
};

export const ruleSchema = z.object(ruleShape).superRefine(refineDays);
export type RuleFormValues = z.infer<typeof ruleSchema>;

export const addRuleSchema = z
  .object({
    ...ruleShape,
    documentType: option.nullable().refine((v) => v !== null, 'Choose a document.'),
  })
  .superRefine(refineDays);
export type AddRuleForm = z.infer<typeof addRuleSchema>;
