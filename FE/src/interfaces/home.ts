import type { Coat, IconName, Stage, Tone, Urgency } from '@/components/ui';
import type { RequestStatus } from './request';

/*
 * The customer's Home (DESIGN.md, Home signed in): what the club owes across every request,
 * each move with its stage and what holds it, and the horses. Dates are ISO strings; the page
 * words them ("Due in 4 days") against `asOf`, so the server's clock decides "now".
 */

export interface OwedEntry {
  id: string;
  /** Where the action opens: the document, the quotation, the request to answer, or the invoice. */
  kind: 'DOCUMENT' | 'QUOTATION' | 'ANSWER' | 'INVOICE';
  requestId: string;
  /** The checklist item, for a document. */
  itemId: string | null;
  /** The invoice, for an invoice to pay. */
  invoiceId: string | null;
  urgency: Urgency;
  title: string;
  /** "CBRT-2026-041 · Silver Bell · Proof of ownership". */
  subject: string;
  /** The rule, or who asked and why. */
  reason: string;
  /** Null while the job has no planned departure to count from. */
  dueAt: string | null;
  actionLabel: string;
  actionIcon: IconName | null;
}

export interface MoveEntry {
  requestId: string;
  status: RequestStatus;
  /** The customer's reference; it never changes once given. Null for a draft, which gets one when submitted. */
  requestCode: string | null;
  /** "Ho Chi Minh City → Phnom Penh". */
  route: string;
  /** "job CBRT-2026-041 · 4 horses · road, private trailer". */
  detail: string;
  stage: Stage;
  /** What holds it, in words and a tone: "Departure locked · you owe 4". */
  holds: { text: string; tone: Tone };
  /** Null for a draft without a departure date. */
  departsAt: string | null;
  /** Set while the move is on the road: the departs column shows the arrival instead. */
  arrivesAt: string | null;
}

export interface HomeHorse {
  id: string;
  name: string;
  coat: Coat;
  /** "Grey · Andalusian gelding". */
  line: string;
  /** "4 of 5 cleared", or on the road "Stall 1 · standard". */
  documents: string;
  /** The one thing the horse is waiting on, toned: "Bill of sale overdue". */
  note: { text: string; tone: Tone } | null;
}

/** When nothing is owed, the next event leads instead (DESIGN.md, Home states). */
export interface NextEvent {
  title: string;
  body: string;
  /** "Departs" or "Expected": the verb before the time left. */
  verb: string;
  /** Null when no move has a date yet. */
  at: string | null;
  /** Show the date or only the time on the second line. */
  dateStyle: 'date' | 'dayTime' | 'time';
}

/** The move on the road, as recorded checkpoints (Tracking · In transit shares it). */
export interface TripNow {
  updatedAt: string;
  gate: 'locked' | 'clear';
  stops: {
    name: string;
    kind: string;
    state: 'done' | 'current' | 'upcoming';
    /** "06:05 · departed", "exp. 09:30". */
    time: string;
  }[];
}

export interface CustomerHome {
  /** The server's "now"; every relative time on the page is measured from it. */
  asOf: string;
  clubName: string;
  requestCount: number;
  horseCount: number;
  nextDeparture: {
    route: string;
    departsAt: string | null;
    state: 'locked' | 'cleared' | 'on-road';
    arrivesAt: string | null;
  } | null;
  /** Soonest first; the first item's action is the page's one gold button. */
  owed: OwedEntry[];
  /** Requests the owed items span. */
  owedRequestCount: number;
  /** Set only when nothing is owed and a move is in progress. */
  nextEvent: NextEvent | null;
  /** The move on the road as recorded checkpoints; not sent yet. */
  trip?: TripNow;
  /** Ordered by what needs the club first, then by departure. */
  moves: MoveEntry[];
  horses: HomeHorse[];
  /** "Documents cleared for the 18 Oct move, CBRT-2026-041." */
  horsesNote: string;
}
