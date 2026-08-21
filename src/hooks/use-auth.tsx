import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { AuthUser } from "@/lib/api/auth.api";
import { loginFn, signupFn } from "@/lib/api/auth.api";

export type AppRole = "landlord" | "tenant";

type AuthContextValue = {
  user: AuthUser | null;
  roles: AppRole[];
  isLandlord: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (data: { email: string; password: string; full_name: string; phone: string; role: AppRole }) => Promise<{ error?: string }>;
  refreshRoles: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "roomy:auth_user";

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readStoredUser());
    setLoading(false);
  }, []);

  const setAndStore = useCallback((u: AuthUser | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await loginFn({ data: { email, password } });
    if ("error" in result && result.error) return { error: result.error };
    if ("user" in result && result.user) {
      setAndStore(result.user);
      return {};
    }
    return { error: "Đã xảy ra lỗi" };
  }, [setAndStore]);

  const signUp = useCallback(async (data: { email: string; password: string; full_name: string; phone: string; role: AppRole }) => {
    const result = await signupFn({ data });
    if ("error" in result && result.error) return { error: result.error };
    if ("user" in result && result.user) {
      setAndStore(result.user);
      return {};
    }
    return { error: "Đã xảy ra lỗi" };
  }, [setAndStore]);

  const signOut = useCallback(async () => {
    setAndStore(null);
  }, [setAndStore]);

  const roles: AppRole[] = user ? [user.role] : [];

  const value: AuthContextValue = {
    user,
    roles,
    isLandlord: user?.role === "landlord",
    loading,
    signOut,
    signIn,
    signUp,
    refreshRoles: async () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
