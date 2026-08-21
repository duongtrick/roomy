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

const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { key: "rooms", label: "Phòng trọ", icon: Home },
  { key: "tenants", label: "Người thuê", icon: Users },
  { key: "leases", label: "Hợp đồng", icon: FileText },
  { key: "meters", label: "Chỉ số", icon: Zap },
  { key: "invoices", label: "Hoá đơn", icon: Receipt },
];

function Dashboard() {
  const { user, isLandlord, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!isLandlord) { toast.error("Trang này chỉ dành cho chủ trọ."); navigate({ to: "/" }); }
  }, [user, isLandlord, loading, navigate]);

  if (loading || !user || !isLandlord) return null;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Bảng điều khiển</p>
          <h1 className="text-4xl md:text-5xl font-serif italic font-bold mt-2">Quản lý phòng trọ</h1>
        </div>

        <div className="border-b border-border mb-8 overflow-x-auto">
          <nav className="flex gap-1 min-w-max">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    active
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" /> {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {tab === "overview" && <OverviewTab ownerId={user.id} />}
        {tab === "rooms" && <RoomsTab ownerId={user.id} />}
        {tab === "tenants" && <TenantsTab ownerId={user.id} />}
        {tab === "leases" && <LeasesTab ownerId={user.id} />}
        {tab === "meters" && <MetersTab ownerId={user.id} />}
        {tab === "invoices" && <InvoicesTab ownerId={user.id} />}
      </main>
      <Footer />
    </div>
  );
}
