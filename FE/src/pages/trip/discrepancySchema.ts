import { z } from 'zod';

/** What went wrong at the handover, in the customer's words (US-F6-02). */
export const discrepancySchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Describe what went wrong, so the right person can act on it.')
    .max(1000, 'At most 1000 characters.'),
});
export type DiscrepancyForm = z.infer<typeof discrepancySchema>;
