import { z } from 'zod';

/** A delay alert (US-F5-04): the reason, the job's new arrival in Indochina Time, and an optional note. */
export const delayAlertSchema = z.object({
  reason: z.enum(['TRAFFIC', 'WEATHER', 'BORDER_CONGESTION'], { error: 'Choose why it is late.' }),
  /** YYYY-MM-DDTHH:mm, in Indochina Time. */
  newEta: z.string({ error: 'Choose the new arrival.' }).min(1, 'Choose the new arrival.'),
  note: z.string().trim().max(500, 'At most 500 characters.'),
});
export type DelayAlertForm = z.infer<typeof delayAlertSchema>;

/** The form's value as the server takes it: the time the coordinator picked, in Indochina Time. */
export const etaInIct = (local: string) => `${local}:00+07:00`;
