import { describe, expect, test } from 'bun:test';
import dayjs from 'dayjs';

import { documentUploadSchema, EMPTY_UPLOAD } from './schema';

const pdf = new File([new Uint8Array(10)], 'EIA_Nightfall.pdf');
const messages = (v: object) => {
  const r = documentUploadSchema.safeParse({ ...EMPTY_UPLOAD, ...v });
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
};

describe('documentUploadSchema', () => {
  test('the file, issue date and valid-until date are required', () => {
    expect(messages({})).toEqual({
      file: 'Choose the file to upload.',
      issuedOn: 'Enter the issue date printed on the document.',
      validUntil: 'Enter the date it is valid until.',
    });
  });

  test('dates a certificate cannot have are named on their field', () => {
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    expect(messages({ file: pdf, issuedOn: tomorrow, validUntil: '2099-01-01' })).toEqual({
      issuedOn: "The issue date can't be in the future.",
    });
    expect(
      messages({
        file: pdf,
        issuedOn: '2026-10-01',
        sampledOn: '2026-10-02',
        validUntil: '2026-09-30',
      }),
    ).toEqual({
      sampledOn: "The sample date can't be after the issue date.",
      validUntil: "It can't expire before it was issued.",
    });
  });

  test('a PDF with sensible dates passes', () => {
    expect(messages({ file: pdf, issuedOn: '2026-10-01', validUntil: '2026-12-01' })).toEqual({});
  });
});
