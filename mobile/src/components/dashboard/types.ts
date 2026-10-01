import type { DashboardSnapshot } from "@/lib/api/dashboard";

export type DashboardTabKey = "overview" | "rooms" | "tenants" | "leases" | "meters" | "invoices";

/**
 * What every dashboard tab receives.
 *
 * The tabs are pure views over one snapshot fetched by `app/dashboard.tsx`;
 * they never query on their own. After a write they call `reload`, which
 * refreshes all five tables at once — a room going from free to occupied
 * changes the lease list and the overview counts too.
 */
export type TabProps = {
  data: DashboardSnapshot;
  reload: () => Promise<void>;
  goToTab?: (tab: DashboardTabKey) => void;
};
