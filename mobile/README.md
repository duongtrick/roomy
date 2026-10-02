# Roomy — ứng dụng React Native

Ứng dụng tìm & quản lý phòng trọ tại Thái Nguyên. Backend là **Supabase**
(Postgres + Auth + Storage); app không còn dữ liệu cục bộ nào ngoài phiên đăng
nhập.

## Tính năng

| Chức năng                  | Hiện trạng | Ở đâu trong app                                   |
| -------------------------- | ---------- | ------------------------------------------------- |
| Tìm kiếm phòng (từ khoá)   | Đã có      | Khám phá — ô tìm kiếm, bỏ dấu tiếng Việt          |
| Hỏi Roomy bằng AI          | Đã có nền tảng | Khám phá — Edge Function `ai-search`, fallback khi chưa cấu hình model |
| Lọc theo khu vực           | Đã có      | Khám phá — danh sách khu vực lấy từ tin đang đăng |
| Lọc theo mức giá           | Đã có      | Khám phá — 4 khoảng giá                           |
| Lọc theo khoảng cách trường | Đã có     | Khám phá — dưới 500 m / 1 km / 2 km               |
| Sắp xếp (giá, gần trường)  | Đã có      | Khám phá — ô "Sắp xếp"                            |
| Hiển thị thông tin phòng   | Đã có      | Chi tiết phòng — ảnh, giá, diện tích, tiện ích    |
| Giá điện/nước công khai    | Đã có      | Thẻ phòng và Chi tiết phòng — chi phí sử dụng     |
| Xác thực tin đăng/chủ trọ  | Đã có      | Huy hiệu trên thẻ phòng · chủ trọ gửi yêu cầu ở Bảng điều khiển |
| Kiểm duyệt tin trước khi đăng | Đã có   | Bảng quản trị → Hàng chờ; tin chưa duyệt không hiện công khai |
| Quản trị hệ thống          | Đã có      | Tài khoản → Bảng quản trị — 4 tab                  |
| Đánh giá phòng             | Đã có (chỉ người đã thuê) | Chi tiết phòng → ô viết đánh giá     |
| Gợi ý phòng                | Đã có (luật) | Khám phá — "Gợi ý cho bạn", chấm điểm ở `src/lib/suggest.ts` |
| Bản đồ phòng               | Đã có      | Bản đồ — Leaflet trong WebView, không cần khoá Google Maps |
| Đặt lịch xem phòng         | Đã có      | Chi tiết phòng → Đặt lịch; chủ trọ duyệt ở tab Lịch |
| Yêu thích                  | Đã có      | Trái tim trên thẻ phòng, lưu theo tài khoản       |
| Quản lý phòng / đăng tin   | Đã có      | Bảng điều khiển — 6 tab                           |
| Hợp đồng                   | Đã có (bản giấy) | Bảng điều khiển → Hợp đồng. **Chưa có ký điện tử** |
| Hoá đơn tiền phòng         | Đã có      | Bảng điều khiển → Hoá đơn, tính từ chỉ số điện nước |
| Thanh toán trực tuyến      | **Chưa có** | Hoá đơn chỉ đánh dấu đã thu/chưa thu, không nối cổng thanh toán |

Hai dòng cuối là giới hạn có chủ ý: ký điện tử và cổng thanh toán đều cần pháp
nhân và hợp đồng với nhà cung cấp, nằm ngoài phạm vi bản này.

## Chạy thử

```bash
cd mobile
npm install
cp .env.example .env      # rồi điền URL + anon key
npx expo start
```

Quét mã QR bằng **Expo Go**, hoặc bấm `a` (Android) / `i` (iOS).

Chưa điền key thì app vẫn chạy — mọi màn hình hiện trạng thái "Chưa kết nối
Supabase" thay vì lỗi mạng khó hiểu.

## Dựng backend

**1. Tạo project** tại [supabase.com](https://supabase.com) (mình không tạo hộ
được — cần tài khoản của bạn).

**2. Tạo bảng.** Mở `supabase/schema.sql`, copy toàn bộ, dán vào SQL Editor,
Run. Một lần là xong — cả file nằm trong một transaction nên lỗi ở đâu cũng
rollback sạch, không để lại bảng dở dang.

