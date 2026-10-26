import { z } from 'zod';

const option = (message: string) =>
  z.object({ label: z.string(), value: z.string() }, message).nullable();

const pick = (ctx: z.RefinementCtx, path: string, message: string) =>
  ctx.addIssue({ code: 'custom', path: [path], message });

/** New route: its code, mode, two cities, and by road the crossings in order from the origin. */
export const corridorSchema = z
  .object({
    code: z.string().trim().min(1, 'Enter the route code, e.g. RD HCM → PNH.').max(40),
    mode: option('Pick road or air.'),
    originCity: option('Pick the city it starts in.'),
    destinationCity: option('Pick the city it ends in.'),
    crossings: z.array(z.object({ label: z.string(), value: z.string() })).nullable(),
    distanceKm: z.number().int().positive('Enter a distance above 0 km.').nullable(),
    dateFlexDays: z.number('Enter 0 to 7 days.').int().min(0, 'At least 0.').max(7, 'At most 7.'),
  })
  .superRefine((v, ctx) => {
    if (v.mode === null) pick(ctx, 'mode', 'Pick road or air.');
    if (v.originCity === null) pick(ctx, 'originCity', 'Pick the city it starts in.');
    if (v.destinationCity === null) pick(ctx, 'destinationCity', 'Pick the city it ends in.');
    if (v.originCity && v.destinationCity && v.originCity.value === v.destinationCity.value)
      pick(ctx, 'destinationCity', 'A route runs between two different cities.');
  });
export type CorridorForm = z.infer<typeof corridorSchema>;

/** Add place: a pickup, delivery or stop point in a city. */
export const placeSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter the place name.').max(160),
    kind: option('Pick what kind of place it is.'),
    city: z.string().trim().min(1, 'Enter the city.').max(80),
    country: option('Pick the country.'),
    address: z.string().max(300),
  })
  .superRefine((v, ctx) => {
    if (v.kind === null) pick(ctx, 'kind', 'Pick what kind of place it is.');
    if (v.country === null) pick(ctx, 'country', 'Pick the country.');
  });
export type PlaceForm = z.infer<typeof placeSchema>;

/** Add border crossing: its name and the two countries it joins. */
export const crossingSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter the crossing name, e.g. Mộc Bài – Bavet.').max(120),
    fromCountry: option('Pick the country it leaves.'),
    toCountry: option('Pick the country it enters.'),
    roadOnly: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.fromCountry === null) pick(ctx, 'fromCountry', 'Pick the country it leaves.');
    if (v.toCountry === null) pick(ctx, 'toCountry', 'Pick the country it enters.');
    if (v.fromCountry && v.toCountry && v.fromCountry.value === v.toCountry.value)
      pick(ctx, 'toCountry', 'A crossing joins two different countries.');
  });
export type CrossingForm = z.infer<typeof crossingSchema>;

/** Driving days: how many days the route takes to drive one way (US-F7-02). */
export const drivingDaysSchema = z.object({
  drivingDays: z
    .number('Enter 1 to 30 days.')
    .int('Whole days only.')
    .min(1, 'At least 1 day.')
    .max(30, 'At most 30 days.'),
});
export type DrivingDaysForm = z.infer<typeof drivingDaysSchema>;
