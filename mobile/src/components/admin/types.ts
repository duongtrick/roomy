import type { AdminSnapshot } from "@/lib/api/admin";

/**
 * What every admin tab receives.
 *
 * Cùng khuôn với `components/dashboard/types.ts`: các tab là view thuần trên
 * một snapshot do `app/admin.tsx` tải, không tab nào tự truy vấn. Duyệt một
 * tin làm đổi cả hàng chờ lẫn số liệu tổng quan, nên `reload` nạp lại tất cả.
 */
export type AdminTabProps = {
  data: AdminSnapshot;
  reload: () => Promise<void>;
};
