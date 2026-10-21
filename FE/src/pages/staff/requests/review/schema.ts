import { z } from 'zod';

import { NOTE_MAX } from '@/lib/utils';

/** The server's rule (spec §4.2): a note, counted after trimming, of at most 500 characters. */
export const noteSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, 'Write what the customer needs to add or change.')
    .max(NOTE_MAX, `Keep the note to ${NOTE_MAX} characters.`),
});
export type NoteForm = z.infer<typeof noteSchema>;
