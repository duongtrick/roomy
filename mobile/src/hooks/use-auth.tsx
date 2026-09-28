import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { AppRole } from "@/lib/database.types";

export type { AppRole };

/**
 * Vai trò chọn được ở màn hình đăng ký.
 *
 * 'admin' cố tình không nằm trong đây, và cũng không nằm trong màn hình đăng
 * ký: `handle_new_user` hạ mọi yêu cầu 'admin' xuống 'tenant', nên gửi lên
 * cũng vô ích. Kiểu riêng để chỗ gọi không vô tình dựng được ô chọn đó.
 */
export type SignUpRole = Exclude<AppRole, "admin">;

export type AppUser = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
};

type AuthContextValue = {
  user: AppUser | null;
  isLandlord: boolean;
  isAdmin: boolean;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (data: {
    email: string;
    password: string;
    full_name: string;
    phone: string;
    role: SignUpRole;
  }) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ROLE_RANK: Record<AppRole, number> = { tenant: 0, landlord: 1, admin: 2 };

export function pickRole(rows: { role: AppRole }[] | null | undefined): AppRole {
  return (rows ?? []).reduce<AppRole>(
    (best, row) => (ROLE_RANK[row.role] > ROLE_RANK[best] ? row.role : best),
    "tenant",
  );
}

/**
 * Loads the profile row and role that go with a session.
 *
 * The role is authoritative from `user_roles`, never from the JWT metadata:
 * metadata is writable by the account holder, so trusting it would let anyone
 * hand themselves the landlord dashboard. RLS would still refuse their writes,
 * but they would be staring at a broken screen instead of a locked door. The
 * same goes double for `admin`, which the signup trigger refuses to assign at
 * all — see `handle_new_user` in `supabase/schema.sql`.
 */
async function loadUser(session: Session): Promise<AppUser> {
  const [profileResult, roleResult] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", session.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", session.user.id),
  ]);

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    full_name: profileResult.data?.full_name ?? null,
    phone: profileResult.data?.phone ?? null,
    role: pickRole(roleResult.data),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  // Guards against an older profile fetch resolving after a newer sign-in and
  // overwriting it — sign out then straight back in is enough to race them.
  const ticket = useRef(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const apply = (session: Session | null) => {
      const id = ++ticket.current;
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }
      void loadUser(session)
        .then((next) => {
          if (id === ticket.current) setUser(next);
        })
        .catch(() => {
          if (id === ticket.current) setUser(null);
        })
        .finally(() => {
          if (id === ticket.current) setLoading(false);
        });
    };

    void supabase.auth.getSession().then(({ data }) => apply(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: "Chưa cấu hình Supabase." };
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    // Supabase deliberately says "Invalid login credentials" for both a wrong
    // password and an unknown email; keep that — telling them apart is an
    // account-enumeration hole.
    if (error) {
      return {
        error:
          error.message === "Invalid login credentials"
            ? "Email hoặc mật khẩu không đúng."
            : error.message,
      };
    }
    return {};
  }, []);

  const signUp = useCallback(
    async (data: {
      email: string;
      password: string;
      full_name: string;
      phone: string;
      role: SignUpRole;
    }) => {
      if (!isSupabaseConfigured) return { error: "Chưa cấu hình Supabase." };

      const { data: result, error } = await supabase.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        // `handle_new_user` reads these to build the profile and role rows.
        options: {
          data: {
            full_name: data.full_name.trim(),
            phone: data.phone.trim(),
            role: data.role,
          },
        },
      });

      if (error) {
        return {
          error:
            error.message === "User already registered"
              ? "Email này đã được sử dụng."
              : error.message,
        };
      }
      // With email confirmation on, `signUp` returns a user but no session.
      return { needsConfirmation: !result.session };
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLandlord: user?.role === "landlord",
      isAdmin: user?.role === "admin",
      loading,
      configured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
    }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
