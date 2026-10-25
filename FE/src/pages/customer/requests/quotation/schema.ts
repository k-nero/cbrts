import { z } from 'zod';

/** Declining the quotation (US-F1-06): the reason is optional and goes to the logistics manager. */
export const declineSchema = z.object({
  reason: z.string().trim().max(500, 'At most 500 characters.'),
});
export type DeclineForm = z.infer<typeof declineSchema>;

/** Asking for a re-quote (A4): what should change is optional and goes to the logistics manager. */
export const requoteSchema = z.object({
  note: z.string().trim().max(500, 'At most 500 characters.'),
});
export type RequoteForm = z.infer<typeof requoteSchema>;
