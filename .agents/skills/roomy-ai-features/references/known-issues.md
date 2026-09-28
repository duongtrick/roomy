# Lỗi và khoảng trống đã biết (review 2026-09-28)

Mức độ tin cậy: **[đã xác nhận]** = đọc code/chạy công cụ; **[suy luận]** = hợp lý nhưng chưa chạy thật. Chưa chạy app, chưa chạy SQL trên Supabase thật, chưa đọc từng dòng mọi file UI (đặc biệt `RoomsTab.tsx` 1416 dòng, `ModerationSheet.tsx`, `LocationPicker.tsx`).

## Phase 0 — sửa trước khi thêm AI

### 1. Quản trị viên cấp bằng lệnh trong README bị hạ về "người thuê" — [đã xác nhận qua đọc code]
- `src/hooks/use-auth.tsx`, hàm `loadUser`: đọc vai trò bằng `.from("user_roles").select("role").eq("user_id", …).maybeSingle()`.
- `maybeSingle()` trong postgrest-js trả `error PGRST116` và `data = null` khi có **hơn 1 hàng** → `role` rơi về `"tenant"`.
- README hướng dẫn cấp admin bằng `INSERT INTO user_roles … 'admin'` cho tài khoản đã đăng ký (đã có hàng `tenant`/`landlord`) → 2 hàng → mất nút vào bảng quản trị.
- `scripts/seed.mjs` (`promoteToAdmin`) tránh lỗi này vì **xoá vai trò cũ trước rồi mới chèn** — nên demo chạy được còn tài khoản thật thì không.
- Sửa: đọc mọi hàng (`.select("role")` không `maybeSingle`), chọn theo thứ bậc `admin > landlord > tenant`; hoặc sửa README thành xoá-rồi-chèn. Nên làm cả hai. Thêm kiểm thử thuần cho hàm chọn vai trò.

### 2. README lệch code — [đã xác nhận]
- Nói bản đồ dùng `react-native-maps` + khoá Google; code đã chuyển sang WebView + Leaflet (`LeafletMap.tsx`, `RoomsMap.tsx`); `package.json` không có `react-native-maps`.
- README và `.env.example` nhắc `app.config.ts` và `GOOGLE_MAPS_ANDROID_API_KEY`; **file `app.config.ts` không tồn tại** (chỉ có `app.json`) → hướng dẫn build Android không còn đúng.
- README ghi "Viết đánh giá chưa có UI" nhưng `ReviewComposer` đã có và được dùng ở `app/room/[id].tsx`.
- Sửa: đồng bộ README; xoá hoặc viết lại mục "Build Android".

### 3. Số CCCD lưu dạng văn bản thường — [đã xác nhận]
- `tenants.id_number` hiển thị ở `TenantsTab.tsx` và `RoomsTab.tsx` (`CCCD: …`).
- Luật Bảo vệ dữ liệu cá nhân 2025 (Luật 91/2025/QH15) có hiệu lực từ 01/01/2026. Cần rà soát với người có chuyên môn pháp lý xem số căn cước có thuộc nhóm dữ liệu nhạy cảm theo danh mục của Chính phủ không.
- Sửa tối thiểu: chỉ thu khi cần, che khi hiển thị (`•••• 1234`), không đưa vào bất kỳ prompt/log nào, có chính sách xoá khi hợp đồng kết thúc. Cân nhắc bỏ hẳn cột nếu chỉ dùng cho ghi chú.

### 4. Khoảng cách tới trường do chủ trọ tự khai — [đã xác nhận]
- Chú thích schema nói "đo theo đường đi", nhưng không nơi nào tính; giá trị do chủ trọ nhập.
- Nó ảnh hưởng lọc, sắp xếp và tới 25 điểm trong `suggest.ts` → có thể bị thổi phồng để lên hạng.
- Sửa: tính ở server từ `lat/lng` tới bảng `schools` bằng API định tuyến, lưu thêm `distance_source` (`computed` | `landlord`), hiển thị nguồn. Thuộc tính năng C3.

### 5. Không có kiểm thử và CI — [đã xác nhận]
- Không có `*.test.*`, `*.spec.*`, `.github/`, jest config. Typecheck sạch nhưng logic trong trigger/RLS chưa có bảo chứng.
- Sửa tối thiểu: (a) kiểm thử thuần cho `filters.ts`, `suggest.ts`, hàm chọn vai trò; (b) script SQL (pgTAP hoặc `psql`) thử: người thuê không tự nâng `verification`, chủ trọ không tự nối `tenants.user_id`, khách không đọc bảng gốc, người chưa thuê không viết được đánh giá; (c) workflow CI chạy `npm ci && npm run typecheck`.

### 6. Khách không thấy giá điện/nước trước khi thuê — [đã xác nhận]
- `listings.electricity_rate` (mặc định 3500) và `water_rate` (mặc định 25000) nằm ở bảng gốc; `public_listings` **không** chọn hai cột này.
- Đây là câu hỏi hàng đầu của người thuê và là điều kiện để làm "Giá thật" (A5).
- Sửa: thêm hai cột vào `public_listings` (DROP VIEW + CREATE VIEW như patch `2026-09-28-public-review-privacy.sql`), cập nhật `catalogue.ts`, `RoomCard`, trang chi tiết.

## Nên sửa (không chặn AI)

7. **Leaflet tải từ unpkg, không có `integrity`** (`LeafletMap.tsx` dòng ~53, ~66) [đã xác nhận]; nếu CDN chậm/bị chặn thì bản đồ trắng. Gói sẵn tài nguyên hoặc thêm SRI. Ô nền dùng CARTO basemaps: đọc điều khoản trước khi thương mại hoá [chưa kiểm tra điều khoản].
8. **Số điện thoại chủ trọ công khai cho khách** qua `public_listings.owner` [đã xác nhận] — hợp lý cho sản phẩm nhưng dễ bị cào. Cân nhắc "bấm để hiện" cho người đã đăng nhập, có giới hạn tần suất.
9. **`saveListing` gọi lại `getListings()` để tìm dòng vừa lưu** (`api/dashboard.ts`) [đã xác nhận] — tải lại toàn bộ phòng của chủ sau mỗi lần lưu. Chọn theo id từ `owner_listings`.
10. **`getRooms()` không phân trang**; lọc ở máy [đã xác nhận]. Ổn với vài trăm tin; tìm kiếm ngữ nghĩa (A1) buộc chuyển xếp hạng lên server.
11. **Repo nặng ~138MB**: APK 52MB nằm trong git (`docs/apk`), phông chữ trùng ở `Font/` và `mobile/assets/fonts`, `supabase/.temp` bị commit [đã xác nhận]. Chuyển APK sang GitHub Releases.
12. **Thiếu upload ảnh trong app** (README tự nhận) — chặn A2. Cần expo-image-picker + upload vào `room-photos` theo đúng policy.

## Điểm mạnh cần giữ

Vai trò lưu ở bảng riêng và không tin metadata JWT; trigger chặn tự nâng `verification`/`moderation_status`; tách view công khai/riêng; đánh giá chỉ từ người có hợp đồng; `toVerification()` rơi về mức thấp nhất khi gặp giá trị lạ; `fold()` bỏ dấu không phụ thuộc Hermes; `suggest.ts` có lý do kèm điểm; app không vỡ khi thiếu khoá Supabase.
