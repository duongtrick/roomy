import { getListings } from "@/lib/api/listings.api";
import { getTenants } from "@/lib/api/tenants.api";
import { getLeases } from "@/lib/api/leases.api";
import { getInvoices } from "@/lib/api/invoices.api";
import { Home, Users, Receipt, TrendingUp } from "lucide-react";
import { formatVNDExact } from "@/lib/format";
import { useOwnerData } from "@/hooks/use-owner-data";
import { currentPeriod, ROOM_STATUS_LABEL, STATUS_ORDER } from "@/lib/dashboard-types";
import type { Invoice, Lease, Listing, Tenant } from "@/lib/dashboard-types";

type OverviewData = {
  listings: Listing[];
  tenants: Tenant[];
  leases: Lease[];
  invoices: Invoice[];
};

const EMPTY: OverviewData = { listings: [], tenants: [], leases: [], invoices: [] };

async function fetchOverview(ownerId: string): Promise<OverviewData> {
  const [listings, tenants, leases, invoices] = await Promise.all([
    getListings({ data: { ownerId } }),
    getTenants({ data: { ownerId } }),
    getLeases({ data: { ownerId } }),
    getInvoices({ data: { ownerId } }),
  ]);
  return { listings, tenants, leases, invoices };
}

export function OverviewTab({ ownerId }: { ownerId: string }) {
  const { data } = useOwnerData(ownerId, fetchOverview, EMPTY);
  const { listings, tenants, leases, invoices } = data;

  const occupied = listings.filter((l) => l.status === "occupied").length;
  const available = listings.filter((l) => l.status === "available").length;
  const activeLeases = leases.filter((l) => l.status === "active").length;
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const unpaidAmt = unpaid.reduce((s, i) => s + i.total_amount, 0);

  // `currentPeriod()` is local time; comparing against a UTC month here made
  // revenue jump a month early for the first hours of each month in UTC+7.
  const thisPeriod = currentPeriod();
  const monthRevenue = invoices
    .filter((i) => i.status === "paid" && i.paid_at?.slice(0, 7) === thisPeriod)
    .reduce((s, i) => s + i.total_amount, 0);

  const stats = [
    {
      icon: Home,
      label: "Tổng phòng",
      value: listings.length,
      sub: `${occupied} đã thuê · ${available} trống`,
    },
    {
      icon: Users,
      label: "Người thuê",
      value: tenants.length,
      sub: `${activeLeases} hợp đồng đang hiệu lực`,
    },
    {
      icon: Receipt,
      label: "Hoá đơn chưa thu",
      value: unpaid.length,
      sub: formatVNDExact(unpaidAmt),
    },
    {
      icon: TrendingUp,
      label: "Doanh thu tháng này",
      value: formatVNDExact(monthRevenue),
      sub: "Từ hoá đơn đã thanh toán",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-serif italic font-bold mb-6">Tổng quan</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="border border-border rounded-2xl p-5 bg-background">
            <s.icon className="size-5 text-muted-foreground mb-3" />
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              {s.label}
            </p>
            <p className="text-2xl font-serif italic font-bold mt-1">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-border rounded-2xl p-5">
          <h3 className="font-medium mb-4">Tình trạng phòng</h3>
          {listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có phòng nào.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {STATUS_ORDER.map((st) => {
                const count = listings.filter((l) => l.status === st).length;
                const pct = (count / listings.length) * 100;
                return (
                  <li key={st}>
                    <div className="flex justify-between mb-1">
                      <span>{ROOM_STATUS_LABEL[st]}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 bg-foreground/5 rounded-full overflow-hidden">
                      <div className="h-full bg-foreground/70" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border border-border rounded-2xl p-5">
          <h3 className="font-medium mb-4">Hoá đơn chưa thanh toán</h3>
          {unpaid.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tất cả hoá đơn đã được thanh toán 🎉</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {unpaid.slice(0, 5).map((inv) => {
                const room = listings.find((l) => l.id === inv.listing_id);
                return (
                  <li
                    key={inv.id}
                    className="flex justify-between border-b border-border pb-2 last:border-0"
                  >
                    <span>
                      <span className="font-medium">{room?.title ?? "—"}</span>
                      <span className="text-muted-foreground"> · {inv.period}</span>
                    </span>
                    <span className="font-medium text-destructive">
                      {formatVNDExact(inv.total_amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
