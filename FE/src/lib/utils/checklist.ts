import type { DocumentStatus, Tone } from '@/components/ui';
import {
  type ChecklistItem,
  ChecklistHolderEnum,
  ChecklistStatusEnum,
  DocumentProviderEnum,
  ValidityEnum,
} from '@/interfaces';

import { daysUntil, formatDate } from './time';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A checklist item's row state: cleared wins, then the validity colour, then waiting for review. */
export function rowStatus(item: ChecklistItem): DocumentStatus {
  if (item.status === ChecklistStatusEnum.CLEARED) return 'cleared';
  if (item.status === ChecklistStatusEnum.REJECTED) return 'red';
  if (item.validity === ValidityEnum.RED) return 'red';
  if (item.validity === ValidityEnum.AMBER) return 'amber';
  if (item.status === ChecklistStatusEnum.IN_REVIEW) return 'review';
  if (item.status === ChecklistStatusEnum.WITH_AUTHORITY) return 'review';
  return 'required';
}

/** The status word when the row state's own word isn't specific enough. */
export function rowStatusLabel(item: ChecklistItem): string | undefined {
  switch (item.status) {
    case ChecklistStatusEnum.REJECTED:
      return 'Rejected';
    case ChecklistStatusEnum.WITH_AUTHORITY:
      return 'With the authority';
    case ChecklistStatusEnum.NOT_ISSUED:
      return item.validity ? undefined : 'Not issued yet';
    case ChecklistStatusEnum.AWAITING_UPLOAD:
      return item.validity ? undefined : 'Not uploaded';
    default:
      return undefined;
  }
}

export const isCleared = (item: ChecklistItem) => item.status === ChecklistStatusEnum.CLEARED;

/** The customer owes the next step: an upload, a replacement, or a new document. */
export const isOwedByCustomer = (item: ChecklistItem) =>
  !isCleared(item) && item.holder === ChecklistHolderEnum.CUSTOMER;

/** An authority issues or holds it: the export certificate not issued yet, a filed permit. */
export const isWithAuthority = (item: ChecklistItem) =>
  !isCleared(item) &&
  (item.holder === ChecklistHolderEnum.AUTHORITY ||
    item.status === ChecklistStatusEnum.WITH_AUTHORITY ||
    item.status === ChecklistStatusEnum.NOT_ISSUED);

/** Past its due date and still owed by the customer. */
export const isOverdue = (item: ChecklistItem, now: string) =>
  isOwedByCustomer(item) && !!item.dueDate && daysUntil(item.dueDate, now) < 0;

/** Who holds the next step, in the customer's words ("With you", "Cleared by Lan"). */
export function customerHolder(item: ChecklistItem): string {
  if (isCleared(item)) {
    const by = item.currentVersion?.reviewedByCalledName;
    return by ? `Cleared by ${by}` : 'Cleared';
  }
  if (item.holder === ChecklistHolderEnum.CUSTOMER) return 'With you';
  if (isWithAuthority(item)) return 'With the authority';
  return 'With your transport specialist';
}

export type ItemDeadline = { left: string; date: string; tone: Tone };

/**
 * The item's two-line deadline: done and when, or time left and the due date. Only what the customer owes
 * is "Due"; the rest is when it is expected.
 */
export function itemDeadline(item: ChecklistItem, now: string): ItemDeadline {
  if (isCleared(item)) {
    const at = item.currentVersion?.reviewedAt;
    return { left: 'Done', date: at ? formatDate(at) : '', tone: 'ok' };
  }
  if (!item.dueDate) return { left: 'No date yet', date: 'Set with departure', tone: 'neutral' };
  const days = daysUntil(item.dueDate, now);
  const date = formatDate(item.dueDate);
  if (!isOwedByCustomer(item)) {
    return {
      left: days < 0 ? 'Expected' : days === 0 ? 'Expected today' : `In ${plural(days, 'day')}`,
      date,
      tone: 'neutral',
    };
  }
  if (days < 0)
    return { left: `Overdue by ${plural(-days, 'day')}`, date: `was due ${date}`, tone: 'bad' };
  if (days === 0) return { left: 'Due today', date, tone: 'bad' };
  return { left: `Due in ${plural(days, 'day')}`, date, tone: days <= 7 ? 'warn' : 'neutral' };
}

export type ChecklistGroup = {
  key: string;
  /** The horse's name, or "Shipment" for the job's own papers. */
  title: string;
  /** The microchip, or what the shipment group holds. */
  subtitle: string;
  items: ChecklistItem[];
  /** Counted over the whole group, so a filtered view still reads "3 of 5 cleared". */
  cleared: number;
  total: number;
};

/** One group per horse in name order, then the shipment's own papers (DESIGN.md, All documents). */
export function groupChecklist(items: ChecklistItem[]): ChecklistGroup[] {
  const horses = new Map<string, ChecklistItem[]>();
  const shipment: ChecklistItem[] = [];
  for (const item of items) {
    if (item.horseId) horses.set(item.horseId, [...(horses.get(item.horseId) ?? []), item]);
    else shipment.push(item);
  }
  const byName = (a: ChecklistItem, b: ChecklistItem) =>
    (a.documentTypeName ?? '').localeCompare(b.documentTypeName ?? '');
  const group = (key: string, title: string, subtitle: string, rows: ChecklistItem[]) => ({
    key,
    title,
    subtitle,
    items: [...rows].sort(byName),
    cleared: rows.filter(isCleared).length,
    total: rows.length,
  });
  return [
    ...[...horses.entries()]
      .map(([id, rows]) =>
        group(id, rows[0].horseName ?? 'Horse', rows[0].horseMicrochip ?? '', rows),
      )
      .sort((a, b) => a.title.localeCompare(b.title)),
    ...(shipment.length > 0
      ? [group('shipment', 'Shipment', 'Documents for the whole job', shipment)]
      : []),
  ];
}

/**
 * The customer can upload a version (US-F2-03): one of the documents they provide, not cleared with nothing left
 * to fix. Matches the server's check; departure is checked there.
 */
export const customerMayUpload = (item: ChecklistItem) =>
  item.providedBy === DocumentProviderEnum.CUSTOMER &&
  !(isCleared(item) && item.validity === ValidityEnum.GREEN);

/** "Upload", or "Upload a new version" once one is on file. */
export const uploadLabel = (item: ChecklistItem) =>
  item.currentVersion ? 'Upload a new version' : 'Upload';

/** File types the server accepts, read from the file's bytes there (PDF, JPEG, PNG, HEIC). */
export const DOCUMENT_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.heic,application/pdf,image/jpeg,image/png,image/heic';
export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

/** Why the file can't be sent, or null. The server checks the bytes again. */
export function documentFileProblem(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!/\.(pdf|jpe?g|png|heic)$/.test(name)) return 'Upload a PDF, JPEG, PNG or HEIC file.';
  if (file.size > DOCUMENT_MAX_BYTES) return 'The file is larger than 25 MB.';
  if (file.size === 0) return 'The file is empty.';
  return null;
}
