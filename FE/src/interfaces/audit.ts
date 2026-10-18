/** Where an audit entry came from (audit_log.channel). */
export const AuditChannelEnum = {
  WEB: 'WEB',
  CAB_TABLET: 'CAB_TABLET',
  SYSTEM: 'SYSTEM',
} as const;
export type AuditChannel = (typeof AuditChannelEnum)[keyof typeof AuditChannelEnum];

export const AUDIT_CHANNEL_LABEL: Record<AuditChannel, string> = {
  WEB: 'Web',
  CAB_TABLET: 'Cab tablet',
  SYSTEM: 'System',
};

/** The Person filter value for entries no account made (the system, someone not signed in). */
export const AUDIT_SYSTEM_ACTOR = 'SYSTEM';

/** A stored before / after document, e.g. {"status":"PENDING"}. */
export type AuditState = Record<string, unknown> | unknown[] | null;

/** One audit log entry (GET /api/v1/admin/audit-log). */
export interface AuditEntry {
  id: string;
  occurredAt: string;
  actorId: string | null;
  actorLabel: string;
  actorRole: string | null;
  channel: AuditChannel;
  /** When a cab tablet recorded it, before the entry was received. */
  deviceRecordedAt: string | null;
  /** Machine code, e.g. DOCUMENT_REJECTED. */
  action: string;
  /** The sentence the log shows. */
  summary: string;
  entityType: string | null;
  entityId: string | null;
  /** REQ-2026-0193, CBRT-2026-041, Catalog KH v8. */
  entityCode: string | null;
  before: AuditState;
  after: AuditState;
  reason: string | null;
  /** Set when entityCode is a job code, so the entry links to the job. */
  jobId: string | null;
}

/** A person with entries, for the Person filter. */
export interface AuditActor {
  id: string;
  label: string;
  role: string | null;
}
