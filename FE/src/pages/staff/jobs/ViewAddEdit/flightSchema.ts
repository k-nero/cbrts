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
