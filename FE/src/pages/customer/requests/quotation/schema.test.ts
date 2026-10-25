import { describe, expect, test } from 'bun:test';

import { requoteSchema } from './schema';

describe('requoteSchema', () => {
  test('the note is optional', () => {
    expect(requoteSchema.safeParse({ note: '' }).success).toBe(true);
  });

  test('a note holds 500 characters, as the server does', () => {
    expect(requoteSchema.safeParse({ note: 'x'.repeat(500) }).success).toBe(true);
    expect(requoteSchema.safeParse({ note: 'x'.repeat(501) }).success).toBe(false);
  });
});
