import { Link } from "@tanstack/react-router";
import { Compass, Map, CalendarDays, Heart, LayoutDashboard, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

/**
 * Mobile-only bottom tab bar.
 *
 * Phones reach the bottom of the screen far more comfortably than the top, so
 * primary navigation lives here rather than behind a hamburger. Hidden from
 * `md` up, where the top nav in `Nav` takes over.
 *
 * Pages that render this must also apply `pb-nav`, which reserves the bar's
 * height plus the iOS home-indicator inset so nothing is covered.
 */
export function BottomNav() {
  const { user, isLandlord } = useAuth();

  const items = [
    { to: "/", label: "Khám phá", icon: Compass, exact: true },
    { to: "/map", label: "Bản đồ", icon: Map },
    ...(isLandlord
      ? [{ to: "/dashboard", label: "Quản lý", icon: LayoutDashboard }]
      : [{ to: "/bookings", label: "Lịch", icon: CalendarDays }]),
    { to: "/favorites", label: "Yêu thích", icon: Heart },
    user
      ? { to: "/bookings", label: "Lịch", icon: CalendarDays }
      : { to: "/auth", label: "Tài khoản", icon: User },
  ];

  // A landlord would otherwise get "Lịch" twice (slot 3 and slot 5).
  const seen = new Set<string>();
  const tabs = items.filter((i) => !seen.has(i.to) && seen.add(i.to) !== undefined);

  return (
    <nav
      aria-label="Điều hướng chính"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg pb-safe"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0,1fr))` }}>
        {tabs.map(({ to, label, icon: Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={exact ? { exact: true } : undefined}
              // 56px tall: comfortably above the 44px minimum touch target.
              className="flex flex-col items-center justify-center gap-1 h-14 text-[10px] font-medium text-muted-foreground transition-colors active:bg-foreground/5"
              activeProps={{ className: "text-primary", "aria-current": "page" }}
            >
              <Icon className="size-5" strokeWidth={2} aria-hidden />
              <span className="leading-none">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
