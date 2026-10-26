import type {
  ApiError,
  Deposit,
  PreviousVersion,
  QuotationDraft,
  QuotationVersion,
  QuoteLineRow,
  Readiness,
  ServiceClass,
  StallFit,
  TransportMode,
} from '@/interfaces';
import type { AxiosError } from 'axios';

import { formatDay } from './horse';
import { SERVICE_CLASS_LABELS, serviceParts } from './request';
import { formatDate } from './time';

/**
 * "$16,800.00": every money figure on the builder and the Rates page, in the figure's own currency.
 * Whole-dollar figures, such as the customer's estimate, pass 0 decimals: "$31,900".
 */
export const money = (amount: number, currency = 'USD', decimals = 2): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

/** A missing amount (a line with no rate, a total that can't be worked out) reads as a dash. */
export const moneyOrDash = (amount: number | null, currency = 'USD'): string =>
  amount == null ? '—' : money(amount, currency);

/** "All 16 lines priced" / "14 of 16 lines priced". */
export const readinessText = ({ pricedLines, lineCount }: Readiness): string =>
  pricedLines === lineCount
    ? `All ${lineCount} lines priced`
    : `${pricedLines} of ${lineCount} lines priced`;

const CLASSES = (Object.keys(SERVICE_CLASS_LABELS) as ServiceClass[]).map((value) => ({
  value,
  label: SERVICE_CLASS_LABELS[value],
}));

/** The builder's fit line: "144 in across 2 positions of 96 in · 1,540 kg of horses." (BR-Q-16). */
export const fitLine = (
  fit: Pick<StallFit, 'positions' | 'widthUsedIn' | 'totalWeightKg'>,
): string => {
  const positions = `${fit.positions} ${fit.positions === 1 ? 'position' : 'positions'}`;
  const weight =
    fit.totalWeightKg == null ? '' : ` · ${fit.totalWeightKg.toLocaleString('en-US')} kg of horses`;
  return `${fit.widthUsedIn} in across ${positions} of 96 in${weight}.`;
};

/**
 * The air classes for the stall choice: none for a road move. After a refusal only the classes every
 * horse fits are marked as fitting. An air class with no catalog row has no fit, and every class is offered,
 * so the manager can move to one that is priced.
 */
export const classOptions = (
  mode: TransportMode,
  fit: StallFit | null,
  pending = false,
): { value: ServiceClass; label: string; fits: boolean; disabled: boolean }[] => {
  if (mode !== 'AIR') return [];
  return CLASSES.map((c) => ({
    ...c,
    fits: fit?.refusal ? fit.achievableClasses.includes(c.value) : true,
    disabled: pending,
  }));
};

/** "Re-price on v3" when a newer catalog has been published since the draft was pinned. */
export const repriceOffer = (
  q: Pick<QuotationDraft, 'pinnedVersion' | 'latestPublishedVersionNo'>,
): string | null =>
  q.latestPublishedVersionNo != null && q.latestPublishedVersionNo > q.pinnedVersion.versionNo
    ? `Re-price on v${q.latestPublishedVersionNo}`
    : null;

/** The builder's header line: "v1 draft · Saigon Turf Club · 2 horses · air, business class · departs 20 Nov 2026". */
export const quoteSummary = (
  q: Pick<QuotationDraft, 'versionNo' | 'status' | 'airClass' | 'request'>,
): string => {
  const r = q.request;
  // The line already runs on "·", so the service joins its words with a comma, as on Request review.
  const words = serviceParts(r.mode, r.trailer, q.airClass);
  const service = `${words.mode.toLowerCase()}${words.detail ? `, ${words.detail}` : ''}`;
  const parts = [
    `v${q.versionNo} ${q.status.toLowerCase()}`,
    r.club,
    `${r.horseCount} ${r.horseCount === 1 ? 'horse' : 'horses'}`,
    service,
    r.departureDate
      ? `departs ${formatDay(r.departureDate)}${r.dateFlexDays ? ` ±${r.dateFlexDays} d` : ''}`
      : null,
  ];
  return parts.filter(Boolean).join(' · ');
};

/**
 * The issue panel's readiness, worded by its cause: missing rates, a class the horses can't fit, or a
 * request that changed since the draft was priced.
 */
export const readinessView = (
  q: Pick<QuotationDraft, 'readiness' | 'repriceNeeded' | 'fit' | 'airClass' | 'missing'>,
): { tone: 'ok' | 'neutral'; chip: string; text: string } => {
  if (!q.readiness) return { tone: 'neutral', chip: 'Issued', text: '' };
  if (q.readiness.ready) return { tone: 'ok', chip: 'Ready', text: readinessText(q.readiness) };
  if (q.repriceNeeded) {
    return {
      tone: 'neutral',
      chip: 'Not ready',
      text: 'The request changed since this was priced.',
    };
  }
  if (q.missing.length > 0) {
    return { tone: 'neutral', chip: 'Waiting on rates', text: readinessText(q.readiness) };
  }
  if (q.fit?.refusal && q.airClass) {
    return {
      tone: 'neutral',
      chip: 'Not ready',
      text: `The horses don't fit ${q.airClass.toLowerCase()}.`,
    };
  }
  return { tone: 'neutral', chip: 'Not ready', text: readinessText(q.readiness) };
};