Đừng chạy lẻ từng khối trong file: thứ tự bên trong theo phụ thuộc (định danh →
phòng/hợp đồng → phần công khai), chạy sai thứ tự sẽ báo
`42P01: relation "public.listings" does not exist`.

Lỡ chạy dở và muốn làm lại: chạy `supabase/reset.sql` (xoá sạch schema Roomy,
**mất dữ liệu**) rồi chạy lại `schema.sql`.

Kiểm tra đã xong chưa:

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
-- kỳ vọng 11 bảng: bookings, favorites, invoices, leases, listing_images,
-- listings, meter_readings, profiles, reviews, tenants, user_roles
```

**3. Tắt xác nhận email** (Authentication → Providers → Email → tắt *Confirm
email*) nếu muốn đăng ký xong đăng nhập được ngay.

**4. Điền key** vào `mobile/.env` — lấy ở Project Settings → API:

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

**5. Nạp dữ liệu mẫu** (tuỳ chọn). Tạo `mobile/.env.seed` (file này đã được
gitignore) rồi điền:

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Sau đó chạy:

```bash
npm run seed
```

Script tạo 3 tài khoản demo, 15 phòng (13 tin đăng công khai: 10 đã duyệt, 2
chờ duyệt, 1 bị từ chối), tải 15 ảnh demo lên Storage (mỗi phòng một cover), cùng người thuê / hợp đồng /
chỉ số / hoá đơn. Chạy lại được nhiều lần. Ba tin chưa duyệt là cố ý — để Bảng
quản trị có việc thật mà thao tác ngay sau khi seed.

Dữ liệu 15 phòng là dữ liệu minh hoạ dựng để kiểm thử chức năng, không đại
diện cho thị trường nhà trọ Thái Nguyên.

| Vai trò      | Email             | Mật khẩu      |
| ------------ | ----------------- | ------------- |
| Chủ trọ      | `demo@roomy.vn`   | `roomy123456` |
| Người thuê   | `tenant@roomy.vn` | `roomy123456` |
| Quản trị viên | `admin@roomy.vn` | `roomy123456` |

Tài khoản người thuê demo được nối sẵn với một hợp đồng đã kết thúc ở phòng
"P.403 — Phòng Sinh Viên Nông Lâm", nên đăng nhập vào là viết được đánh giá cho
đúng phòng đó (và chỉ phòng đó).

> `SUPABASE_SERVICE_ROLE_KEY` bỏ qua toàn bộ RLS. Không đặt tiền tố
> `EXPO_PUBLIC_` cho nó và đừng đặt trong `.env`: Expo/Metro có thể đưa biến
> môi trường vào log chẩn đoán. Chỉ dùng `.env.seed` hoặc biến môi trường tạm
> thời khi chạy script seed.

## AI Search

Ô **Hỏi Roomy** gọi Supabase Edge Function `ai-search`. Function ẩn email, số
điện thoại và dãy số nhạy cảm trước khi gửi sang mô hình, yêu cầu JSON có cấu
trúc rồi app tự lọc phòng theo dữ liệu thật. Nếu chưa deploy function hoặc chưa
set `OPENAI_API_KEY`, app dùng fallback trên máy để vẫn hiểu các câu cơ bản
như "tân sinh viên gần ICTU dưới 2 triệu".

Deploy function:

```bash
cd mobile
npx supabase login
npx supabase functions deploy ai-search --project-ref <ref>
npx supabase secrets set OPENAI_API_KEY=<key> --project-ref <ref>
```

Tuỳ chọn đổi model:

```bash
npx supabase secrets set OPENAI_MODEL=gpt-5-mini --project-ref <ref>
```

## Build Android

Bản đồ trong app chạy bằng `LeafletMap` trong WebView, dùng tile OpenStreetMap
qua CARTO Voyager. Vì vậy bản Android hiện không cần `react-native-maps`, không
cần `app.config.ts`, và không cần `GOOGLE_MAPS_ANDROID_API_KEY`.

## Quản trị hệ thống

Ba vai trò: `tenant`, `landlord`, `admin`. Quản trị viên có bảng riêng ở
`app/admin.tsx` (Tài khoản → **Bảng quản trị hệ thống**) với 4 tab: Tổng quan,
Hàng chờ, Tin đăng, Đánh giá.

**Cấp quyền quản trị.** Không có ô "đăng ký làm admin", và cũng không thể có:
`raw_user_meta_data` do chính người đăng ký gửi lên nên trigger
`handle_new_user` hạ mọi yêu cầu `admin` xuống `tenant`. Cấp quyền bằng một câu
chạy trong SQL Editor (quyền `postgres`, bỏ qua RLS):

```sql
delete from public.user_roles
where user_id in (select id from auth.users where email = 'ban@example.com');

insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'ban@example.com';
```

Tài khoản đó đăng xuất rồi đăng nhập lại là thấy nút vào bảng quản trị.

**Vòng đời một tin đăng.**

| Bước | Ai làm | Kết quả |
| ---- | ------ | ------- |
| Tạo tin, bật "hiển thị công khai" | Chủ trọ | `moderation_status = 'pending'` — chưa ai thấy |
| Duyệt | Quản trị viên | `approved` — tin lên trang Khám phá và Bản đồ |
| Từ chối (bắt buộc ghi lý do) | Quản trị viên | `rejected` — tin ẩn, chủ trọ đọc được lý do |
| Sửa nội dung công khai của tin đã duyệt | Chủ trọ | tự quay về `pending` |
| Gỡ tin | Quản trị viên | `is_published = false`, dữ liệu phòng giữ nguyên |

Kiểm duyệt (`moderation_status`) và xác thực (`verification`) là hai cột khác
nhau: một bên xét *bài đăng*, một bên xét *giấy tờ chủ trọ*. Một chủ trọ đã xác
thực vẫn có thể đăng một tin sai giá, nên gộp làm một là mất khả năng nói "tin
ổn, giấy tờ chưa".

Bốn cột `moderation_*` do trigger `listings_guard_moderation` canh: chủ trọ
sửa được tin của mình, nên nếu không chặn thì một lệnh update là tin tự duyệt.

**Đánh giá chỉ từ người đã thuê.** Policy `"Tenants review rooms they rented"`
đòi người viết phải có hợp đồng trên đúng phòng đó (còn hiệu lực hay đã kết
thúc đều được), mỗi người một đánh giá cho mỗi phòng. Chuỗi liên kết:

1. Chủ trọ điền **email Roomy** của người thuê vào hồ sơ ở tab Người thuê.
2. Người thuê đăng nhập, vào tab Tài khoản, bấm **"Nhận hồ sơ thuê của tôi"**
   (`claim_tenancy`) — hàm chỉ nối những hồ sơ ghi đúng email của tài khoản
   đang đăng nhập và chưa nối với ai.
3. Từ đó hợp đồng của hồ sơ đó mở khoá ô viết đánh giá ở trang chi tiết phòng.

Hai đầu đều phải chủ động là có lý do: nếu chủ trọ tự nối được hồ sơ vào một
tài khoản bất kỳ thì họ tự cấp quyền khen phòng mình — nên trigger
`tenants_guard_account_link` chặn mọi lần chủ trọ ghi `user_id` (gỡ nối thì
vẫn cho, để sửa khi điền nhầm email). `author_name` cũng không nhận từ client
mà lấy từ hồ sơ, để không ai ký tên chủ trọ dưới một nhận xét.

Đánh giá cũ (dữ liệu mẫu, hoặc dòng có trước bản này) không có hợp đồng chống
lưng nên hiện cờ **"Không hợp đồng"** trong tab Đánh giá của bảng quản trị;
quản trị viên gỡ được mọi đánh giá, người viết sửa/xoá được đánh giá của mình.

## Cơ sở dữ liệu

11 bảng, tất cả bật RLS. `has_role()` và `is_admin()` là hàm `SECURITY DEFINER`
để policy kiểm tra vai trò mà không cần cấp quyền đọc bảng `user_roles`.

| Bảng                        | Ai đọc được                            | Ai ghi được              |
| --------------------------- | -------------------------------------- | ------------------------ |
| `profiles`                  | chính chủ; thông tin chủ phòng qua view công khai | chính chủ |
| `user_roles`                | chính chủ                              | chỉ trigger lúc đăng ký  |
| `listings`                  | view công khai cho khách · view riêng cho chủ | chủ trọ sở hữu |
| `tenants` `leases`          | chủ trọ sở hữu                         | chủ trọ sở hữu           |
| `meter_readings` `invoices` | chủ trọ sở hữu                         | chủ trọ sở hữu           |
| `listing_images`            | theo phòng tương ứng                   | chủ phòng                |
| `reviews`                   | theo phòng tương ứng · admin đọc tất cả | người **đã thuê** phòng đó (sửa/xoá bài của mình) · admin gỡ |
| `favorites`                 | chính chủ                              | chính chủ                |
| `bookings`                  | người gửi + chủ phòng                  | người gửi (chủ đổi trạng thái) |

Vài ràng buộc đáng chú ý:

- `leases_one_active_per_listing` — một phòng không thể có 2 hợp đồng hiệu lực.
- `invoices (listing_id, period)` unique — mỗi phòng một hoá đơn mỗi kỳ.
- `invoices_paid_at_check` — `status` và `paid_at` luôn khớp nhau.
- `listings_publishable` — tin công khai bắt buộc có tên, địa chỉ, lat/lng.

`listings.description` là **ghi chú nội bộ**, `public_description` mới là mô tả
hiện cho khách. Khách chỉ đọc view `public_listings`, còn chủ trọ đọc
`owner_listings`; bảng gốc không còn được cấp quyền đọc toàn bộ cột.

**Xác thực tin đăng.** `listings.verification` có ba mức — `unverified`,
`pending`, `verified`. Chủ trọ được sửa tin của mình nên nếu không chặn thì họ
tự đặt `verified` bằng một lệnh update; trigger `listings_guard_verification`
hạ mọi lần tự nâng cấp về mức cũ, chỉ `service_role` (quản trị viên) mới duyệt
được. Trong app, chủ trọ chỉ bấm được "Gửi yêu cầu xác thực" → `pending`.

**Khoảng cách tới trường.** `distance_to_school` lưu bằng **mét** (số nguyên),
`school_name` là trường lấy làm mốc. Lưu mét để lọc "dưới 500 m" không phải so
sánh số thực; màn hình tự đổi sang km khi vượt 1.000 m.

**Ba view thay cho quyền đọc bảng.** `public_listings` (khách + người dùng
thường, chỉ tin đã đăng **và** đã duyệt), `owner_listings` (chủ trọ, tin của
mình), `admin_listings` + `admin_reviews` (quản trị viên, lọc bằng `is_admin()`
ngay trong view — nên tài khoản thường select ra 0 dòng chứ không gặp lỗi
quyền).

Project cũ chạy các patch trong `supabase/patches/` theo thứ tự ngày:

| File | Thêm gì |
| ---- | ------- |
| `2026-08-23-distance-verification.sql` | `school_name`, `distance_to_school`, `verification` |
| `2026-08-23-security-integrity.sql` | khoá dữ liệu nội bộ, sửa RLS, các ràng buộc toàn vẹn |
| `2026-08-24-admin-moderation.sql` | vai trò `admin`, kiểm duyệt tin, đánh giá chỉ từ người đã thuê |
| `2026-08-27-admin-verify-delete.sql` | quyền xoá tin của quản trị viên (mục "phòng trọ chưa xác minh") |

`2026-08-24-admin-moderation.sql` **phải chạy làm hai lượt** (bôi đen từng khối "BƯỚC" rồi Run):
Postgres không cho dùng một giá trị enum trong cùng transaction vừa thêm nó,
mà SQL Editor thì gộp cả file thành một transaction ngầm. Tin đang hiển thị
trên project cũ được giữ nguyên trạng thái `approved`, chỉ tin tạo sau đó mới
vào hàng chờ. Project mới chỉ cần `schema.sql`.

## Thay đổi so với bản chạy cục bộ

- **Đăng nhập là thật.** Trước đây `login()` chỉ kiểm tra email tồn tại và mật
  khẩu ≥ 6 ký tự, không lưu mật khẩu. Giờ là Supabase Auth.
- **Đặt lịch xem phòng cần đăng nhập.** Cho `anon` ghi vào bảng chủ trọ đọc là
  cửa mở cho spam. Trạng thái cũng không tự nhảy sang "đã xác nhận" sau 6 giây
  nữa — chủ trọ bấm xác nhận trong tab Lịch.
- **Yêu thích lưu theo tài khoản**, không còn nằm riêng trên máy.
- **Ảnh phòng nằm trên Storage.** 15 file `room-101.jpg`…`room-115.jpg` trong
  `assets/rooms/` là ảnh demo được `npm run seed` tải lên, mỗi phòng một cover.

## Thiết kế

**Màu** — một dải xanh dương trên nền trắng, khai báo ở `src/theme/index.ts`:

| Token         | Mã        | Dùng ở đâu                              |
| ------------- | --------- | --------------------------------------- |
| `primaryDeep` | `#0A2E63` | nút chính tối, chip đang chọn            |
| `primary`     | `#1A5FD0` | CTA, giá tiền, tab đang mở, ghim bản đồ  |
| `primarySoft` | `#DCE9FB` | chip khu vực, nền phụ                    |
| `card`        | `#FFFFFF` | thẻ, sheet                               |
| `background`  | `#F4F8FD` | nền trang                                |
| `foreground`  | `#0D1B2E` | chữ chính                                |

