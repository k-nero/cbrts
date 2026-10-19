import type { Estimate, OptionEffect } from '@/interfaces';

const dollars = (n: number): string =>
  `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.abs(n))}`;

const MINUS = '−';

const NOT_A_QUOTE =
  'Not a quote. A logistics manager prices the move after review; the quotation is itemised and valid for 7 days.';
const ON_REVIEW = 'Not a quote. Once you approve the quotation, this becomes your travel pass.';

/** "$31,900 – $43,300": the estimate is always a range (BR-Q-11). */
export const rangeText = (low: number, high: number): string =>
  `${dollars(low)} – ${dollars(high)}`;

/**
 * How a choice moves the range: "+ $2,400 – $3,300", "− $1,100 – $1,500" (smaller figure first), "± $0",
 * or "− $200 – + $300" when the two ends move in different directions.
 */
export const deltaText = (low: number, high: number): string => {
  if (low === 0 && high === 0) return '± $0';
  if (low <= 0 && high <= 0) {
    const [a, b] = [Math.abs(low), Math.abs(high)].sort((x, y) => x - y);
    return a === b ? `${MINUS} ${dollars(a)}` : `${MINUS} ${dollars(a)} – ${dollars(b)}`;
  }
  if (low >= 0 && high >= 0) {
    const [a, b] = [low, high].sort((x, y) => x - y);
    return a === b ? `+ ${dollars(a)}` : `+ ${dollars(a)} – ${dollars(b)}`;
  }
  const [neg, pos] = low < 0 ? [low, high] : [high, low];
  return `${MINUS} ${dollars(neg)} – + ${dollars(pos)}`;
};

/** "+ $4,875" or "− $4,875": insurance moves the price by an exact amount. */
export const exactText = (amount: number): string =>
  `${amount < 0 ? MINUS : '+'} ${dollars(amount)}`;

/**
 * An option card's Meta line: the wizard's own rule reason wins; then "In the estimate", an exact figure,
 * a delta, or why the catalog can't price the choice.
 */
export const optionMeta = (
  effect: OptionEffect | undefined,
  ruleReason?: string,
): string | undefined => {
  if (ruleReason) return ruleReason;
  if (!effect) return undefined;
  if (effect.current) return 'In the estimate';
  if (effect.exact != null) return exactText(effect.exact);
  if (effect.deltaLow != null && effect.deltaHigh != null)
    return deltaText(effect.deltaLow, effect.deltaHigh);
  return effect.unavailable ?? undefined;
};

/** The draft pass's stub: the range (or a dash) and the line under it (spec §6.2). */
export const estimateStub = (a: {
  estimate?: Estimate;
  loading: boolean;
  error: boolean;
  stored: { low: number | null; high: number | null } | null;
  step: 'horses' | 'route' | 'service' | 'review';
}): { range: string | null; rangeSub: string } => {
  if (a.stored) {
    // A submitted request: the range it was submitted with, or none (submitted before estimates, or
    // while the catalog couldn't price it). Nothing on this page can change it.
    return a.stored.low != null && a.stored.high != null
      ? {
          range: rangeText(a.stored.low, a.stored.high),
          rangeSub: 'Your estimate when you submitted. Not a quote.',
        }
      : { range: null, rangeSub: NOT_A_QUOTE };
  }
  if (a.error) {
    return {
      range: null,
      rangeSub: "The estimate didn't load. It will try again when you change something.",
    };
  }
  const e = a.estimate;
  if (!e) {
    return {
      range: null,
      rangeSub: a.loading
        ? 'Working out your estimate…'
        : 'Choose the route and horses to see an estimate.',
    };
  }
  if (e.status !== 'READY' || e.low == null || e.high == null) {
    return { range: null, rangeSub: e.message ?? NOT_A_QUOTE };
  }
  return {
    range: rangeText(e.low, e.high),
    rangeSub: a.step === 'review' ? ON_REVIEW : (e.assumptions[0] ?? NOT_A_QUOTE),
  };
};

/**
 * The answer the option cards may read: a range for the values now on screen. An answer for older values
 * (the debounce or the next request still running) or one without a range gives the cards nothing, so no
 * card says "In the estimate" when it isn't.
 */
export const liveEstimate = (e: Estimate | undefined, stale: boolean): Estimate | undefined =>
  !stale && e?.status === 'READY' ? e : undefined;
