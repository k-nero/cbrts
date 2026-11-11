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

/**
 * Closing an incident (US-F5-05): how it ended and a closing note, both required. Compensating the customer
 * (US-F5-07) needs an amount above 0 and the reason they read on the invoice.
 */
export const resolveSchema = z
  .object({
    resolution: z.string().trim().min(1, 'Say how it ended.').max(300, 'At most 300 characters.'),
    closingNote: z
      .string()
      .trim()
      .min(1, 'Write a closing note for the record.')
      .max(1000, 'At most 1000 characters.'),
    compensate: z.boolean(),
    compensationAmount: z.number().nullable(),
    compensationReason: z.string().trim().max(300, 'At most 300 characters.'),
  })
  .superRefine((v, ctx) => {
    if (!v.compensate) return;
    if (v.compensationAmount == null || v.compensationAmount <= 0)
      ctx.addIssue({
        code: 'custom',
        path: ['compensationAmount'],
        message: 'Enter an amount above 0.',
      });
    if (!v.compensationReason)
      ctx.addIssue({
        code: 'custom',
        path: ['compensationReason'],
        message: 'Say why; the customer reads it on the invoice.',
      });
  });
export type ResolveForm = z.infer<typeof resolveSchema>;

/** Filing an insurance claim (US-F5-08): with whom, their reference and the amount claimed. */
export const claimSchema = z.object({
  insurer: z.string().trim().min(1, 'Name the insurer.').max(120, 'At most 120 characters.'),
  reference: z
    .string()
    .trim()
    .min(1, "Enter the insurer's claim reference.")
    .max(60, 'At most 60 characters.'),
  claimedAmount: z
    .number({ error: 'Enter the amount claimed.' })
    .positive('Enter an amount above 0.')
    .max(999_999_999_999, 'That is more than the job could cost.'),
  note: z.string().trim().max(500, 'At most 500 characters.'),
});
export type ClaimForm = z.infer<typeof claimSchema>;

/** The insurer's answer (US-F5-08): settled with what they paid, or declined with the reason. */
export const claimOutcomeSchema = z
  .object({
    outcome: z.enum(['SETTLED', 'DECLINED']),
    settledAmount: z.number().nullable(),
    declineReason: z.string().trim().max(300, 'At most 300 characters.'),
  })
  .superRefine((v, ctx) => {
    if (v.outcome === 'SETTLED' && (v.settledAmount == null || v.settledAmount <= 0))
      ctx.addIssue({
        code: 'custom',
        path: ['settledAmount'],
        message: 'Enter what the insurer paid.',
      });
    if (v.outcome === 'DECLINED' && !v.declineReason)
      ctx.addIssue({
        code: 'custom',
        path: ['declineReason'],
        message: 'Say why it was declined.',
      });
  });
export type ClaimOutcomeForm = z.infer<typeof claimOutcomeSchema>;
