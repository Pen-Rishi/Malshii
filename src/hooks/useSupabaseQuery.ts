import { useState, useEffect, useCallback, useRef } from 'react';

// Drop-in replacement for Dexie's useLiveQuery
// Re-fetches when deps change, returns undefined while loading
export function useSupabaseQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[] = [],
  defaultValue?: T
): T | undefined {
  const [data, setData] = useState<T | undefined>(defaultValue);
  const [, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const stableFn = useCallback(queryFn, deps);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const result = await stableFn();
        if (!cancelled && mountedRef.current) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          setError(err as Error);
          console.error('useSupabaseQuery error:', err);
        }
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [stableFn]);

  return data;
}
