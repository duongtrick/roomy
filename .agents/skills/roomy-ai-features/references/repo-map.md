# Bản đồ repo Roomy (đã kiểm chứng ngày 2026-09-28)

Nguồn: clone nông (`--depth 1`) `github.com/duongtrick/roomy`, commit `6cb7cb2`. `npm ci` + `npx tsc --noEmit` chạy sạch (0 lỗi). Chưa chạy app thật hay Supabase thật.

## Stack (theo `mobile/package.json`)

Expo `~57.0.15`, React Native `0.86.2`, React `19.2.3`, expo-router `~57.0.15`, `@supabase/supabase-js ^2.112.3`, `zod ^4.4.3`, TypeScript `~6.0.3`, `react-native-webview`, `react-native-reanimated 4.5.1`, `lucide-react-native`. **Không có**: expo-image-picker, expo-camera, expo-notifications, react-native-maps (README nhắc nhưng code đã chuyển sang WebView + Leaflet), framework test, CI.

## Cây thư mục chính

```
/                       docs/ (APK 52MB, screenshots), Font/, .claude/launch.json
mobile/
  app/                  expo-router: (tabs)/{index,map,bookings,favorites,account}, room/[id],
                        book/[roomId], auth, dashboard, admin, +not-found, _layout
  src/lib/              supabase.ts, filters.ts, suggest.ts, geocode.ts (Nominatim),
                        verification.ts, moderation.ts, format.ts, database.types.ts (viết tay)
  src/lib/api/          catalogue, dashboard, bookings, favorites, admin, reviews, errors
  src/hooks/            use-auth.tsx, use-async.ts, use-favorites.tsx
  src/components/       ui.tsx (Title, Display, Badge, PrimaryButton, AccentButton, Field,
                        TextInput, Select, Sheet, Card, EmptyState...), RoomCard, LeafletMap,
                        RoomsMap, LocationPicker, ReviewComposer, dashboard/*, admin/*
  supabase/             schema.sql (nguồn duy nhất), patches/, reset.sql   ← KHÔNG có functions/, config.toml
  scripts/seed.mjs      3 tài khoản demo + 15 phòng
```

## Lệnh

Từ `mobile/`: `npm ci`, `npm run typecheck`, `npx expo start`, `npm run seed` (cần `.env.seed` với service role — không đặt `EXPO_PUBLIC_`).

## Cơ sở dữ liệu

- Bảng: profiles, user_roles, listings, tenants, leases, meter_readings, invoices, listing_images, reviews, favorites, bookings (11 bảng, RLS bật hết).
- Vai trò `app_role`: landlord | tenant | admin, lưu ở `user_roles` (không tin metadata JWT). Trigger `handle_new_user` hạ `admin` xuống `tenant`.
- View: `public_listings` (chỉ tin `is_published` **và** `moderation_status='approved'`), `owner_listings`, `admin_listings`, `admin_reviews`. Khách chỉ đọc view, không đọc bảng gốc.
- `public_listings` hiện **không** có `electricity_rate`, `water_rate` (nằm ở bảng gốc) — xem known-issues #6.
- Trigger canh cột đặc quyền: `listings_guard_verification`, `listings_guard_moderation`, `tenants_guard_account_link`, `bookings_guard_changes`, `leases_guard_*`, `reviews_set_author`.
- Ràng buộc đáng nhớ: `leases_one_active_per_listing`; `invoices (listing_id, period)` unique; `invoices_paid_at_check` (status và paid_at phải khớp); `meter_readings` end ≥ start; `listings_publishable` (tin công khai bắt buộc có tên, địa chỉ, lat/lng); `bookings.view_time` chỉ nhận 9 khung giờ cố định.
- Storage: bucket công khai `room-photos`; policy upload/replace/delete xem quanh dòng 586–597 và 1197–1215 của `schema.sql` (đọc để biết quy ước đường dẫn trước khi làm upload).
- Đánh giá: chỉ người có hợp đồng trên đúng phòng mới viết được (`can_review_listing`, `claim_tenancy`). Đây là dữ liệu "đã thuê thật" — tài sản cạnh tranh, đừng làm yếu.
- Khoảng cách tới trường: `distance_to_school` (mét, số nguyên) + `school_name`, **do chủ trọ nhập tay**.

## Luồng dữ liệu quan trọng

- Trang Khám phá: `getRooms()` tải toàn bộ tin công khai một lần (kèm ảnh + đánh giá dạng JSON), lọc/sắp xếp ở máy (`filters.ts`), gợi ý bằng luật (`suggest.ts`: xác thực 25đ, còn trống 20đ, gần trường tối đa 25đ, giá dưới trung vị tối đa 16đ, rating, tiện ích, khu vực đã lưu 15đ).
- Chủ trọ: `dashboard.tsx` 6 tab (Tổng quan, Phòng, Người thuê, Hợp đồng, Chỉ số, Hoá đơn); lịch xem phòng nằm ở tab Lịch của app chính (`(tabs)/bookings`). Chỉ số điện/nước **nhập tay**; hoá đơn chỉ đánh dấu đã thu/chưa thu, chưa nối thanh toán.
- Admin: hàng chờ → duyệt/từ chối (bắt buộc lý do) → xác thực riêng.

## Mở rộng AI cần tạo mới

`mobile/supabase/config.toml` (qua `supabase init`), `mobile/supabase/functions/`, bảng `ai_usage`, bucket riêng tư cho ảnh công tơ, `src/lib/api/ai.ts`, và các gói Expo cho camera/chọn ảnh (kiểm tra tương thích SDK 57 trước khi cài).
