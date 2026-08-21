import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";

/**
 * Loads a dashboard tab's data for one owner, with a `reload` for use after
 * mutations.
 *
 * Replaces the hand-rolled `useEffect(() => { load(); }, [ownerId])` each tab
 * had, which dropped `load` from its deps and — more importantly — had no way
 * to ignore a response that arrived after the component unmounted or after a
 * newer request had already been issued.
 *
 * `fetcher` must be stable across renders: define it at module scope, or wrap
 * it in `useCallback`.
 */
export function useOwnerData<T>(
  ownerId: string,
  fetcher: (ownerId: string) => Promise<T>,
  initial: T,
) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  // Bumped on every request and on unmount; a response whose ticket no longer
  // matches is stale and must not touch state.
  const ticket = useRef(0);

  const reload = useCallback(async () => {
    const id = ++ticket.current;
    setLoading(true);
    try {
      const result = await fetcher(ownerId);
      if (id !== ticket.current) return;
      setData(result);
    } catch (error) {
      if (id !== ticket.current) return;
      toast.error(errorMessage(error, "Không tải được dữ liệu"));
    } finally {
      if (id === ticket.current) setLoading(false);
    }
  }, [ownerId, fetcher]);

  // Bumping the counter invalidates whatever request is still in flight, so an
  // unmount (or an owner switch) can't land a response on a dead component.
  const invalidate = useCallback(() => {
    ticket.current++;
  }, []);

  useEffect(() => {
    void reload();
    return invalidate;
  }, [reload, invalidate]);

  return { data, loading, reload };
}
