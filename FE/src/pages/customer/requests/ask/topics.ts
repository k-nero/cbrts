import dayjs, { type Dayjs } from 'dayjs';

import type { NoteTopic, RoleName } from '@/interfaces';

/** The topics a customer picks from, in the frame's order, and the role each one goes to (BE NoteTopic). */
export const ASK_TOPICS: {
  topic: NoteTopic;
  title: string;
  description: string;
  role: RoleName;
  /** "the transport specialist": who answers, inside a sentence. */
  who: string;
}[] = [
  {
    topic: 'DOCUMENTS',
    title: 'Documents',
    description: 'Uploads, checks and deadlines.',
    role: 'TRANSPORT_SPECIALIST',
    who: 'the transport specialist',
  },
  {
    topic: 'DATES_PRICE_CHANGES',
    title: 'Dates, price or changes',
    description: 'Quotations, dates, adding or removing horses.',
    role: 'LOGISTICS_MANAGER',
    who: 'the logistics manager',
  },
  {
    topic: 'TRIP',
    title: 'The trip',
    description: 'Loading, the route and the day itself.',
    role: 'FLEET_COORDINATOR',
    who: 'the fleet & route coordinator',
  },
];

/** Who answers a topic, inside a sentence; anything else goes to the logistics manager. */
export const whoAnswers = (topic: NoteTopic) =>
  ASK_TOPICS.find((t) => t.topic === topic)?.who ?? 'the logistics manager';

/**
 * Within 1 business day: the next weekday (BE NoteService.replyDueAt). Sent on Saturday 26 Sep, due by Monday 28 Sep.
 */
export const replyDueDay = (sentAt: Dayjs = dayjs()) => {
  let day = sentAt.add(1, 'day');
  while (day.day() === 0 || day.day() === 6) day = day.add(1, 'day');
  return day;
};
