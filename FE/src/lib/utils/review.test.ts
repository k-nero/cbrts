import { describe, expect, test } from 'bun:test';

import {
  ageWords,
  teamOption,
  changedRows,
  checkTally,
  checkTone,
  departsWords,
  inReview,
  noteState,
  queueRoute,
  quotationAction,
  queueWords,
  restingPanel,
  reviewSubject,
  reviewSummary,
  waitingFor,
} from './review';
import { formatDayTime } from './time';

import type { QueueRow, RequestReview, ReviewCheck, TransportRequest } from '@/interfaces';

const row = (over: Partial<QueueRow> = {}): QueueRow => ({
  id: 'r1',
  code: 'REQ-2026-0193',
  club: 'Saigon Turf Club',
  fromCity: 'Ho Chi Minh City',
  toCity: 'Bangkok',
  mode: 'ROAD',
  horseCount: 2,
  departureDate: '2026-10-30',
  dateFlexDays: 3,
  waitingSince: '2026-09-26T02:14:00Z',
  revisionNo: 1,
  ...over,
});

const check = (state: 'OK' | 'BAD'): ReviewCheck => ({
  key: 'ROUTE_SERVED',
  state,
  word: state === 'OK' ? 'Served' : 'Not served',
  evidence: '',
  sub: null,
});

const sent = (over: Partial<TransportRequest> = {}): Partial<TransportRequest> => ({
  code: 'REQ-2026-0193',
  horses: [],
  origin: null,
  destination: null,
  departureDate: '2026-10-30',
  dateFlexDays: 3,
  arrivalMode: 'ANY_TIME',
  windowStart: null,
  windowEnd: null,
  specialInstructions: null,
  mode: 'ROAD',
  trailer: 'SHARED',
  airClass: null,
  insurance: 'OWN_POLICY',
  vetEscort: false,
  route: null,
  ...over,
});

describe('the queue', () => {
  const now = new Date('2026-09-28T12:00:00Z');

  test('age in whole minutes, hours or days', () => {
    expect(ageWords('2026-09-28T11:20:00Z', now)).toBe('40 min');
    expect(ageWords('2026-09-28T02:10:00Z', now)).toBe('9 h');
    expect(ageWords('2026-09-27T06:00:00Z', now)).toBe('1 d');
    expect(ageWords('2026-09-16T12:00:00Z', now)).toBe('12 d');
  });

  test('the route and how it goes', () => {
    expect(queueRoute(row())).toEqual({ title: 'Ho Chi Minh City → Bangkok', by: 'by road' });
    expect(queueRoute(row({ mode: 'AIR', toCity: 'Hong Kong' })).by).toBe('by air');
  });

  test('departs with its flexibility', () => {
    expect(departsWords('2026-10-30', 3)).toBe('30 Oct ±3 d');
    expect(departsWords('2026-10-30', 0)).toBe('30 Oct');
  });

  test('the position in the queue', () => {
    expect(queueWords({ position: 3, total: 4, previousId: 'a', nextId: 'b' })).toBe('3 of 4');
  });
});

describe('the review page', () => {
  test('the check tally and tone', () => {
    expect(checkTally([check('OK'), check('OK')])).toBe('2 of 2 pass');
    expect(checkTally([check('OK'), check('BAD')])).toBe('1 of 2 pass');
    expect(checkTone('OK')).toBe('ok');
    expect(checkTone('BAD')).toBe('bad');
  });

  test('the header names the club, the horses, the service and the departure', () => {
    const r = {
      ...sent({
        horses: [{ name: 'Nightfall' }, { name: 'Shadowfax' }] as TransportRequest['horses'],
      }),
      club: 'Saigon Turf Club',
    } as TransportRequest & { club: string };
    expect(reviewSummary(r)).toBe(
      'Saigon Turf Club · 2 horses · road, shared load · departs 30 Oct 2026 ±3 d',
    );
    const air = {
      ...r,
      mode: 'AIR',
      trailer: null,
      airClass: 'BUSINESS',
      dateFlexDays: 0,
    } as typeof r;
    expect(reviewSummary(air)).toBe(
      'Saigon Turf Club · 2 horses · air, business class · departs 30 Oct 2026',
    );
  });

  test('what changed between two versions', () => {
    expect(changedRows(sent(), sent({ departureDate: '2026-11-02' }))).toEqual(['Departure']);
    expect(changedRows(undefined, sent())).toEqual([]);
  });

  test('a version sent before this slice still compares', () => {
    const old = {
      code: 'REQ-2026-0195',
      horses: [],
      departureDate: '2026-10-30',
    } as Partial<TransportRequest>;
    expect(() => changedRows(old, sent())).not.toThrow();
    expect(changedRows(old, { ...old })).toEqual([]);
  });

  test('the note counts after trimming, up to 500', () => {
    expect(noteState('  ')).toEqual({ length: 0, ok: false, count: '0 / 500' });
    expect(noteState(` ${'x'.repeat(500)} `)).toEqual({
      length: 500,
      ok: true,
      count: '500 / 500',
    });
    expect(noteState('x'.repeat(501))).toEqual({ length: 501, ok: false, count: '501 / 500' });
  });
});

