import dayjs from 'dayjs';
import { z } from 'zod';

const option = (message: string) =>
  z.object({ label: z.string(), value: z.string() }, message).nullable();

const options = z.array(z.object({ label: z.string(), value: z.string() })).nullable();

/** Where a vehicle is based, the countries it holds permits for and the corridors it works (US-F7-01). */
const permitFields = {
  homeCountry: option('Pick the country the vehicle is based in.'),
  permittedCountries: options,
  operatingCorridors: options,
};

const checkPermits = (
  v: {
    homeCountry: { value: string } | null;
    permittedCountries: { value: string }[] | null;
    operatingCorridors: unknown[] | null;
  },
  ctx: z.RefinementCtx,
) => {
  if (v.homeCountry === null)
    ctx.addIssue({
      code: 'custom',
      path: ['homeCountry'],
      message: 'Pick the country the vehicle is based in.',
    });
  if (v.homeCountry && v.permittedCountries?.some((c) => c.value === v.homeCountry?.value))
    ctx.addIssue({
      code: 'custom',
      path: ['permittedCountries'],
      message: 'The home country needs no permit; take it out of this list.',
    });
  if (!v.operatingCorridors?.length)
    ctx.addIssue({
      code: 'custom',
      path: ['operatingCorridors'],
      message: 'Pick at least one corridor the vehicle works.',
    });
};

/** Edit countries and corridors: the vehicle's home country, permits and operating corridors. */
export const permitsSchema = z.object(permitFields).superRefine(checkPermits);
export type PermitsForm = z.infer<typeof permitsSchema>;

/** Add vehicle: the code, kind and payload, how many stalls it starts with, and its countries. */
export const vehicleSchema = z
  .object({
    code: z.string().trim().min(1, 'Enter the vehicle code, e.g. TX-550.').max(20),
    kind: option('Pick trailer or truck.'),
    payloadKg: z.number('Enter the payload in kg.').int().min(500, 'At least 500 kg.').max(40000),
    stallCount: option('Pick how many stalls.'),
    ...permitFields,
  })
  .superRefine((v, ctx) => {
    checkPermits(v, ctx);
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

/** Expected back: the date the coordinator expects the vehicle to be available again (US-F7-02). */
export const availableOnSchema = z.object({
  availableOn: z
    .string('Pick the date it is expected back.')
    .min(1, 'Pick the date it is expected back.'),
});
export type AvailableOnForm = z.infer<typeof availableOnSchema>;
