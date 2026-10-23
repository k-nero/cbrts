import { z } from 'zod';

/** Declining the quotation (US-F1-06): the reason is optional and goes to the logistics manager. */
export const declineSchema = z.object({
  reason: z.string().trim().max(500, 'At most 500 characters.'),
});
export type DeclineForm = z.infer<typeof declineSchema>;
