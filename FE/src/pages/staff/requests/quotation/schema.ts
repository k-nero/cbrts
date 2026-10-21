import { z } from 'zod';

const option = z.object({ label: z.string(), value: z.string() });

/** Quotation money and quantities keep two decimals (numeric(…, 2)), as the server checks. */
const TWO_DECIMALS = 'Use at most 2 decimals.';
const twoDecimals = (v: number) => Number.isInteger(Math.round(v * 100 * 1e6) / 1e6);

const amount = z
  .number({ error: 'Enter an amount.' })
  .min(0, "An amount can't be negative.")
  .refine(twoDecimals, TWO_DECIMALS);

/** A line's new amount and why (US-Q-02). */
export const overrideSchema = z.object({
  amount,
  reason: z
    .string()
    .trim()
    .min(1, 'Say why the line is overridden.')
    .max(300, 'At most 300 characters.'),
});
export type OverrideForm = z.infer<typeof overrideSchema>;

/** A line the manager adds (US-F1-05): an estimated one says why it may vary. */
export const manualLineSchema = z
  .object({
    group: option,
    description: z.string().trim().min(1, 'Describe the line.').max(160, 'At most 160 characters.'),
    quantity: z
      .number({ error: 'Enter a quantity.' })
      .positive('Enter more than zero.')
      .refine(twoDecimals, TWO_DECIMALS),
    unitRate: amount,
    certainty: option,
    estimateNote: z.string().max(300, 'At most 300 characters.'),
    reason: z
      .string()
      .trim()
      .min(1, "Say what the catalog doesn't know.")
      .max(300, 'At most 300 characters.'),
  })
  .superRefine((v, ctx) => {
    if (v.certainty.value === 'ESTIMATED' && !v.estimateNote.trim())
      ctx.addIssue({
        code: 'custom',
        path: ['estimateNote'],
        message: 'Say why this line may vary.',
      });
  });
export type ManualLineForm = z.infer<typeof manualLineSchema>;

/**
 * Issuing a version: from version 2 on, what changed since the one it replaces (its superseded reason).
 * versionNo isn't rendered; it carries which version is being issued.
 */
export const issueSchema = z
  .object({
    versionNo: z.number(),
    changeNote: z.string().max(300, 'At most 300 characters.'),
  })
  .superRefine((v, ctx) => {
    if (v.versionNo > 1 && !v.changeNote.trim())
      ctx.addIssue({
        code: 'custom',
        path: ['changeNote'],
        message: `Say what changed since version ${v.versionNo - 1}.`,
      });
  });
export type IssueForm = z.infer<typeof issueSchema>;
