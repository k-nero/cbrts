import { z } from 'zod';

/** A note to the person who answers one part of the move (US-00-08). */
export const askSchema = z.object({
  topic: z.enum(['DOCUMENTS', 'DATES_PRICE_CHANGES', 'TRIP', 'OTHER']),
  item: z.object({ label: z.string(), value: z.string() }).nullable(),
  body: z
    .string()
    .trim()
    .min(1, 'Write your note.')
    .max(2000, 'Keep the note under 2,000 characters.'),
  file: z.instanceof(File).nullable(),
});

export type AskForm = z.infer<typeof askSchema>;

export const EMPTY_ASK: AskForm = { topic: 'DOCUMENTS', item: null, body: '', file: null };
