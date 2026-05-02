import { useEffect, useRef } from "react";

export function usePolling(fn: () => Promise<void> | void, intervalMs: number) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const runningRef = useRef(false);

  useEffect(() => {
    const tick = async () => {
      if (runningRef.current || document.hidden) return;
      runningRef.current = true;
      try {
        await fnRef.current();
      } finally {
        runningRef.current = false;
      }
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
