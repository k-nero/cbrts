import type {
  ApiError,
  QuotationDraft,
  Readiness,
  ServiceClass,
  StallFit,
  TransportMode,
} from '@/interfaces';
import type { AxiosError } from 'axios';

import { formatDay } from './horse';
import { SERVICE_CLASS_LABELS, serviceParts } from './request';

/** "$16,800.00": every money figure on the builder and the Rates page, in the figure's own currency. */
export const money = (amount: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
