/** What happened (BE NotificationKind). The kind decides the tone and the word the bell shows. */
export const NotificationKindEnum = {
  REQUEST_INFO_REQUIRED: 'REQUEST_INFO_REQUIRED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
  REQUEST_REJECTED: 'REQUEST_REJECTED',
  REQUEST_APPROVED: 'REQUEST_APPROVED',
  QUOTATION_ISSUED: 'QUOTATION_ISSUED',
  QUOTATION_EXPIRING: 'QUOTATION_EXPIRING',
  QUOTATION_EXPIRED: 'QUOTATION_EXPIRED',
  QUOTATION_ACCEPTED: 'QUOTATION_ACCEPTED',
  QUOTATION_DECLINED: 'QUOTATION_DECLINED',
  JOB_ASSIGNED: 'JOB_ASSIGNED',
  AUTHORITY_INFO_REQUIRED: 'AUTHORITY_INFO_REQUIRED',
  DOSSIER_BLOCKED: 'DOSSIER_BLOCKED',
  DOSSIER_REFUSED: 'DOSSIER_REFUSED',
  DOSSIER_LATE: 'DOSSIER_LATE',
  DOCUMENTS_DUE: 'DOCUMENTS_DUE',
  TRIP_RELEASED: 'TRIP_RELEASED',
  TRIP_HELD: 'TRIP_HELD',
  TRIP_SHARED: 'TRIP_SHARED',
  TRIP_TIMES_CHANGED: 'TRIP_TIMES_CHANGED',
  JOB_REPLANNED: 'JOB_REPLANNED',
  INCIDENT_RAISED: 'INCIDENT_RAISED',
  INCIDENT_PROPOSAL: 'INCIDENT_PROPOSAL',
  INCIDENT_DECIDED: 'INCIDENT_DECIDED',
  INCIDENT_RETURNED: 'INCIDENT_RETURNED',
  INCIDENT_UPDATE: 'INCIDENT_UPDATE',
  DELAY_ALERT: 'DELAY_ALERT',
  INCIDENT_RESOLVED: 'INCIDENT_RESOLVED',
} as const;
export type NotificationKind = (typeof NotificationKindEnum)[keyof typeof NotificationKindEnum];

export const NotificationToneEnum = {
  OK: 'OK',
  WARN: 'WARN',
  BAD: 'BAD',
  INFO: 'INFO',
  NEUTRAL: 'NEUTRAL',
} as const;
export type NotificationTone = (typeof NotificationToneEnum)[keyof typeof NotificationToneEnum];

/** One row of the notification centre (BE NotificationResponse). */
export interface Notification {
  id: string;
  kind: NotificationKind;
  tone: NotificationTone;
  title: string;
  body: string | null;
  entityType: string;
  /** The record's code, shown in mono: REQ-2026-0031, CBRT-2026-014. */
  entityCode: string;
  /** The page the signed-in user opens the record on. */
  linkPath: string;
  createdAt: string;
  readAt: string | null;
}
