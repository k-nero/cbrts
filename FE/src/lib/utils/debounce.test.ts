import { describe, expect, test } from 'bun:test';

import { Debouncer } from './debounce';

/** A timer the test fires by hand: each set() queues a callback, clear() drops it. */
const manualTimer = () => {
  let next = 0;
  const pending = new Map<number, () => void>();
  return {
    timer: {
      set: (fn: () => void) => {
        next += 1;
        pending.set(next, fn);
        return next;
      },
      clear: (handle: unknown) => {
        pending.delete(handle as number);
      },
    },
    fire: () => {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((fn) => fn());
    },
  };
};

describe('Debouncer', () => {
  test('only the newest value settles', () => {
    const settled: string[] = [];
    const { timer, fire } = manualTimer();
    const debouncer = new Debouncer<string>(400, (v) => settled.push(v), timer);

    debouncer.push('a');
    debouncer.push('b');
    debouncer.push('c');
    fire();

    expect(settled).toEqual(['c']);
  });

  test('cancel stops a settle', () => {
    const settled: string[] = [];
    const { timer, fire } = manualTimer();
    const debouncer = new Debouncer<string>(400, (v) => settled.push(v), timer);

    debouncer.push('a');
    debouncer.cancel();
    fire();

    expect(settled).toEqual([]);
  });
});
