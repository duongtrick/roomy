import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/errors";

type State<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

/**
 * Runs `fetcher` on mount and whenever `reload` is called.
 *
 * Every response carries a ticket; one that comes back after a newer request
 * was issued — or after unmount — is dropped. Without that, pulling to refresh
 * twice in a row can leave the older result on screen, and a fetch resolving
 * after the user leaves the tab sets state on a dead component.
 *
 * `fetcher` must be stable: declare it at module scope or wrap it in
 * `useCallback`.
 */
export function useAsync<T>(
  fetcher: () => Promise<T>,
  initial: T,
): State<T> & { reload: () => Promise<void>; setData: (next: T) => void } {
  const [state, setState] = useState<State<T>>({
    data: initial,
    loading: true,
    error: null,
  });

  const ticket = useRef(0);

  const reload = useCallback(async () => {
    const id = ++ticket.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcher();
      if (id !== ticket.current) return;
      setState({ data, loading: false, error: null });
    } catch (e) {
      if (id !== ticket.current) return;
      setState((s) => ({ ...s, loading: false, error: errorMessage(e) }));
    }
  }, [fetcher]);

  useEffect(() => {
    void reload();
    // Bumping the ticket on unmount invalidates whatever is still in flight.
    return () => {
      ticket.current++;
    };
  }, [reload]);

  const setData = useCallback((next: T) => {
    setState((s) => ({ ...s, data: next }));
  }, []);

  return { ...state, reload, setData };
}
