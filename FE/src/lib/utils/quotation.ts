import { formatDate } from './time';

import type {
  ApiError,
  Deposit,
  PreviousVersion,
  QuotationDraft,
  QuoteLineRow,
  Readiness,
  ServiceClass,
  StallFit,
  TransportMode,
} from '@/interfaces';
import type { AxiosError } from 'axios';

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$16,800.00": every money figure on the builder and the Rates page. */
export const money = (amount: number): string => USD.format(amount);

/** A missing amount (a line with no rate, a total that can't be worked out) reads as a dash. */
export const moneyOrDash = (amount: number | null): string =>
  amount == null ? '—' : money(amount);

/** "All 16 lines priced" / "14 of 16 lines priced". */
export const readinessText = ({ pricedLines, lineCount }: Readiness): string =>
  pricedLines === lineCount
    ? `All ${lineCount} lines priced`
    : `${pricedLines} of ${lineCount} lines priced`;

const CLASSES: { value: ServiceClass; label: string }[] = [
  { value: 'ECONOMY', label: 'Economy' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'FIRST', label: 'First' },
];

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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "20 Nov 2026" from a calendar date ("2026-11-20"), with no time zone involved. */
const dayWords = (date: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** The builder's header line: "v1 draft · Saigon Turf Club · 2 horses · air, business · departs 20 Nov 2026". */
export const quoteSummary = (
  q: Pick<QuotationDraft, 'versionNo' | 'status' | 'airClass' | 'request'>,
): string => {
  const r = q.request;
  const service =
    r.mode === 'AIR'
      ? `air${q.airClass ? `, ${q.airClass.toLowerCase()}` : ''}`
      : `road${r.trailer ? `, ${r.trailer === 'SHARED' ? 'shared load' : 'private trailer'}` : ''}`;
  const parts = [
    `v${q.versionNo} ${q.status.toLowerCase()}`,
    r.club,
    `${r.horseCount} ${r.horseCount === 1 ? 'horse' : 'horses'}`,
    service,
    r.departureDate
      ? `departs ${dayWords(r.departureDate)}${r.dateFlexDays ? ` ±${r.dateFlexDays} d` : ''}`
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
): string | null => {
  if (!previous || !line.lineKey) return null;
  const before = previous.amountsByKey[line.lineKey];
  if (before === undefined) return 'new';
  return line.amount != null && line.amount !== before ? `was ${money(before)}` : null;
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
export const depositText = (deposit: Deposit | null): string =>
  deposit ? `${deposit.pct}% · ${money(deposit.amount)}` : '—';

/** The override editor's starting values: the current override, else the catalog amount. */
export const overrideDefaults = (line: QuoteLineRow): { amount: string; reason: string } => ({
  amount: (line.overrideAmount ?? line.catalogAmount ?? 0).toFixed(2),
  reason: line.overrideReason ?? '',
});
