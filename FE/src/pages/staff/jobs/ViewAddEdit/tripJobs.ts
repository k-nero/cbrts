import type { TripJob } from '@/interfaces';

/** "2 Dec" for a date or an instant. */
export const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';

/** The departure a job allows: its date, and how far it may move. */
export const allowedDays = (j: TripJob) =>
  j.departureDate
    ? j.dateFlexDays > 0
      ? `leaves ${day(j.departureDate)} ± ${j.dateFlexDays} days`
      : `leaves ${day(j.departureDate)}`
    : 'no departure date';
