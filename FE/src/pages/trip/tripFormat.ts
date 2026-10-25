import type { TripRecord, TripRecordKind } from '@/interfaces';
import { RouteStopKindEnum, TripRecordKindEnum } from '@/interfaces';

export const eventLabels: Record<TripRecordKind, string> = {
  [TripRecordKindEnum.LOADED]: 'Loaded',
  [TripRecordKindEnum.DEPARTED]: 'Departed',
  [TripRecordKindEnum.ARRIVED_AT_STOP]: 'Arrived at checkpoint',
  [TripRecordKindEnum.CLEARED_BORDER]: 'Customs cleared',
  [TripRecordKindEnum.HELD]: 'On hold',
  [TripRecordKindEnum.LEFT_STOP]: 'Left checkpoint',
  [TripRecordKindEnum.CONDITION_CHECK]: 'Condition check',
  [TripRecordKindEnum.ACCEPTED_BY_AIRLINE]: 'Accepted by airline',
  [TripRecordKindEnum.FLIGHT_DEPARTED]: 'Flight departed',
  [TripRecordKindEnum.FLIGHT_LANDED]: 'Flight landed',
  [TripRecordKindEnum.RELEASED_BY_AIRLINE]: 'Released by airline',
  [TripRecordKindEnum.DELIVERED]: 'Delivered',
  [TripRecordKindEnum.HANDED_OVER]: 'Handed over',
  [TripRecordKindEnum.NOTE]: 'Update',
};

/**
 * A record's label at its stop: the delivery at a transfer hands the horses on to the next trip of
 * their journey (US-F3-16), it doesn't deliver them.
 */
export const recordLabel = (kind: TripRecordKind, stopKind?: string) =>
  kind === TripRecordKindEnum.DELIVERED && stopKind === RouteStopKindEnum.TRANSFER
    ? 'Handed on to the next trip'
    : eventLabels[kind];

const timeOptions = { dateStyle: 'medium', timeStyle: 'short' } as const;

export const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('en-GB', timeOptions) : 'Not recorded';

/**
 * Who recorded an entry and from where (US-F4-04): the cab, or the office on the escort's behalf.
 * Null when the record doesn't say who.
 */
export const recordedByLine = (
  recordedBy: string | null,
  channel: TripRecord['channel'] | null,
): string | null => {
  if (!recordedBy) return null;
  if (channel === 'WEB') return `Recorded by ${recordedBy} from the office, for the escort`;
  if (channel === 'CAB_TABLET') return `Recorded by ${recordedBy} in the cab`;
  return `Recorded by ${recordedBy}`;
};

/** Status in words (DESIGN.md: a tone plus a word, never a raw enum). */
export const sentence = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
