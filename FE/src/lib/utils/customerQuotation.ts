import { formatDay } from './horse';
import { daysUntil, formatDate } from './time';

import type {
  CancellationBand,
  CustomerQuotation,
  CustomerQuoteGroup,
  QuotationIssuedRef,
} from '@/interfaces';

export type MoneyRow = { code: string | null; name: string; amount: number; share: number };

/**
 * Where the money goes (DESIGN.md, Quotation page): one row per ledger group, plus one for everything
 * added after the subtotal (fees, fuel and cover, less the volume break), largest first.
 */
export const moneyRows = (
  groups: CustomerQuoteGroup[],
  totals: { subtotal: number; total: number },
): MoneyRow[] => {
  const rows: MoneyRow[] = groups.map((g) => ({
    code: g.code,
    name: g.name,
    amount: g.subtotal ?? 0,
    share: (g.subtotal ?? 0) / totals.total,
  }));
  const added = totals.total - totals.subtotal;
  if (added > 0)
    rows.push({
      code: null,
      name: 'Fees, fuel and cover',
      amount: added,
      share: added / totals.total,
    });
  return rows.sort((a, b) => b.amount - a.amount);
};

/** "47%", or "<1%" under one percent. */
export const shareText = (share: number): string =>
  share > 0 && share < 0.01 ? '<1%' : `${Math.round(share * 100)}%`;

/** The head of Where the money goes: "Air freight is 47% of the total". */
export const moneyHead = (rows: MoneyRow[]): string =>
  rows.length === 0 ? '' : `${rows[0].name} is ${shareText(rows[0].share)} of the total`;

/** The quotation's largest line and its share of the total. */
export const largestLine = (
  groups: CustomerQuoteGroup[],
  total: number,
): { description: string; amount: number; share: number } | null => {
  const lines = groups.flatMap((g) => g.lines).filter((l) => l.amount != null);
  if (lines.length === 0) return null;
  const top = lines.reduce((a, b) => ((b.amount ?? 0) > (a.amount ?? 0) ? b : a));
  return {
    description: top.description,
    amount: top.amount ?? 0,
    share: (top.amount ?? 0) / total,
  };
};

/** Against your estimate: Inside (Ok) or Outside (Warn) the range kept at submission. */
export const estimateVerdict = (
  estimate: CustomerQuotation['estimate'],
): { tone: 'ok' | 'warn'; label: string } | null =>
  estimate == null
    ? null
    : estimate.inside
      ? { tone: 'ok', label: 'Inside your range' }
      : { tone: 'warn', label: 'Outside your range' };

/** A cancellation band by notice period, in the catalog's own days: "14–29 days", "30 days or more". */
export const noticeBandLabel = (band: Pick<CancellationBand, 'minDays' | 'maxDays'>): string => {
  if (band.maxDays == null) return `${band.minDays} days or more`;
  if (band.minDays === 0) return `Under ${band.maxDays + 1} days`;
  return `${band.minDays}–${band.maxDays} days`;
};

/** The owed item's two-line deadline: "Due in 4 days" / "27 Oct 2026", "Due today", or "Expired". */
export const deadlineText = (validUntil: string, now: string): { line1: string; line2: string } => {
  const days = daysUntil(validUntil, now);
  const line1 =
    days < 0
      ? 'Expired'
      : days === 0
        ? 'Due today'
        : `Due in ${days} ${days === 1 ? 'day' : 'days'}`;
  return { line1, line2: formatDate(validUntil) };
};

/**
 * What the owed panel says: only an issued quotation waits for the club's answer. An expired one can
 * be re-quoted (A4) while the departure is still ahead (`today` is YYYY-MM-DD in Vietnam time), and
 * once asked, the next version is being prepared. A decline is final.
 */
