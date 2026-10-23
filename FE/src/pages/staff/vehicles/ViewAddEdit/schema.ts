import dayjs from 'dayjs';
import { z } from 'zod';

const option = (message: string) =>
  z.object({ label: z.string(), value: z.string() }, message).nullable();

/** Add vehicle: the code, kind and payload, and how many stalls it starts with. */
export const vehicleSchema = z
  .object({
    code: z.string().trim().min(1, 'Enter the vehicle code, e.g. TX-550.').max(20),
    kind: option('Pick trailer or truck.'),
    payloadKg: z.number('Enter the payload in kg.').int().min(500, 'At least 500 kg.').max(40000),
    stallCount: option('Pick how many stalls.'),
  })
  .superRefine((v, ctx) => {
    if (v.kind === null)
      ctx.addIssue({ code: 'custom', path: ['kind'], message: 'Pick trailer or truck.' });
    if (v.stallCount === null)
      ctx.addIssue({ code: 'custom', path: ['stallCount'], message: 'Pick how many stalls.' });
  });
export type VehicleForm = z.infer<typeof vehicleSchema>;

/** Book slot: what the vehicle is held for, and from when to when. */
export const bookingSchema = z
  .object({
    kind: option('Pick what the slot is for.'),
    startsAt: z.string().min(1, 'Pick when it starts.'),
    endsAt: z.string().min(1, 'Pick when it ends.'),
  })
  .superRefine((v, ctx) => {
    if (v.kind === null)
      ctx.addIssue({ code: 'custom', path: ['kind'], message: 'Pick what the slot is for.' });
    if (v.startsAt && v.endsAt && !dayjs(v.endsAt).isAfter(dayjs(v.startsAt)))
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End after it starts.' });
  });
export type BookingForm = z.infer<typeof bookingSchema>;
