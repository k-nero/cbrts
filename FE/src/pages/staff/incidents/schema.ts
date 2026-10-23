import { z } from 'zod';

/** An option for handling an incident (US-F5-02): cost in the job's currency, delay in minutes. */
export const optionSchema = z.object({
  title: z.string().trim().min(1, 'Say what the option is.').max(160, 'At most 160 characters.'),
  description: z.string().trim().max(1000, 'At most 1000 characters.'),
  extraCost: z
    .number({ error: 'Enter the extra cost, or 0.' })
    .min(0, "It can't be negative.")
    .max(999_999_999_999, 'That is more than the job could cost.'),
  delayMinutes: z
    .number({ error: 'Enter the delay in minutes, or 0.' })
    .int('Whole minutes.')
    .min(0, "It can't be negative.")
    .max(7 * 24 * 60, 'At most a week.'),
  changesRoute: z.boolean(),
});
export type OptionForm = z.infer<typeof optionSchema>;

/** Proposing an option: why this one, for the manager. */
export const proposeSchema = z.object({
  note: z.string().trim().max(1000, 'At most 1000 characters.'),
});
export type ProposeForm = z.infer<typeof proposeSchema>;
