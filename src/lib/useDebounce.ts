import { useEffect, useState } from 'react';

/**
 * Returns `value`, but only after it has been stable for `delayMs`.
 * Used to keep the asteroid filter from re-sorting 200 rows per keystroke.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
