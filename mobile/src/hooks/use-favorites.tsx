import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addFavorite, getFavoriteIds, removeFavorite } from "@/lib/api/favorites";
import { errorMessage } from "@/lib/errors";
import { toast } from "@/components/Toast";
import { useAuth } from "./use-auth";

type FavoritesValue = {
  ids: string[];
  has: (listingId: string) => boolean;
  toggle: (listingId: string) => void;
  loading: boolean;
  reload: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesValue | undefined>(undefined);

/**
 * The saved-rooms set, shared by the heart on every card and the Yêu thích tab.
 *
 * Toggling is optimistic: the heart fills immediately and only rolls back if
 * the write is refused. A round-trip before the icon reacts makes the button
 * feel broken on a slow connection, and the cost of being wrong is one
 * bookmark.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) {
      setIds([]);
      return;
    }
    setLoading(true);
    try {
      setIds(await getFavoriteIds());
    } catch {
      // A failed refresh leaves the previous set in place; the next screen
      // that needs it will try again.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = useCallback(
    (listingId: string) => {
      if (!user) {
        toast.info("Đăng nhập để lưu phòng yêu thích.");
        return;
      }

      const saved = ids.includes(listingId);
      setIds((cur) => (saved ? cur.filter((x) => x !== listingId) : [...cur, listingId]));

      const write = saved ? removeFavorite(listingId) : addFavorite(listingId);
      void write.catch((e) => {
        setIds((cur) => (saved ? [...cur, listingId] : cur.filter((x) => x !== listingId)));
        toast.error(errorMessage(e, "Không lưu được phòng này"));
      });
    },
    [ids, user],
  );

  const value = useMemo<FavoritesValue>(
    () => ({
      ids,
      has: (id: string) => ids.includes(id),
      toggle,
      loading,
      reload,
    }),
    [ids, toggle, loading, reload],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
