import { z } from 'zod';

/** An option for handling an incident (US-F5-02): cost in the job's currency, delay in minutes. */
export const optionSchema = z
  .object({
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
    /** How horses leave the moving trip, if they do (US-F5-06). */
    leavingKind: z.object({ label: z.string(), value: z.string() }).nullable(),
    horseIds: z.array(z.string()),
    leavingPlace: z.string().trim().max(200, 'At most 200 characters.'),
    vehicle: z.object({ label: z.string(), value: z.string() }).nullable(),
    customerPays: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const kind = v.leavingKind?.value;
    if ((kind === 'UNLOAD' || kind === 'LEAVE_IN_CARE') && !v.leavingPlace)
      ctx.addIssue({ code: 'custom', path: ['leavingPlace'], message: 'Say where the horses go.' });
    if (kind === 'SECOND_VEHICLE' && !v.vehicle)
      ctx.addIssue({ code: 'custom', path: ['vehicle'], message: 'Choose the second vehicle.' });
  });
export type OptionForm = z.infer<typeof optionSchema>;

/** Proposing an option: why this one, for the manager. */
export const proposeSchema = z.object({
  note: z.string().trim().max(1000, 'At most 1000 characters.'),
});
export type ProposeForm = z.infer<typeof proposeSchema>;

/** The manager's decision (US-F5-03): the customer's message is required and sent as written. */
export const decideSchema = z.object({
  customerMessage: z
    .string()
    .trim()
    .min(1, 'Write what the customer is told; it is sent as written.')
    .max(1000, 'At most 1000 characters.'),
  note: z.string().trim().max(1000, 'At most 1000 characters.'),
  chargeCustomer: z.boolean(),
});
export type DecideForm = z.infer<typeof decideSchema>;

/** Sending a proposal back: why, for whoever proposed it. */
export const returnSchema = z.object({
  reason: z.string().trim().min(1, 'Say why, so another option can be proposed.').max(1000),
});
export type ReturnForm = z.infer<typeof returnSchema>;
