import { z } from 'zod';

/** One job's consignment on the trip's flight (US-F3-15). */
export const consignmentSchema = z.object({
  airWaybill: z.string().trim().max(20, 'At most 20 characters.'),
  stallPositions: z
    .number({ error: 'Enter the stall positions.' })
    .int('Whole positions.')
    .min(1, 'At least one position.')
    .max(99, 'At most 99.'),
  serviceClass: z.object({ label: z.string(), value: z.string() }).nullable(),
});
export type ConsignmentForm = z.infer<typeof consignmentSchema>;

/** The next trip of a job's journey (US-F3-16): the catalog corridor it travels on. */
export const continueTripSchema = z.object({
  corridor: z.object({ label: z.string(), value: z.string() }, { error: 'Choose the corridor.' }),
});
export type ContinueTripForm = z.infer<typeof continueTripSchema>;