describe('times in business time', () => {
  test('a history line at 18:30 UTC is already the next day in ICT', () => {
    expect(formatDayTime('2026-09-29T18:30:00Z')).toBe('30 Sep, 01:30');
    expect(formatDayTime('2026-09-28T02:41:00Z')).toBe('28 Sep, 09:41');
  });
});

describe('in review', () => {
  test('only a sent request waiting on the manager is in review', () => {
    expect(inReview('SUBMITTED')).toBe(true);
    expect(inReview('UNDER_REVIEW')).toBe(true);
    expect(inReview('INFO_REQUIRED')).toBe(false);
    expect(inReview('REJECTED')).toBe(false);
  });
});

describe('what the header describes', () => {
  const live = {
    ...sent({ departureDate: '2026-11-15' }),
    club: 'Saigon Turf Club',
  } as RequestReview['request'];

  test('the latest version the customer sent, not their unsent edits', () => {
    const review = {
      request: { ...live, status: 'INFO_REQUIRED' },
      revisions: [
        { revisionNo: 1, submittedAt: '', note: 'Which?', returnedAt: null, payload: sent() },
      ],
    } as unknown as RequestReview;
    const subject = reviewSubject(review);
    expect(subject.departureDate).toBe('2026-10-30');
    expect(subject.club).toBe('Saigon Turf Club');
  });

  test('the request itself when no version was kept', () => {
    const review = { request: live, revisions: [] } as unknown as RequestReview;
    expect(reviewSubject(review).departureDate).toBe('2026-11-15');
  });
});

describe('quotationAction', () => {
  const ref = { code: 'Q-2026-0191', versionNo: 1, status: 'DRAFT' as const };

  test('a request in review starts its quotation, or opens the one started', () => {
    expect(quotationAction('SUBMITTED', null)).toBe('start');
    expect(quotationAction('UNDER_REVIEW', ref)).toBe('open');
  });

  test('a request that has left review still opens its quotation', () => {
    expect(quotationAction('INFO_REQUIRED', ref)).toBe('open');
    expect(quotationAction('QUOTED', ref)).toBe('open');
  });

  test('a request out of review with no quotation has no quotation action', () => {
    expect(quotationAction('INFO_REQUIRED', null)).toBeNull();
  });
});

describe('teamOption', () => {
  test('names the person and their open jobs, singular for one', () => {
    expect(teamOption({ id: 'a', name: 'Nguyễn Thị Lan', openJobs: 1 })).toEqual({
      value: 'a',
      label: 'Nguyễn Thị Lan · 1 open job',
    });
    expect(teamOption({ id: 'b', name: 'Đỗ Minh Khôi', openJobs: 0 }).label).toBe(
      'Đỗ Minh Khôi · 0 open jobs',
    );
  });
});

describe('waitingFor', () => {
  test('the queue says what each request waits for', () => {
    expect(waitingFor('SUBMITTED')).toEqual({ tone: 'info', label: 'Review' });
    expect(waitingFor('UNDER_REVIEW')).toEqual({ tone: 'info', label: 'Review' });
    expect(waitingFor('CUSTOMER_ACCEPTED')).toEqual({ tone: 'ok', label: 'Approval' });
    expect(waitingFor('EXPIRED')).toEqual({ tone: 'warn', label: 'Re-quote' });
  });
});

describe('restingPanel', () => {
  const queue = { position: 2, total: 3, previousId: 'r0', nextId: 'r2' };
  const draft = { code: 'Q-2026-0191', versionNo: 2, status: 'DRAFT' as const };
  const review = (
    status: RequestReview['request']['status'],
    over: Partial<Pick<RequestReview, 'queue' | 'quotation'>> = {},
  ) =>
    ({
      request: { status },
      queue: null,
      quotation: null,
      ...over,
    }) as unknown as RequestReview;

  test('an expired request the queue lists with its next version in draft waits for the re-quote', () => {
    expect(restingPanel(review('EXPIRED', { queue, quotation: draft }))).toEqual({
      title: 'Waiting for the re-quote',
      requote: 'Issue version 2 of the quotation.',
    });
  });

  test('an expired request the queue leaves out is not in review, draft or not', () => {
    expect(restingPanel(review('EXPIRED', { quotation: draft }))).toEqual({
      title: 'Not in review',
      requote: null,
    });
    expect(
      restingPanel(review('EXPIRED', { queue, quotation: { ...draft, status: 'EXPIRED' } })),
    ).toEqual({ title: 'Not in review', requote: null });
  });

  test('a returned request waits for the customer; a closed one is not in review', () => {
    expect(restingPanel(review('INFO_REQUIRED', { queue }))).toEqual({
      title: 'Waiting for the customer',
      requote: null,
    });
    expect(restingPanel(review('REJECTED'))).toEqual({ title: 'Not in review', requote: null });
  });
});
