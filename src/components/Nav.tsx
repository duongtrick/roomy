import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, LogOut, LayoutDashboard, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Nav() {
  const [open, setOpen] = useState(false);
  const { user, isLandlord, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const linkInactive = "text-muted-foreground hover:text-foreground transition-colors";
  const linkActive = "text-foreground";

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate({ to: "/" });
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-serif italic font-bold tracking-tighter text-primary">
            Roomy
          </Link>
          <div className="hidden md:flex gap-6 text-sm font-medium">
            <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: linkActive }} inactiveProps={{ className: linkInactive }}>
              Khám phá
            </Link>
            <Link to="/map" activeProps={{ className: linkActive }} inactiveProps={{ className: linkInactive }}>
              Bản đồ
            </Link>
            <Link to="/bookings" activeProps={{ className: linkActive }} inactiveProps={{ className: linkInactive }}>
              Lịch của tôi
            </Link>
            <Link to="/favorites" activeProps={{ className: linkActive }} inactiveProps={{ className: linkInactive }}>
              Yêu thích
            </Link>
            {isLandlord && (
              <Link to="/dashboard" activeProps={{ className: linkActive }} inactiveProps={{ className: linkInactive }}>
                Quản lý
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!loading && user ? (
            <>
              {isLandlord && (
                <Link to="/dashboard" className="hidden sm:inline-flex text-sm font-medium px-4 py-2 rounded-full border border-border hover:bg-foreground/5 transition-colors items-center gap-2">
                  <LayoutDashboard className="size-4" /> Đăng tin
                </Link>
              )}
              <button onClick={handleSignOut} className="hidden sm:inline-flex bg-foreground text-background text-sm font-medium px-5 py-2 rounded-full hover:opacity-90 transition-opacity items-center gap-2">
                <LogOut className="size-4" /> Đăng xuất
              </button>
            </>
          ) : !loading ? (
            <Link to="/auth" className="hidden sm:inline-flex bg-foreground text-background text-sm font-medium px-5 py-2 rounded-full hover:opacity-90 transition-opacity">
              Đăng nhập / Đăng ký
            </Link>
          ) : null}
          <button
            aria-label="Mở menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center size-10 rounded-full border border-border hover:bg-foreground/5 transition-colors"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background animate-fade-up">
          <div className="px-6 py-4 flex flex-col gap-4 text-base font-medium">
            <Link to="/" activeOptions={{ exact: true }} onClick={() => setOpen(false)} activeProps={{ className: linkActive }} inactiveProps={{ className: linkInactive }}>Khám phá</Link>
            <Link to="/map" onClick={() => setOpen(false)} activeProps={{ className: linkActive }} inactiveProps={{ className: linkInactive }}>Bản đồ</Link>
            <Link to="/bookings" onClick={() => setOpen(false)} activeProps={{ className: linkActive }} inactiveProps={{ className: linkInactive }}>Lịch của tôi</Link>
            <Link to="/favorites" onClick={() => setOpen(false)} activeProps={{ className: linkActive }} inactiveProps={{ className: linkInactive }}>Yêu thích</Link>
            {isLandlord && (
              <Link to="/dashboard" onClick={() => setOpen(false)} activeProps={{ className: linkActive }} inactiveProps={{ className: linkInactive }}>Quản lý phòng trọ</Link>
            )}
            <div className="flex gap-3 pt-2 border-t border-border">
              {user ? (
                <button onClick={handleSignOut} className="flex-1 bg-foreground text-background text-sm font-medium px-5 py-2 rounded-full hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2">
                  <LogOut className="size-4" /> Đăng xuất
                </button>
              ) : (
                <Link to="/auth" onClick={() => setOpen(false)} className="flex-1 bg-foreground text-background text-sm font-medium px-5 py-2 rounded-full hover:opacity-90 transition-opacity text-center">
                  Đăng nhập / Đăng ký
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border py-12 px-6 bg-stone-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-12">
        <div className="space-y-4">
          <span className="text-4xl font-serif italic font-bold text-primary">Roomy</span>
          <p className="text-muted-foreground max-w-sm text-sm">
            Kết nối cộng đồng thuê trọ văn minh tại thành phố Thái Nguyên.
          </p>
        </div>
        <div className="text-left md:text-right space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">© 2026 Roomy Vietnam</p>
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Thái Nguyên City Office</p>
        </div>
      </div>
    </footer>
  );
}