export const owedKind = (
  q: Pick<CustomerQuotation, 'status' | 'nextVersion'> & {
    request: Pick<CustomerQuotation['request'], 'departureDate'>;
  },
  today: string,
): 'answer' | 'departed' | 'requote' | 'requoting' | 'expired' | 'accepted' | 'declined' => {
  if (q.status === 'ACCEPTED') return 'accepted';
  if (q.status === 'DECLINED') return 'declined';
  // An issued quotation can't be accepted once its departure has come (the backend refuses it too).
  if (q.status !== 'EXPIRED')
    return q.request.departureDate && q.request.departureDate <= today ? 'departed' : 'answer';
  if (q.nextVersion != null) return 'requoting';
  // The departure is a calendar day, so the ISO strings compare as days.
  return q.request.departureDate && q.request.departureDate > today ? 'requote' : 'expired';
};

/** The owed panel's sentence on an issued quotation whose departure has come: nothing can be booked for that day. */
export const departedSentence = (q: {
  request: Pick<CustomerQuotation['request'], 'departureDate'>;
}): string => {
  const departure = q.request.departureDate ? ` on ${formatDay(q.request.departureDate)}` : '';
  return `The departure${departure} has come, so this quotation can’t be accepted. Start a new request for a later date.`;
};

/**
 * The owed panel's sentence on an expired quotation (A4): nobody re-prices it unless the customer asks for a
 * re-quote, which is possible only while the departure is still ahead (`kind` from owedKind).
 */
export const expiredSentence = (
  q: Pick<CustomerQuotation, 'validUntil'> & {
    request: Pick<CustomerQuotation['request'], 'departureDate'>;
  },
  kind: 'requote' | 'expired',
  manager: string,
): string => {
  const expired = `This quotation expired on ${q.validUntil ? formatDate(q.validUntil) : '—'}`;
  if (kind === 'requote')
    return `${expired}. Ask ${manager} for a re-quote: a new version priced from the rate catalog in force now.`;
  const departure = q.request.departureDate ? ` on ${formatDay(q.request.departureDate)}` : '';
  return `${expired}, and the departure${departure} has come, so it can’t be re-quoted. Start a new request for a later date.`;
};

/** How long an issued version holds its price, and what the customer can do once it expires (A4). */
export const holdsReason = (issuedAt: string, validUntil: string, manager: string): string => {
  const days = daysUntil(validUntil, issuedAt);
  return `It holds its price for ${days} ${days === 1 ? 'day' : 'days'} from ${formatDate(issuedAt)}. After ${formatDate(validUntil)} it expires, and you can ask ${manager} for a re-quote.`;
};

/** "1 Dec 2026 ±3 d": the departure is a calendar day, read as written (no time zone may shift it). */
export const departsText = (day: string | null, flexDays: number): string =>
  day ? `${formatDay(day)}${flexDays ? ` ±${flexDays} d` : ''}` : '—';

/**
 * The submitted page's pointer to the quotation, worded by where the quotation stands. With the departure and today
 * (ISO days), an issued quotation whose departure has come says it can no longer be accepted.
 */
export const quotationCallout = (
  ref: QuotationIssuedRef,
  departureDate?: string | null,
  today?: string,
): { tone: 'info' | 'ok'; title: string; body: string } => {
  const label = `${ref.code} v${ref.versionNo}`;
  const until = ref.validUntil ? formatDate(ref.validUntil) : null;
  if (ref.status === 'EXPIRED')
    return {
      tone: 'info',
      title: `Your quotation ${label} expired${until ? ` on ${until}` : ''}.`,
      body: 'Open it to ask for a re-quote, priced from the rate catalog in force now.',
    };
  if (ref.status === 'DECLINED')
    return {
      tone: 'info',
      title: `You declined quotation ${label}.`,
      body: 'Declining closed the request. To move these horses after all, start a new request.',
    };
  if (ref.status === 'ACCEPTED')
    return {
      tone: 'ok',
      title: `You accepted quotation ${label}.`,
      body: 'Its price and horse list hold for this move.',
    };
  if (ref.status === 'ISSUED' && departureDate && today && departureDate <= today)
    return {
      tone: 'info',
      title: `Quotation ${label} can no longer be accepted.`,
      body: `Its departure on ${formatDay(departureDate)} has come. Start a new request for a later date.`,
    };
  return {
    tone: 'info',
    title: `Your quotation is ready: ${label}.`,
    body: until
      ? `It holds its price until ${until}.`
      : 'It is itemised, with the deposit and cancellation terms.',
  };
};

