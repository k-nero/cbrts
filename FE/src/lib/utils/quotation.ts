import type { QuotationDraft, Readiness, ServiceClass, StallFit } from '@/interfaces';

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
 * The air classes for the stall choice. After a refusal only the classes every horse fits are marked as
 * fitting; a road move (no fit) has none.
 */
export const classOptions = (
  fit: StallFit | null,
  _current: ServiceClass,
): { value: ServiceClass; label: string; fits: boolean }[] => {
  if (!fit) return [];
  return CLASSES.map((c) => ({
    ...c,
    fits: fit.refusal ? fit.achievableClasses.includes(c.value) : true,
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
