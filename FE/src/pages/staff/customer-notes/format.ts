import dayjs from 'dayjs';

import type { Tone } from '@/components/ui';
import type { CustomerNote } from '@/interfaces';

export const TOPIC_LABEL: Record<CustomerNote['topic'], string> = {
  DOCUMENTS: 'Documents',
  DATES_PRICE_CHANGES: 'Dates, price or changes',
  TRIP: 'The trip',
  OTHER: 'Something else',
};

/** "Thu 22 Oct, 14:05". */
export const noteTime = (iso?: string | null) => (iso ? dayjs(iso).format('ddd D MMM, HH:mm') : '');

/** A note whose reply is due today or already late. */
export const isDue = (note: CustomerNote) => note.dueToday || note.overdue;

/** The reply-due line of a note in the list (DESIGN.md: warn tone when due today). */
export const replyDue = (note: CustomerNote): { text: string; tone: Tone } => {
  if (note.status === 'ANSWERED') return { text: 'Answered', tone: 'ok' };
  if (note.overdue) return { text: 'Reply overdue', tone: 'bad' };
  if (note.dueToday) return { text: 'Reply today', tone: 'warn' };
  if (note.replyDueAt)
    return { text: `Reply by ${dayjs(note.replyDueAt).format('D MMM')}`, tone: 'neutral' };
  return { text: 'Open', tone: 'neutral' };
};
