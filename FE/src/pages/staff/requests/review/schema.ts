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

/** Approving into a job (US-F1-07): both members of the team are chosen. */
const choice = (message: string) =>
  z.object({ label: z.string(), value: z.string() }, { error: message });

export const approveSchema = z.object({
  transportSpecialist: choice('Choose the transport specialist.'),
  coordinator: choice('Choose the fleet & route coordinator.'),
});
export type ApproveForm = z.infer<typeof approveSchema>;

/** Rejecting (BR-F1-04): a reason the customer reads, of at most 500 characters. */
export const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Say why the request is rejected; the customer reads it.')
    .max(500, 'Keep the reason to 500 characters.'),
});
export type RejectForm = z.infer<typeof rejectSchema>;
