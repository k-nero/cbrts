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

/** The next trip of a job's journey (US-F3-21): the catalog corridor it runs from where the journey stands. */
export const addTripSchema = z.object({
  corridor: z.object({ label: z.string(), value: z.string() }, { error: 'Choose the corridor.' }),
});
export type AddTripForm = z.infer<typeof addTripSchema>;

/** The airline's flight for a flight trip of the journey (US-F3-21); local date-times in the form. */
export const flightSchema = z
  .object({
    airline: z.string().trim().min(1, 'Enter the airline.').max(80, 'At most 80 characters.'),
    flightNo: z
      .string()
      .trim()
      .min(1, 'Enter the flight number.')
      .max(12, 'At most 12 characters.'),
    aircraftType: z.string().trim().max(40, 'At most 40 characters.'),
    stallCapacity: z
      .number({ error: 'Enter the stall positions.' })
      .int('Whole positions.')
      .min(1, 'At least one position.')
      .nullable(),
    departs: z.string({ error: 'Enter when it takes off.' }).min(1, 'Enter when it takes off.'),
    arrives: z.string({ error: 'Enter when it lands.' }).min(1, 'Enter when it lands.'),
  })
  .refine((v) => v.arrives > v.departs, {
    path: ['arrives'],
    message: 'It lands after it takes off.',
  });
export type FlightForm = z.infer<typeof flightSchema>;
