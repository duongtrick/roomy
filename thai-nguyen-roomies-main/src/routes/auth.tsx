import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Home, Mail, Lock, User as UserIcon, Phone } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Đăng nhập / Đăng ký — Roomy" }] }),
  component: AuthPage,
});

type Mode = "login" | "signup";
type Role = "tenant" | "landlord";

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("tenant");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, phone, role },
          },
        });
        if (error) throw error;
        toast.success("Đăng ký thành công! Bạn đã đăng nhập.");
        navigate({ to: role === "landlord" ? "/dashboard" : "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Đăng nhập thành công!");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      }
    });
    if (error) {
      toast.error("Đăng nhập Google thất bại");
      setSubmitting(false);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 text-3xl font-serif italic font-bold text-primary">
          <Home className="size-7" /> Roomy
        </Link>

        <div className="bg-background rounded-3xl border border-border p-8 shadow-sm">
          <div className="flex gap-1 p-1 bg-stone-100 rounded-full mb-6">
            <button onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${mode === "login" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              Đăng nhập
            </button>
            <button onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${mode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              Đăng ký
            </button>
          </div>

          <h1 className="text-2xl font-serif italic font-bold mb-1">
            {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login" ? "Tiếp tục hành trình tìm chốn an cư." : "Tham gia cộng đồng Roomy hôm nay."}
          </p>

          <form onSubmit={handleEmail} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bạn là</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setRole("tenant")}
                      className={`p-3 rounded-xl border text-sm font-medium transition-colors ${role === "tenant" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
                      🔍 Người tìm trọ
                    </button>
                    <button type="button" onClick={() => setRole("landlord")}
                      className={`p-3 rounded-xl border text-sm font-medium transition-colors ${role === "landlord" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
                      🏠 Chủ trọ
                    </button>
                  </div>
                </div>
                <Field icon={<UserIcon className="size-4" />} placeholder="Họ và tên" value={fullName} onChange={setFullName} required />
                <Field icon={<Phone className="size-4" />} placeholder="Số điện thoại" value={phone} onChange={setPhone} />
              </>
            )}
            <Field icon={<Mail className="size-4" />} type="email" placeholder="Email" value={email} onChange={setEmail} required />
            <Field icon={<Lock className="size-4" />} type="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)" value={password} onChange={setPassword} required minLength={6} />

            <button type="submit" disabled={submitting}
              className="w-full bg-foreground text-background font-medium py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50">
              {submitting ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">hoặc</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button onClick={handleGoogle} disabled={submitting}
            className="w-full flex items-center justify-center gap-3 border border-border rounded-full py-3 text-sm font-medium hover:bg-foreground/5 transition-colors disabled:opacity-50">
            <GoogleIcon /> Tiếp tục với Google
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, value, onChange, ...props }: {
  icon: import("react").ReactNode; value: string; onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full pl-11 pr-4 py-3 rounded-full border border-border bg-background focus:outline-none focus:border-foreground/40 text-sm"
        {...props} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
  );
}
