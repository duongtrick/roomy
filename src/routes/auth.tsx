import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const { user, loading, signIn, signUp } = useAuth();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const result = await signUp({ email, password, full_name: fullName, phone, role });
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Đăng ký thành công!");
          navigate({ to: role === "landlord" ? "/dashboard" : "/" });
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Đăng nhập thành công!");
          navigate({ to: "/" });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-stone-50 flex items-center justify-center px-4 py-8 sm:py-12 pt-safe pb-safe">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 mb-6 sm:mb-8 text-3xl font-serif italic font-bold text-primary"
        >
          <Home className="size-7" /> Roomy
        </Link>

        <div className="bg-background rounded-3xl border border-border p-5 sm:p-8 shadow-sm">
          <div className="flex gap-1 p-1 bg-stone-100 rounded-full mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 h-11 rounded-full text-sm font-medium transition-colors ${mode === "login" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 h-11 rounded-full text-sm font-medium transition-colors ${mode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              Đăng ký
            </button>
          </div>

          <h1 className="text-2xl font-serif italic font-bold mb-1">
            {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "login"
              ? "Tiếp tục hành trình tìm chốn an cư."
              : "Tham gia cộng đồng Roomy hôm nay."}
          </p>

          {mode === "login" && (
            <div className="mb-6 p-3 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-xs text-blue-800 font-medium mb-1">Tài khoản demo:</p>
              <p className="text-xs text-blue-700">
                Chủ trọ: <code className="bg-blue-100 px-1 rounded">demo@roomy.vn</code> /{" "}
                <code className="bg-blue-100 px-1 rounded">123456</code>
              </p>
              <p className="text-xs text-blue-700">
                Người thuê: <code className="bg-blue-100 px-1 rounded">tenant@roomy.vn</code> /{" "}
                <code className="bg-blue-100 px-1 rounded">123456</code>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Bạn là
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("tenant")}
                      className={`p-3 min-h-14 rounded-xl border text-sm font-medium transition-colors active:scale-95 ${role === "tenant" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}
                    >
                      🔍 Người tìm trọ
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("landlord")}
                      className={`p-3 min-h-14 rounded-xl border text-sm font-medium transition-colors active:scale-95 ${role === "landlord" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}
                    >
                      🏠 Chủ trọ
                    </button>
                  </div>
                </div>
                <Field
                  icon={<UserIcon className="size-4" />}
                  placeholder="Họ và tên"
                  value={fullName}
                  onChange={setFullName}
                  required
                />
                <Field
                  icon={<Phone className="size-4" />}
                  placeholder="Số điện thoại"
                  value={phone}
                  onChange={setPhone}
                />
              </>
            )}
            <Field
              icon={<Mail className="size-4" />}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              icon={<Lock className="size-4" />}
              type="password"
              placeholder="Mật khẩu (tối thiểu 6 ký tự)"
              value={password}
              onChange={setPassword}
              required
              minLength={6}
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-foreground text-background font-medium h-12 rounded-full hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
            >
              {submitting ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  value,
  onChange,
  ...props
}: {
  icon: import("react").ReactNode;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-11 pr-4 h-12 rounded-full border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-foreground/40 transition text-base sm:text-sm"
        {...props}
      />
    </div>
  );
}
