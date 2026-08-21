import { Link, useLocation } from "react-router-dom";
import { Compass, Map, CalendarDays, Heart, LayoutDashboard, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function BottomNav() {
  const { user, isLandlord } = useAuth();
  const location = useLocation();

  const items = [
    { to: "/", label: "Khám phá", icon: Compass },
    { to: "/map", label: "Bản đồ", icon: Map },
    ...(isLandlord
      ? [{ to: "/dashboard", label: "Quản lý", icon: LayoutDashboard }]
      : [{ to: "/bookings", label: "Lịch", icon: CalendarDays }]),
    { to: "/favorites", label: "Yêu thích", icon: Heart },
    user
      ? { to: "/bookings", label: "Lịch", icon: CalendarDays }
      : { to: "/auth", label: "Tài khoản", icon: User },
  ];

  const seen = new Set<string>();
  const tabs = items.filter((i) => !seen.has(i.to) && seen.add(i.to) !== undefined);

  return (
    <nav
      aria-label="Điều hướng chính"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg pb-safe"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0,1fr))` }}>
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center justify-center gap-1 h-14 text-[10px] font-medium transition-colors active:bg-foreground/5 ${
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" strokeWidth={2} aria-hidden />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
