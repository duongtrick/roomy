import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { AuthUser } from "@/lib/api/auth.api";
import { loginFn, signupFn } from "@/lib/api/auth.api";
import { errorMessage } from "@/lib/errors";

export type AppRole = "landlord" | "tenant";

export type SignUpData = {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: AppRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLandlord: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (data: SignUpData) => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "roomy:auth_user";

/**
 * localStorage is user-writable, so anything read back has to be shape-checked
 * before it is trusted — a hand-edited entry used to crash every consumer of
 * `user.role`.
 */
function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  return (
    typeof u.id === "string" &&
    typeof u.email === "string" &&
    (u.role === "landlord" || u.role === "tenant")
  );
}

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isAuthUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Starts true so guarded routes don't flash their redirect before the stored
  // session has been read on the client.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readStoredUser());
    setLoading(false);

    // Keep tabs in sync: signing out in one window signs out the others.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setUser(readStoredUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setAndStore = useCallback((u: AuthUser | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private-browsing quota errors must not break sign-in for this session.
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await loginFn({ data: { email, password } });
        if (result.error) return { error: result.error };
        if (!result.user) return { error: "Đã xảy ra lỗi" };
        setAndStore(result.user);
        return {};
      } catch (error) {
        return { error: errorMessage(error, "Không kết nối được máy chủ") };
      }
    },
    [setAndStore],
  );

  const signUp = useCallback(
    async (data: SignUpData) => {
      try {
        const result = await signupFn({ data });
        if (result.error) return { error: result.error };
        if (!result.user) return { error: "Đã xảy ra lỗi" };
        setAndStore(result.user);
        return {};
      } catch (error) {
        return { error: errorMessage(error, "Không kết nối được máy chủ") };
      }
    },
    [setAndStore],
  );

  const signOut = useCallback(async () => {
    setAndStore(null);
  }, [setAndStore]);

  // Memoised: without this every provider render handed consumers a new object
  // and re-rendered the whole tree.
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLandlord: user?.role === "landlord",
      loading,
      signOut,
      signIn,
      signUp,
    }),
    [user, loading, signOut, signIn, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