/**
 * The version a draft was made from, when the customer declined it: a decline is final, so the
 * draft can only be discarded. Null for a first version or when that version wasn't declined.
 */
export const declinedBefore = (
  versions: QuotationVersion[],
  versionNo: number,
): QuotationVersion | null =>
  versions.find((v) => v.versionNo === versionNo - 1 && v.status === 'DECLINED') ?? null;

/**
 * The builder's callout on a draft after a decline (spec §5.1): "The customer declined version 1 on
 * 24 Oct 2026: Too dear. REQ-… is closed." A reason that ends its own sentence isn't doubled.
 */
export const declinedTitle = (
  declined: Pick<QuotationVersion, 'versionNo' | 'declinedAt' | 'declineReason'>,
  requestCode: string,
): string => {
  const on = declined.declinedAt ? ` on ${formatDate(declined.declinedAt)}` : '';
  const reason = declined.declineReason?.trim().replace(/[.!?…]+$/, '');
  return `The customer declined version ${declined.versionNo}${on}${reason ? `: ${reason}` : ''}. ${requestCode} is closed.`;
};

/** The server's sentence when a quotation write was refused because things moved on (409), else null. */
export const conflictMessage = (error: unknown): string | null => {
  const response = (error as AxiosError<Partial<ApiError>> | undefined)?.response;
  return response?.status === 409 ? (response.data?.message ?? null) : null;
};

/* ---------- issuing (US-F1-05, US-Q-04, US-Q-07, US-Q-08) ---------- */

/** What stops the draft being issued, worded by the server, or null when it can be issued. */
export const issueBlocker = (readiness: Readiness | null): string | null =>
  readiness?.blockers[0] ?? null;

/**
 * "Changed since" on a revision: "was $1,450.00" when the line's amount differs from the version it
 * replaces, "new" for a line that version didn't have, else null.
 */
export const changedSince = (
  line: QuoteLineRow,
  previous: PreviousVersion | null,
  currency = 'USD',
): string | null => {
  if (!previous || !line.lineKey) return null;
  const before = previous.amountsByKey[line.lineKey];
  if (before === undefined) return 'new';
  return line.amount != null && line.amount !== before ? `was ${money(before, currency)}` : null;
};

/**
 * Validity stated twice (DESIGN.md, Quotation builder): a draft counts its days from issue; an issued
 * version names its last day, which ends at midnight in Vietnam.
 */
export const validityText = (
  validUntil: string | null,
  validityDays: number | null,
): { line1: string; line2: string } => {
  if (validUntil)
    return { line1: `Until ${formatDate(validUntil)}`, line2: 'end of day, Vietnam time' };
  if (validityDays == null) return { line1: '—', line2: 'no validity in the catalog' };
  return {
    line1: `In ${validityDays} ${validityDays === 1 ? 'day' : 'days'}`,
    line2: 'from issue',
  };
};

/** "30% · $2,627.02"; a dash before the deposit is fixed at issue. */
export const depositText = (deposit: Deposit | null, currency = 'USD'): string =>
  deposit ? `${deposit.pct}% · ${money(deposit.amount, currency)}` : '—';

/** The override editor's starting values: the current override, else the catalog amount. */
export const overrideDefaults = (line: QuoteLineRow): { amount: string; reason: string } => ({
  amount: (line.overrideAmount ?? line.catalogAmount ?? 0).toFixed(2),
  reason: line.overrideReason ?? '',
});

/**
 * What an issued version's status panel offers. It is the latest when no later version was issued (a
 * revision being drafted doesn't count); then it opens that draft, or, while issued or expired, is revised.
 */
export const statusActions = (
  q: Pick<QuotationDraft, 'versionNo' | 'status' | 'versions'>,
): { latest: boolean; draftVersionNo: number | null; canRevise: boolean } => {
  const draft = q.versions.find((v) => v.status === 'DRAFT') ?? null;
  const newestIssued = q.versions.find((v) => v.status !== 'DRAFT');
  const latest = !newestIssued || newestIssued.versionNo === q.versionNo;
  return {
    latest,
    draftVersionNo: latest && draft ? draft.versionNo : null,
    canRevise: latest && !draft && (q.status === 'ISSUED' || q.status === 'EXPIRED'),
  };
};
