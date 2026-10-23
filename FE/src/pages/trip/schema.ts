import { z } from 'zod';

import { HorseConditionEnum, TripRecordKindEnum } from '@/interfaces';

export const checkpointFormSchema = z.object({
  stopId: z.string().optional(),
  kind: z.enum([
    TripRecordKindEnum.LOADED,
    TripRecordKindEnum.DEPARTED,
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.CLEARED_BORDER,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.ACCEPTED_BY_AIRLINE,
    TripRecordKindEnum.FLIGHT_DEPARTED,
    TripRecordKindEnum.FLIGHT_LANDED,
    TripRecordKindEnum.RELEASED_BY_AIRLINE,
    TripRecordKindEnum.DELIVERED,
    TripRecordKindEnum.HANDED_OVER,
    TripRecordKindEnum.NOTE,
  ]),
  occurredAt: z.string().min(1, 'Recorded time is required.'),
  text: z.string().max(500, 'At most 500 characters.').optional(),
  receiverName: z.string().max(120, 'At most 120 characters.').optional(),
});

export type CheckpointFormData = z.infer<typeof checkpointFormSchema>;

export const horseObservationSchema = z.object({
  checked: z.boolean(),
  condition: z
    .enum([
      HorseConditionEnum.STABLE,
      HorseConditionEnum.OFF_FEED,
      HorseConditionEnum.STRESSED,
      HorseConditionEnum.CLIMATE_CHANGE,
    ])
    .nullable(),
  drinking: z.boolean().nullable(),
  eating: z.boolean().nullable(),
  note: z.string().max(500, 'At most 500 characters.').optional(),
});

export type HorseObservationData = z.infer<typeof horseObservationSchema>;
