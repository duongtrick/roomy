import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Nav, Footer } from "@/components/Nav";
import { toast } from "sonner";
import { LayoutDashboard, Home, Users, FileText, Zap, Receipt } from "lucide-react";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { RoomsTab } from "@/components/dashboard/RoomsTab";
import { TenantsTab } from "@/components/dashboard/TenantsTab";
import { LeasesTab } from "@/components/dashboard/LeasesTab";
import { MetersTab } from "@/components/dashboard/MetersTab";
import { InvoicesTab } from "@/components/dashboard/InvoicesTab";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Bảng điều khiển — Roomy" }] }),
  component: Dashboard,
});

type TabKey = "overview" | "rooms" | "tenants" | "leases" | "meters" | "invoices";

const TABS: { key: TabKey; label: string; short: string; icon: typeof Home }[] = [
  { key: "overview", label: "Tổng quan", short: "Tổng quan", icon: LayoutDashboard },
  { key: "rooms", label: "Phòng trọ", short: "Phòng", icon: Home },
  { key: "tenants", label: "Người thuê", short: "Người thuê", icon: Users },
  { key: "leases", label: "Hợp đồng", short: "Hợp đồng", icon: FileText },
  { key: "meters", label: "Chỉ số", short: "Chỉ số", icon: Zap },
  { key: "invoices", label: "Hoá đơn", short: "Hoá đơn", icon: Receipt },
];

function Dashboard() {
  const { user, isLandlord, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!isLandlord) {
      toast.error("Trang này chỉ dành cho chủ trọ.");
      navigate({ to: "/" });
    }
  }, [user, isLandlord, loading, navigate]);

  if (loading || !user || !isLandlord) return null;

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <div className="mb-5 md:mb-8">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            Bảng điều khiển
          </p>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif italic font-bold mt-1 md:mt-2">
            Quản lý phòng trọ
          </h1>
        </div>

        {/*
          Six tabs do not fit across a 375px screen. Rather than shrink them
          below a usable touch size, the strip scrolls horizontally with snap
          points and the active tab is scrolled into view. Icons carry the
          meaning when a label is clipped.
        */}
        <div className="sticky top-14 md:top-16 z-30 -mx-4 sm:-mx-6 bg-background/95 backdrop-blur border-b border-border mb-6">
          <div
            role="tablist"
            aria-label="Mục quản lý"
            className="flex gap-1 overflow-x-auto no-scrollbar snap-x px-4 sm:px-6"
            // Fades the strip's edges so a clipped tab reads as "scroll for
            // more" rather than a rendering glitch.
            style={{
              maskImage:
                "linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%)",
            }}
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={(e) => {
                    setTab(t.key);
                    e.currentTarget.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                      inline: "center",
                    });
                  }}
                  className={`snap-center shrink-0 inline-flex items-center gap-2 px-3 sm:px-4 h-12 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    active
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="whitespace-nowrap">{t.short}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div role="tabpanel">
          {tab === "overview" && <OverviewTab ownerId={user.id} />}
          {tab === "rooms" && <RoomsTab ownerId={user.id} />}
          {tab === "tenants" && <TenantsTab ownerId={user.id} />}
          {tab === "leases" && <LeasesTab ownerId={user.id} />}
          {tab === "meters" && <MetersTab ownerId={user.id} />}
          {tab === "invoices" && <InvoicesTab ownerId={user.id} />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