Điện dùng hổ phách, nước dùng xanh mòng két — cố ý tách khỏi xanh thương hiệu
để không đọc nhầm thành nút bấm.

**Chữ** — FZ Poppins, xem `assets/fonts/README.md`.

## Cấu trúc

```
app/                       routes (expo-router, file-based)
  (tabs)/                  Khám phá · Bản đồ · Lịch · Yêu thích · Tài khoản
  room/[id].tsx            chi tiết phòng
  book/[roomId].tsx        đặt lịch xem phòng (modal)
  auth.tsx                 đăng nhập / đăng ký (modal)
  dashboard.tsx            bảng điều khiển chủ trọ (6 tab)
src/
  lib/supabase.ts          client + cấu hình phiên
  lib/database.types.ts    kiểu bảng (viết tay — xem chú thích trong file)
  lib/api/                 truy vấn: catalogue · dashboard · bookings · favorites
  lib/filters.ts           tìm kiếm, lọc khu vực/giá/khoảng cách, sắp xếp
  lib/suggest.ts           gợi ý phòng bằng luật (không phải mô hình học máy)
  lib/verification.ts      nhãn và màu cho ba mức xác thực
  hooks/use-async.ts       loading / error / reload cho màn hình
  hooks/use-auth.tsx       phiên đăng nhập + vai trò
  components/              UI dùng chung + các tab dashboard
  theme/                   màu, bo góc, bóng, font
supabase/schema.sql        toàn bộ schema + RLS (dán vào SQL Editor)
supabase/patches/          bản vá cho project đã dựng từ trước
supabase/reset.sql         xoá sạch để làm lại
scripts/seed.mjs           nạp dữ liệu mẫu
```

