import dayjs, { type Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/** Times are shown in Indochina Time (UTC+7) wherever the reader is (database-design.md, Conventions). */
const ICT_MINUTES = 7 * 60;

export const ict = (iso: string): Dayjs => dayjs(iso).utcOffset(ICT_MINUTES);

/** "18 Oct 2026". */
export const formatDate = (iso: string) => ict(iso).format('D MMM YYYY');
/** "18 Oct, 12:30". */
export const formatDayTime = (iso: string) => ict(iso).format('D MMM, HH:mm');
/** "09:30". */
export const formatTime = (iso: string) => ict(iso).format('HH:mm');

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

/** Whole calendar days from `now` to `due` in ICT; negative when it has passed. */
export const daysUntil = (due: string, now: string) =>
  ict(due).startOf('day').diff(ict(now).startOf('day'), 'day');

/** "4 days", "1 day", or under a day "4 h" / "49 min". */
export const spanUntil = (due: string, now: string) => {
  const minutes = ict(due).diff(ict(now), 'minute');
  if (minutes < 60) return `${Math.max(minutes, 0)} min`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h`;
  return plural(Math.abs(daysUntil(due, now)), 'day');
};

/**
 * The first line of an owed item's deadline (DESIGN.md, Two-Line Deadline Rule):
 * "Overdue by 1 day", "Due today", "Due in 4 days".
 */
export const dueLeft = (due: string, now: string) => {
  const days = daysUntil(due, now);
  if (days < 0) return `Overdue by ${plural(-days, 'day')}`;
  if (days === 0) return 'Due today';
  return `Due in ${plural(days, 'day')}`;
};
