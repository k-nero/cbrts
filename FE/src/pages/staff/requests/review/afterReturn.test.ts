import { describe, expect, test } from 'bun:test';

import { afterReturn } from './afterReturn';

describe('where the manager goes after returning a request', () => {
  test('the next request in the queue, as the page saw it before sending', () => {
    expect(afterReturn('b')).toEqual({ to: 'request-review', id: 'b' });
  });

  test('back to Requests when it was the last one', () => {
    expect(afterReturn(null)).toEqual({ to: 'requests' });
    expect(afterReturn(undefined)).toEqual({ to: 'requests' });
  });
});
