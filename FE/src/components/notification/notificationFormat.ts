import type { Tone } from '@/components/ui';
import type { NotificationKind, NotificationTone } from '@/interfaces';

/** The design system's tone for a notification (BE NotificationKind.tone()). */
export const NOTIFICATION_TONE: Record<NotificationTone, Tone> = {
  OK: 'ok',
  WARN: 'warn',
  BAD: 'bad',
  INFO: 'info',
  NEUTRAL: 'neutral',
};

/** The word beside the tone, so a notification's state is never colour alone (DESIGN.md, Status). */
export const NOTIFICATION_KIND_LABEL: Record<NotificationKind, string> = {
  REQUEST_INFO_REQUIRED: 'Answer needed',
  REQUEST_CANCELLED: 'Cancelled',
  REQUEST_REJECTED: 'Rejected',
  REQUEST_APPROVED: 'Approved',
  QUOTATION_ISSUED: 'Quotation ready',
  QUOTATION_EXPIRING: 'Expires soon',
  QUOTATION_EXPIRED: 'Expired',
  QUOTATION_ACCEPTED: 'Accepted',
  QUOTATION_DECLINED: 'Declined',
  JOB_ASSIGNED: 'Assigned to you',
  AUTHORITY_INFO_REQUIRED: 'Information needed',
  DOSSIER_BLOCKED: 'Dossier blocked',
  DOSSIER_REFUSED: 'Refused',
  DOSSIER_LATE: 'Authority late',
  DOCUMENTS_DUE: 'Documents due',
  TRIP_RELEASED: 'Trip released',
  TRIP_HELD: 'Trip held',
  TRIP_SHARED: 'Shared trailer',
  TRIP_TIMES_CHANGED: 'New times',
  JOB_REPLANNED: 'Being replanned',
};

/** "Notifications, 3 unread": the bell says what its count counts. */
export const bellLabel = (count: number) =>
  count > 0 ? `Notifications, ${count} unread` : 'Notifications';