/** "25%": a fee band's percentage, without trailing zeros. */
const feePct = (pct: number): string => `${Number(pct.toFixed(2))}%`;

/**
 * What cancelling costs today (BR-F1-07, US-Q-08): the band the days left before departure fall in,
 * from the quotation's pinned catalog.
 */
export const cancellationToday = (q: Pick<CustomerQuotation, 'cancellation'>): string => {
  const band = q.cancellation.bands.find((b) => b.current);
  const days = Math.max(0, q.cancellation.daysToDeparture);
  if (!band) return 'Cancelling before approval costs the fee band for the notice you give.';
  return `If you cancel before approval, the fee today is ${feePct(band.pct)} of the total, with ${days} ${
    days === 1 ? 'day' : 'days'
  } to departure.`;
};

/**
 * The cancellation as it was recorded: "You cancelled on 26 Sep 2026. The fee is 25% of the quotation total."
 * `quoted`: a quotation was issued, so a 0% fee came from its bands rather than from having no price.
 */
export const cancelledText = (
  cancelledAt: string | null,
  pct: number | null,
  quoted: boolean,
): string => {
  const on = cancelledAt
    ? `You cancelled on ${formatDate(cancelledAt)}.`
    : 'You cancelled this request.';
  if (pct == null) return on;
  if (pct > 0) return `${on} The fee is ${feePct(pct)} of the quotation total.`;
  return quoted
    ? `${on} No fee was due for the notice you gave.`
    : `${on} No fee, as no quotation was issued.`;
};

/** The owed panel on a request the logistics manager rejected: nothing is left to answer (BR-F1-04). */
export const rejectedText = (manager: string): string =>
  `${manager} turned this request down, so the quotation can’t be answered. The reason is on the request page.`;

/** The quoted pass's chip: the version and where the club's answer stands. */
export const quotedPassChip = (
  q: Pick<CustomerQuotation, 'status' | 'requestStatus' | 'versionNo'>,
): { tone: 'info' | 'ok' | 'neutral' | 'bad'; label: string } => {
  if (q.requestStatus === 'CANCELLED') return { tone: 'neutral', label: 'Cancelled' };
  if (q.requestStatus === 'REJECTED') return { tone: 'bad', label: 'Rejected' };
  if (q.requestStatus === 'APPROVED') return { tone: 'ok', label: `Approved · v${q.versionNo}` };
  if (q.status === 'ACCEPTED') return { tone: 'ok', label: `Accepted · v${q.versionNo}` };
  if (q.status === 'DECLINED') return { tone: 'neutral', label: `Declined · v${q.versionNo}` };
  if (q.status === 'EXPIRED') return { tone: 'neutral', label: `Expired · v${q.versionNo}` };
  return { tone: 'info', label: `Quoted · v${q.versionNo}` };
};

/** The line under the quoted total: until when it holds, or what became of it. */
export const quotedPassSub = (
  q: Pick<
    CustomerQuotation,
    'status' | 'requestStatus' | 'validUntil' | 'acceptedAt' | 'declinedAt' | 'cancelledAt'
  >,
): string => {
  const on = (iso: string | null) => (iso ? ` ${formatDate(iso)}` : '');
  if (q.requestStatus === 'CANCELLED') return `Request cancelled${on(q.cancelledAt)}.`;
  if (q.requestStatus === 'REJECTED') return 'Request rejected. The reason is on the request page.';
  if (q.requestStatus === 'APPROVED')
    return 'Approved. The price and the horse list are locked; your document checklist is open.';
  if (q.status === 'ACCEPTED')
    return `Accepted${on(q.acceptedAt)}. Once the job is approved, this becomes your travel pass.`;
  if (q.status === 'DECLINED') return `Declined${on(q.declinedAt)}.`;
  if (q.status === 'EXPIRED') return `Expired${on(q.validUntil)}. It no longer holds its price.`;
  return `Valid until ${q.validUntil ? formatDate(q.validUntil) : '—'}. Once you accept and the job is approved, this becomes your travel pass.`;
};
