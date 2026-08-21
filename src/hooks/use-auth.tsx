import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { db, type User } from "@/lib/mock-db";

export type AppRole = "landlord" | "tenant";

type AuthContextValue = {
  user: User | null;
  roles: AppRole[];
  isLandlord: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (data: { email: string; password: string; full_name: string; phone: string; role: AppRole }) => Promise<{ error?: string }>;
  refreshRoles: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = db.getCurrentUser();
    setUser(u);
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = db.login(email, password);
    if (res.error) return { error: res.error };
    if (res.user) {
      setUser(res.user);
      return {};
    }
    return { error: "Có lỗi xảy ra" };
  }, []);

  const signUp = useCallback(async (data: { email: string; password: string; full_name: string; phone: string; role: AppRole }) => {
    const res = db.signup(data);
    if (res.error) return { error: res.error };
    if (res.user) {
      setUser(res.user);
      return {};
    }
    return { error: "Có lỗi xảy ra" };
  }, []);

  const signOut = useCallback(async () => {
    db.logout();
    setUser(null);
  }, []);

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
