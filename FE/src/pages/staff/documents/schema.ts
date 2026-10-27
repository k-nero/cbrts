import { z } from 'zod';

/** Moving a job onto a newer catalog version: the reason goes to the audit log. */
export const catalogMoveSchema = z.object({
  reason: z.string().trim().min(1, 'Say why the job moves to the new version.').max(500),
});

export type CatalogMoveForm = z.infer<typeof catalogMoveSchema>;
