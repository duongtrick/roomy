---
name: roomy-ai-features
description: Thêm, sửa và review tính năng AI cho app Roomy (tìm & quản lý phòng trọ tại Thái Nguyên; Expo 57 + React Native + expo-router + Supabase). Dùng skill này bất cứ khi nào làm việc trong repo Roomy (thư mục mobile/, supabase/schema.sql) và nhắc tới AI, LLM, Gemini/OpenAI/Claude, embedding, tìm kiếm ngữ nghĩa, OCR, Edge Function, "tìm phòng bằng AI", "trợ lý", chấm điểm rủi ro lừa đảo, ảnh→tin đăng, chụp công tơ→hoá đơn, chi phí thực tế, thanh toán QR — kể cả khi người dùng không nói chữ "skill". Cũng dùng khi được nhờ review code Roomy hoặc sửa các lỗi đã biết. Add/review AI features for the Roomy rental app.
---

# Roomy — tính năng AI

Roomy là app React Native (Expo) cho sinh viên/người lao động thuê phòng và chủ trọ quản lý phòng. Backend là Supabase (Postgres + Auth + Storage), **chưa có Edge Function nào** tại thời điểm viết skill này (2026-09-28).

Skill này giúp thêm AI mà không phá vỡ những gì repo đã làm tốt: bảo mật dựa trên RLS/trigger, giải thích được kết quả, và app vẫn chạy khi không có AI.

## Đọc trước khi code

