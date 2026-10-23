import { describe, expect, test } from 'bun:test';

import {
  customerHolder,
  customerMayUpload,
  documentFileProblem,
  groupChecklist,
  isOverdue,
  isWithAuthority,
  itemDeadline,
  rowStatus,
} from './checklist';

import type { ChecklistItem } from '@/interfaces';

const NOW = '2026-09-26T04:20:00Z';

const item = (over: Partial<ChecklistItem>): ChecklistItem => ({
  id: crypto.randomUUID(),
  jobId: 'j',
  jobCode: 'CBRT-2026-041',
  documentTypeId: 'd',
  documentTypeCode: 'DOC',
  documentTypeName: 'Equine passport',
  documentScope: 'PER_HORSE',
  providedBy: 'CUSTOMER',
  mandatory: true,
  status: 'AWAITING_UPLOAD',
  holder: 'CUSTOMER',
  createdAt: NOW,
  ...over,
});

describe('itemDeadline', () => {
  test('an owed item past its date is overdue, stated twice', () => {
    expect(itemDeadline(item({ dueDate: '2026-09-25' }), NOW)).toEqual({
      left: 'Overdue by 1 day',
      date: 'was due 25 Sep 2026',
      tone: 'bad',
    });
  });

  test('an owed item due within a week is a warning; later is neutral', () => {
    expect(itemDeadline(item({ dueDate: '2026-09-30' }), NOW).tone).toBe('warn');
    expect(itemDeadline(item({ dueDate: '2026-10-11' }), NOW)).toEqual({
      left: 'Due in 15 days',
      date: '11 Oct 2026',
      tone: 'neutral',
    });
  });

  test('what someone else holds is expected, never due', () => {
    const cert = item({ status: 'NOT_ISSUED', holder: 'SPECIALIST', dueDate: '2026-10-08' });
    expect(itemDeadline(cert, NOW)).toEqual({
      left: 'In 12 days',
      date: '8 Oct 2026',
      tone: 'neutral',
    });
    expect(isOverdue({ ...cert, dueDate: '2026-09-01' }, NOW)).toBe(false);
  });

  test('a cleared item is done on the day it was approved', () => {
    const cleared = item({
      status: 'CLEARED',
      holder: undefined,
      currentVersion: { reviewedAt: '2026-09-02T03:00:00Z', reviewedByCalledName: 'Lan' } as never,
    });
    expect(itemDeadline(cleared, NOW)).toEqual({ left: 'Done', date: '2 Sep 2026', tone: 'ok' });
    expect(customerHolder(cleared)).toBe('Cleared by Lan');
  });
});

describe('holders and states', () => {
  test('the customer reads "With you"; a certificate not issued yet is with the authority', () => {
    expect(customerHolder(item({}))).toBe('With you');
    const cert = item({ status: 'NOT_ISSUED', holder: 'SPECIALIST' });
    expect(customerHolder(cert)).toBe('With the authority');
    expect(isWithAuthority(cert)).toBe(true);
    expect(customerHolder(item({ status: 'IN_REVIEW', holder: 'SPECIALIST' }))).toBe(
      'With your transport specialist',
    );
  });

  test('a rejected document is red', () => {
    expect(rowStatus(item({ status: 'REJECTED' }))).toBe('red');
  });
});

describe('groupChecklist', () => {
  test('horses by name, then the shipment, each counting what is cleared', () => {
    const groups = groupChecklist([
      item({ horseId: 'b', horseName: 'Silver Bell', status: 'CLEARED' }),
      item({ documentScope: 'PER_SHIPMENT', documentTypeName: 'Transit insurance' }),
      item({ horseId: 'a', horseName: 'Nightfall' }),
      item({ horseId: 'b', horseName: 'Silver Bell', documentTypeName: 'EIA (Coggins) test' }),
    ]);
    expect(groups.map((g) => [g.title, g.cleared, g.total])).toEqual([
      ['Nightfall', 0, 1],
      ['Silver Bell', 1, 2],
      ['Shipment', 0, 1],
    ]);
    expect(groups[1].items.map((i) => i.documentTypeName)).toEqual([
      'EIA (Coggins) test',
      'Equine passport',
    ]);
  });
});

describe('customerMayUpload', () => {
  test('their own document, until it is cleared with nothing to fix', () => {
    expect(customerMayUpload(item({}))).toBe(true);
    expect(customerMayUpload(item({ status: 'REJECTED' }))).toBe(true);
    expect(customerMayUpload(item({ status: 'CLEARED', validity: 'AMBER' }))).toBe(true);
    expect(customerMayUpload(item({ status: 'CLEARED', validity: 'GREEN' }))).toBe(false);
    expect(customerMayUpload(item({ providedBy: 'AUTHORITY' }))).toBe(false);
  });
});

describe('documentFileProblem', () => {
  const file = (name: string, size: number) => new File([new Uint8Array(size)], name);

  test('PDF and photos up to 25 MB pass; other types and bigger files are named', () => {
    expect(documentFileProblem(file('EIA_Nightfall.PDF', 1000))).toBeNull();
    expect(documentFileProblem(file('scan.heic', 1000))).toBeNull();
    expect(documentFileProblem(file('notes.docx', 1000))).toBe(
      'Upload a PDF, JPEG, PNG or HEIC file.',
    );
    expect(documentFileProblem(file('big.pdf', 25 * 1024 * 1024 + 1))).toBe(
      'The file is larger than 25 MB.',
    );
  });
});
