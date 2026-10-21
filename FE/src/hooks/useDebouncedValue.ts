import { useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash-es';

/** The value as it stood `ms` after the last change: a burst of edits settles once. */
export const useDebouncedValue = <T>(value: T, ms: number): T => {
  const [settled, setSettled] = useState(value);
  const settle = useMemo(() => debounce(setSettled, ms), [ms]);
  useEffect(() => () => settle.cancel(), [settle]);

  // Keyed on the value's content: callers build a new object on every render, and pushing on identity would
  // settle, re-render and push again forever.
  const key = JSON.stringify(value);
  useEffect(() => {
    settle(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, settle]);

  return settled;
};
