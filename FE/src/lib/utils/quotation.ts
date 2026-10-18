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
