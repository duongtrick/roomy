import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, LayoutDashboard, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const linkInactive = "text-muted-foreground hover:text-foreground transition-colors";
const linkActive = "text-foreground";

/**
 * Top bar.
 *
 * On phones this is a slim header showing only branding and the account
 * action — navigation itself lives in `BottomNav`, which is easier to reach
 * one-handed. The full link row appears from `md` up.
 */
export function Nav() {
  const { user, isLandlord, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border pt-safe">
      <div className="px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8 min-w-0">
          <Link
            to="/"
            className="inline-flex items-center min-h-11 text-2xl font-serif italic font-bold tracking-tighter text-primary shrink-0"
          >
            Roomy
          </Link>

          <nav aria-label="Điều hướng" className="hidden md:flex gap-6 text-sm font-medium">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: linkActive }}
              inactiveProps={{ className: linkInactive }}
            >
              Khám phá
            </Link>
            <Link
              to="/map"
              activeProps={{ className: linkActive }}
              inactiveProps={{ className: linkInactive }}
            >
              Bản đồ
            </Link>
            <Link
              to="/bookings"
              activeProps={{ className: linkActive }}
              inactiveProps={{ className: linkInactive }}
            >
              Lịch của tôi
            </Link>
            <Link
              to="/favorites"
              activeProps={{ className: linkActive }}
              inactiveProps={{ className: linkInactive }}
            >
              Yêu thích
            </Link>
            {isLandlord && (
              <Link
                to="/dashboard"
                activeProps={{ className: linkActive }}
                inactiveProps={{ className: linkInactive }}
              >
                Quản lý
              </Link>
            )}
          </nav>
        </div>

        {/* Reserve the slot while auth resolves so the header doesn't jump. */}
        <div className="flex items-center gap-2 shrink-0 min-h-11">
          {loading ? null : user ? (
            <>
              {isLandlord && (
                <Link
                  to="/dashboard"
                  className="hidden md:inline-flex items-center gap-2 text-sm font-medium px-4 h-11 rounded-full border border-border hover:bg-foreground/5 transition-colors"
                >
                  <LayoutDashboard className="size-4" /> Đăng tin
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Đăng xuất"
                className="inline-flex items-center justify-center gap-2 bg-foreground text-background text-sm font-medium h-11 w-11 md:w-auto md:px-5 rounded-full hover:opacity-90 active:scale-95 transition"
              >
                <LogOut className="size-4" />
                <span className="hidden md:inline">Đăng xuất</span>
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 bg-foreground text-background text-sm font-medium h-11 px-4 md:px-5 rounded-full hover:opacity-90 active:scale-95 transition"
            >
              <UserIcon className="size-4 md:hidden" />
              <span className="hidden md:inline">Đăng nhập / Đăng ký</span>
              <span className="md:hidden">Đăng nhập</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 md:mt-32 border-t border-border py-10 md:py-12 px-6 bg-stone-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between md:items-end gap-8 md:gap-12">
        <div className="space-y-3">
          <span className="text-3xl md:text-4xl font-serif italic font-bold text-primary">
            Roomy
          </span>
          <p className="text-muted-foreground max-w-sm text-sm">
            Kết nối cộng đồng thuê trọ văn minh tại thành phố Thái Nguyên.
          </p>
        </div>
        <div className="text-left md:text-right space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            © 2026 Roomy Vietnam
          </p>
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            Thái Nguyên City Office
          </p>
        </div>
      </div>
    </footer>
  );
}
