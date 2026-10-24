import { describe, expect, test } from 'bun:test';
import dayjs from 'dayjs';

import { replyDueDay, whoAnswers } from './topics';

describe('replyDueDay', () => {
  test('answers by the next weekday', () => {
    expect(replyDueDay(dayjs('2026-09-26T11:31')).format('ddd D MMM')).toBe('Mon 28 Sep');
    expect(replyDueDay(dayjs('2026-09-28T08:10')).format('ddd D MMM')).toBe('Tue 29 Sep');
    expect(replyDueDay(dayjs('2026-10-02T16:00')).format('ddd D MMM')).toBe('Mon 5 Oct');
  });
});

describe('whoAnswers', () => {
  test('routes each topic to its role', () => {
    expect(whoAnswers('DOCUMENTS')).toBe('the transport specialist');
    expect(whoAnswers('TRIP')).toBe('the fleet & route coordinator');
    expect(whoAnswers('OTHER')).toBe('the logistics manager');
  });
});
