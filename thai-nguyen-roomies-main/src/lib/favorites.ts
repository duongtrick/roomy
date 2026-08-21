import { useEffect, useState, useCallback } from "react";

const KEY = "roomy:favorites";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(read());
    const onStorage = () => setIds(read());
    window.addEventListener("storage", onStorage);
    window.addEventListener("roomy:fav-change", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("roomy:fav-change", onStorage);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const cur = read();
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("roomy:fav-change"));
  }, []);

  return { ids, toggle, has: (id: string) => ids.includes(id) };
}
