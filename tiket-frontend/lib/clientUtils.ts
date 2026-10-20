"use client";

import { useCallback, useRef } from "react";

export function useDebounced<T extends unknown[]>(
  func: (...args: T) => void,
  delay: number,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounced = useCallback(
    (...args: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    },
    [func, delay],
  );

  return debounced;
}
