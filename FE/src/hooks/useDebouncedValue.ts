import { useEffect, useRef, useState } from 'react';

import { Debouncer } from '@/lib/utils/debounce';

/** The value as it stood `ms` after the last change: a burst of edits settles once. */
export const useDebouncedValue = <T>(value: T, ms: number): T => {
  const [settled, setSettled] = useState(value);
  const debouncer = useRef<Debouncer<T> | null>(null);

  useEffect(() => {
    debouncer.current = new Debouncer<T>(ms, setSettled);
    return () => debouncer.current?.cancel();
  }, [ms]);

  // Keyed on the value's content: callers build a new object on every render, and pushing on identity would
  // settle, re-render and push again forever.
  const key = JSON.stringify(value);
  useEffect(() => {
    debouncer.current?.push(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return settled;
};
