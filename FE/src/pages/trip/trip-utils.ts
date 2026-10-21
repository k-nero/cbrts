import { useEffect, useState } from 'react';
import { HorseConditionEnum, TripRecordKindEnum, TripStatusEnum } from '@/interfaces';
import type { HorseCondition, TripRecordKind, TripStatus, TripView } from '@/interfaces';
import { apiErrorMessage } from '@/lib/utils';

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
export const coordinatorKindsByStatus: Record<TripStatus, TripRecordKind[]> = {
  [TripStatusEnum.NOT_STARTED]: [
    TripRecordKindEnum.LOADED,
    TripRecordKindEnum.DEPARTED,
    TripRecordKindEnum.FLIGHT_DEPARTED,
    TripRecordKindEnum.NOTE,
  ],
  [TripStatusEnum.DEPARTED]: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.CLEARED_BORDER,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.ACCEPTED_BY_AIRLINE,
    TripRecordKindEnum.FLIGHT_DEPARTED,
    TripRecordKindEnum.FLIGHT_LANDED,
    TripRecordKindEnum.RELEASED_BY_AIRLINE,
    TripRecordKindEnum.NOTE,
  ],
  [TripStatusEnum.HELD]: [
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.CLEARED_BORDER,
    TripRecordKindEnum.NOTE,
  ],
  [TripStatusEnum.ARRIVED]: [TripRecordKindEnum.DELIVERED, TripRecordKindEnum.NOTE],
  [TripStatusEnum.DELIVERED]: [TripRecordKindEnum.HANDED_OVER, TripRecordKindEnum.NOTE],
};
export const conditions: HorseCondition[] = [
  HorseConditionEnum.STABLE,
  HorseConditionEnum.OFF_FEED,
  HorseConditionEnum.STRESSED,
  HorseConditionEnum.CLIMATE_CHANGE,
];
export const timeOptions = { dateStyle: 'medium', timeStyle: 'short' } as const;
export const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('en-GB', timeOptions) : 'Not recorded';
export const formatClock = (value: string | null) =>
  value ? new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
export const datetimeLocal = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
export const useNow = (intervalMs = 30_000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
};
export const errorMessage = (error: unknown) =>
  apiErrorMessage(error, 'The trip update could not be saved.');
/** Status in words (DESIGN.md: a tone plus a word, never a raw enum). */
export const sentence = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
export const statusTone = (status: string) =>
  status === TripStatusEnum.DELIVERED ? 'ok' : status === TripStatusEnum.HELD ? 'bad' : 'info';
export const kindTone = (kind: TripRecordKind) =>
  kind === TripRecordKindEnum.HELD
    ? 'bad'
    : kind === TripRecordKindEnum.CLEARED_BORDER || kind === TripRecordKindEnum.DELIVERED
      ? 'ok'
      : 'info';
export const conditionTone = (condition: HorseCondition | null | undefined) =>
  condition === HorseConditionEnum.CONCERN
    ? 'bad'
    : condition === HorseConditionEnum.WATCH ||
        condition === HorseConditionEnum.OFF_FEED ||
        condition === HorseConditionEnum.STRESSED ||
        condition === HorseConditionEnum.CLIMATE_CHANGE
      ? 'warn'
      : condition === HorseConditionEnum.STABLE || condition === HorseConditionEnum.SOUND
        ? 'ok'
        : 'neutral';
export const isStable = (condition: HorseCondition) =>
  condition === HorseConditionEnum.STABLE || condition === HorseConditionEnum.SOUND;
export const stopKindLabel = (kind: string) =>
  kind === 'PICKUP'
    ? 'Pickup'
    : kind === 'BORDER'
      ? 'Border'
      : kind === 'WELFARE' || kind === 'QUARANTINE'
        ? 'Welfare stop'
        : kind === 'DELIVERY' || kind === 'AIRPORT_IN'
          ? 'Delivery'
          : kind.replaceAll('_', ' ').toLowerCase();
export const lastRecord = (trip: TripView) =>
  [...trip.records].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
export const lastCheckpointRecord = (trip: TripView) =>
  [...trip.records]
    .filter((record) => record.routeStopId !== null)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
export const lastConditionRecord = (trip: TripView) =>
  [...trip.records]
    .filter(
      (record) => record.kind === TripRecordKindEnum.CONDITION_CHECK && record.conditions.length,
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
export const minutesBetween = (planned: string | null, recorded: string | null) => {
  if (!planned || !recorded) return null;
  return Math.round((new Date(recorded).getTime() - new Date(planned).getTime()) / 60_000);
};
export const durationLabel = (minutes: number) => {
  const abs = Math.abs(minutes);
  const value =
    abs >= 60 ? `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ''}` : `${abs} min`;
  return minutes === 0 ? 'On time' : `${minutes > 0 ? '+' : '−'}${value}`;
};
export const elapsedLabel = (minutes: number) => {
  const abs = Math.max(0, minutes);
  return `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ''}`;
};

export const escortEventsByStop: Record<string, TripRecordKind[]> = {
  PICKUP: [TripRecordKindEnum.LOADED, TripRecordKindEnum.DEPARTED, TripRecordKindEnum.NOTE],
  BORDER: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.CLEARED_BORDER,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.NOTE,
  ],
  WELFARE: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.NOTE,
  ],
  QUARANTINE: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.LEFT_STOP,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.NOTE,
  ],
  AIRPORT_OUT: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.ACCEPTED_BY_AIRLINE,
    TripRecordKindEnum.FLIGHT_DEPARTED,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.NOTE,
  ],
  AIRPORT_IN: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.FLIGHT_LANDED,
    TripRecordKindEnum.RELEASED_BY_AIRLINE,
    TripRecordKindEnum.HELD,
    TripRecordKindEnum.NOTE,
  ],
  DELIVERY: [
    TripRecordKindEnum.ARRIVED_AT_STOP,
    TripRecordKindEnum.DELIVERED,
    TripRecordKindEnum.NOTE,
  ],
};