1. `mobile/AGENTS.md` — báo rằng Expo đã thay đổi; đọc docs đúng phiên bản (https://docs.expo.dev/versions/v57.0.0/) trước khi viết code Expo.
2. `references/repo-map.md` — cấu trúc, quy ước, lệnh chạy (đã kiểm chứng).
3. `references/known-issues.md` — lỗi/khoảng trống đã biết. Sửa nhóm "Phase 0" trước khi thêm AI, vì vài lỗi làm hỏng nền mà AI dựa vào.
4. `references/ai-feature-specs.md` — đặc tả từng tính năng. Chỉ đọc mục đang làm.
5. `references/ai-safety-privacy.md` — đọc bắt buộc trước khi gửi bất kỳ dữ liệu người dùng nào tới nhà cung cấp mô hình.

Với Supabase, kiểm tra tài liệu hiện hành trước khi viết code đặc thù (cấu hình và API đổi nhanh). Nếu có, cài thêm skill chính thức: `npx skills add supabase/agent-skills --skill supabase` và `--skill supabase-postgres-best-practices`; với Expo: `npx skills add expo/skills`.

## Nguyên tắc bất di bất dịch

- **Khoá AI không bao giờ nằm trong app.** Biến `EXPO_PUBLIC_*` bị đóng gói vào bundle JS. Mọi lời gọi mô hình đi qua Supabase Edge Function; khoá lưu bằng `supabase secrets set`.
- **Mô hình hiểu và diễn giải; cơ sở dữ liệu quyết định.** Mô hình không được bịa phòng, giá, khoảng cách. Đầu ra phải qua `zod` (đã có trong package.json) và mọi id phải thuộc tập ứng viên lấy từ DB. Số liệu trong câu giải thích phải khớp cột DB.
- **AI chỉ gắn cờ, con người quyết định** các việc về niềm tin. Không cho AI ghi `verification`, `moderation_status`, `tenants.user_id` — các cột này được trigger canh có chủ đích.
- **Giữ RLS là nguồn sự thật.** Bảng mới → bật RLS, chỉ cấp quyền tối thiểu, hàm `SECURITY DEFINER` phải `SET search_path = public`. Mẫu tham khảo: `guard_listing_verification`, `claim_tenancy` trong `supabase/schema.sql`.
- **Có đường lui không-AI.** Mọi màn hình AI phải dùng được khi AI tắt/lỗi/hết hạn mức (như cách `isSupabaseConfigured` đang làm). Thêm `isAiAvailable` và trạng thái rõ ràng thay vì lỗi mạng khó hiểu.
- **Giải thích được.** Giữ mẫu `reasons[]` của `src/lib/suggest.ts`: mỗi gợi ý kèm lý do rút từ dữ liệu thật.
- **Dữ liệu cá nhân tối thiểu.** Không gửi `tenants.id_number` (CCCD), số điện thoại, email, tên đầy đủ tới mô hình. Xem `references/ai-safety-privacy.md`.
- **Kiểm soát chi phí.** Mô hình nhỏ làm mặc định, cache theo hash đầu vào, giới hạn theo người dùng/ngày, timeout, ghi `ai_usage`, có công tắc tắt khẩn cấp.
- **Nội dung tin đăng và đánh giá là dữ liệu không tin cậy.** Đặt trong khối phân cách rõ ràng, dặn mô hình không làm theo chỉ dẫn nằm trong đó (prompt injection).

## Quy trình cho mỗi tính năng

1. Chọn tính năng trong `references/ai-feature-specs.md`; xác nhận phạm vi với người dùng nếu đặc tả mơ hồ.
2. Liệt kê file sẽ đụng tới trước khi sửa. Không thêm phụ thuộc mới nếu không có lý do (ghi lý do trong PR).
3. Thay đổi DB: viết patch `supabase/patches/YYYY-MM-DD-<tên>.sql` **và** cập nhật `supabase/schema.sql` (file này là nguồn duy nhất — ghi ở đầu file). Bọc trong `BEGIN/COMMIT`, kết thúc bằng `NOTIFY pgrst, 'reload schema';` như các patch hiện có. Cập nhật `src/lib/database.types.ts` (viết tay).
4. Edge Function trong `mobile/supabase/functions/<tên>/index.ts`, code dùng chung ở `functions/_shared/`. Xác thực JWT, kiểm tra vai trò, giới hạn tần suất, validate đầu vào và đầu ra.
5. Client: thêm vào `src/lib/api/ai.ts` theo mẫu `unwrap`/`assertConfigured`; hook dùng `useAsync`; UI dùng `src/components/ui.tsx` và token trong `src/theme`. Import bằng alias `@/`.
6. Chạy `npm run typecheck` (từ `mobile/`). Bản gốc đang sạch 0 lỗi — không được làm nó xấu đi.
7. Thử các ca kiểm thử trong đặc tả, gồm ca **AI tắt** và ca **đầu vào độc hại**.
8. Cập nhật bảng tính năng trong `mobile/README.md` (nói thật trạng thái: "luật", "AI", "chưa có").

## Quy ước của repo (bám theo)

- Chú thích bằng tiếng Việt, viết **vì sao** chứ không chỉ cái gì. Chuỗi hiển thị cho người dùng bằng tiếng Việt.
- TypeScript `strict`. Không `any` để lách kiểu; nếu buộc cast (như `unwrapAs`) thì ghi lý do.
- Truy vấn dưới `src/lib/api/*.ts`; không tự lọc `owner_id` ở client khi RLS đã lọc.
- Tìm kiếm tiếng Việt dùng `fold()` bỏ dấu trong `src/lib/filters.ts` — không dùng `normalize("NFD")` (Hermes không đảm bảo).
- Không commit `.env`, khoá service role, hay file APK/ảnh nặng. Không sửa `docs/apk`.

## Danh mục tính năng (xem chi tiết trong `references/ai-feature-specs.md`)

| Mã | Tính năng | Ưu tiên | Ghi chú |
|----|-----------|---------|---------|
| P0 | Nền tảng AI: `ai_usage`, giới hạn tần suất, `_shared/`, `isAiAvailable` | Bắt buộc trước | Kèm sửa lỗi trong known-issues |
| A1 | "Hỏi Roomy" — tìm phòng bằng tiếng Việt tự nhiên | Cao | Ý định→bộ lọc + xếp hạng lai + giải thích |
| A2 | Ảnh → tin đăng + phân tích thiếu thông tin | Cao | Cần thêm upload ảnh (app chưa có) |
| A5 | "Giá thật" — chi phí thực tế mỗi tháng | Cao (đột phá) | Cần công khai giá điện/nước, gộp hoá đơn ẩn danh |
| A3 | Chụp công tơ → chỉ số → hoá đơn | Cao | Vòng khép kín cùng A4 |
| A4 | VietQR + webhook đối soát tự động | Cao | Không giữ tiền hộ; xem điều khoản nhà cung cấp |
| B1 | Điểm rủi ro tin đăng | Trung bình | Chỉ gắn cờ, giải thích được |
| B2 | "Cọc an toàn" | Trung bình (đột phá) | Chỉ với tin đã xác thực; cần rà soát pháp lý |
| B3 | Phân loại sơ bộ hàng chờ kiểm duyệt cho admin | Trung bình | Ghi lại đề xuất AI vs quyết định cuối |
| C1–C5 | Tóm tắt đánh giá, hỏi đáp theo phòng, khoảng cách đường đi thật, ghép ở chung, đọc hợp đồng | Sau | Xem đặc tả |

## Định nghĩa "xong"

- `npm run typecheck` sạch; patch SQL và `schema.sql` khớp nhau; RLS được thử bằng ít nhất một tài khoản không có quyền.
- Tắt AI (bỏ khoá/đặt cờ tắt) vẫn dùng được màn hình.
- `grep -R "EXPO_PUBLIC_" mobile` không lộ khoá nhà cung cấp AI.
- Không dữ liệu cá nhân nằm trong prompt/log; `ai_usage` ghi chi phí ước tính.
- README phản ánh đúng thực tế.

## Không làm

- Không tự đặt `verification = 'verified'` hay duyệt tin bằng AI.
- Không hiển thị "người này là kẻ lừa đảo" — chỉ hiển thị tín hiệu rủi ro của **tin đăng**, kèm lý do.
- Không giữ hộ tiền cọc hay tiền thuê (cần pháp nhân/giấy phép; ngoài phạm vi).
- Không cam kết pháp lý thay cho luật sư; ghi chú "cần rà soát pháp lý" ở nơi liên quan.