## Việc còn dang dở

- Chưa có màn upload ảnh trong app; thêm/sửa phòng nhập lat/lng bằng tay.
- `src/lib/database.types.ts` viết tay. Có project rồi thì thay bằng
  `npx supabase gen types typescript --project-id <ref>`.
- Chưa có ảnh → tin đăng, OCR công tơ, thanh toán QR và embedding search.

## Bảo trì

`npm audit` báo **12 lỗ hổng mức moderate** và tất cả đều là cùng một thứ:
`uuid@7` (thiếu kiểm tra biên buffer ở v3/v5/v6, [GHSA-w5hq-g745-h8pq][adv]) kéo
vào qua `expo-splash-screen → @expo/config-plugins → xcode → uuid`.

Để nguyên là có chủ ý. `xcode` chỉ sinh file project Xcode lúc prebuild, chạy
trên máy build với dữ liệu của chính repo này — không có đầu vào từ người dùng
để mà chạm tới đường `buf` bị lỗi, và gói này không hề nằm trong app.

**Đừng chạy `npm audit fix --force`.** Nó không vá `uuid`; npm chỉ thấy cách
duy nhất là hạ `expo` xuống `46.0.21` — lùi 11 SDK, mất expo-router 57, React 19
và toàn bộ code trong repo. Bản vá thật phải đến từ `xcode` hoặc
`@expo/config-plugins` phát hành lại; cứ nâng Expo SDK theo lịch bình thường là
đủ.

[adv]: https://github.com/advisories/GHSA-w5hq-g745-h8pq
