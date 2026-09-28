# Roomy — nghiên cứu AI, review code và hướng kinh doanh

Ngày lập: 28/09/2026 · Đối tượng: nhóm 16, Cuộc thi Sáng tạo Khởi nghiệp ICTU 2026 · Repo: `github.com/duongtrick/roomy` (commit `6cb7cb2`)

## 1. Tóm tắt

- **Repo tốt hơn mức "MVP sinh viên"**: bảo mật dựa trên RLS + trigger, tách view công khai/riêng, đánh giá chỉ từ người đã thuê thật, gợi ý có giải thích. `tsc --noEmit` sạch 0 lỗi.
- **Có 6 vấn đề nên sửa trước khi thêm AI**, nặng nhất là: tài khoản admin cấp theo README sẽ bị hạ về "người thuê" (mục 2).
- **Lợi thế mà đối thủ khó sao chép**: Roomy giữ cả hai đầu — tìm phòng *và* vận hành (hợp đồng, chỉ số, hoá đơn). Từ đó có dữ liệu mà một bảng tin đăng không có. Đây là chỗ đặt các tính năng "đột phá".
- **Ba tính năng đề xuất làm nên khác biệt**: (1) *Giá thật* — chi phí thực tế mỗi tháng từ hoá đơn thật; (2) *Cọc an toàn + điểm rủi ro tin đăng* — đánh vào nỗi sợ lớn nhất của sinh viên; (3) *Từ công tơ đến tiền* — chụp công tơ → hoá đơn → QR → tự đối soát. "Hỏi Roomy" (tìm phòng bằng tiếng Việt tự nhiên) là bề mặt để người dùng chạm vào cả ba.
- **Nguyên tắc AI**: mô hình hiểu và diễn giải, cơ sở dữ liệu quyết định, con người duyệt các việc về niềm tin, app vẫn chạy khi AI tắt.

## 2. Review code

**Phạm vi đã làm:** clone nông, `npm ci`, `tsc --noEmit`, đọc README, `schema.sql` (phần chính), các module lõi (`filters`, `suggest`, `supabase`, `geocode`, `catalogue`, `errors`, `use-auth`), màn hình Khám phá, API dashboard, script seed. **Chưa làm:** chạy app hoặc Supabase thật; đọc từng dòng các file UI lớn (`RoomsTab.tsx` 1416 dòng, `ModerationSheet.tsx`…); thử RLS bằng SQL thật.

| # | Vấn đề | Mức | Bằng chứng |
|---|--------|-----|-----------|
| 1 | Admin cấp bằng `INSERT` trong README → 2 vai trò → `maybeSingle()` lỗi → app coi là "tenant" | Cao | `use-auth.tsx` `loadUser`; hành vi `maybeSingle` đọc trong `postgrest-js`; `seed.mjs` tránh được vì xoá-rồi-chèn |
| 2 | README lệch code: bản đồ (Leaflet, không phải react-native-maps), `app.config.ts` không tồn tại, đánh giá đã có UI | Trung bình | tìm kiếm trong repo |
| 3 | Số CCCD lưu văn bản thường; luật dữ liệu cá nhân mới có hiệu lực 01/01/2026 | Trung bình (pháp lý) | `tenants.id_number` |
| 4 | Khoảng cách tới trường do chủ trọ tự khai nhưng dùng để lọc và chấm điểm | Trung bình | `schema.sql`, `suggest.ts` |
| 5 | Không có kiểm thử/CI, trong khi logic bảo mật nằm ở trigger/RLS | Trung bình | không có `*.test.*`, `.github/` |
| 6 | Giá điện/nước không có trong view công khai — người thuê không thấy | Trung bình | `public_listings` |

Ngoài ra: Leaflet nạp từ CDN không có SRI; số điện thoại chủ trọ công khai (dễ bị cào); repo nặng ~138MB vì APK 52MB nằm trong git; app chưa có upload ảnh (README tự nhận). Chi tiết và cách sửa: `references/known-issues.md` trong skill.

**Điểm mạnh nên giữ:** vai trò ở bảng riêng và không tin metadata JWT; trigger canh cột đặc quyền; `toVerification()` rơi về mức thấp nhất khi gặp giá trị lạ; bỏ dấu tiếng Việt bằng bảng tra thay vì `normalize`; `suggest.ts` nói rõ "luật, không phải học máy" và kèm lý do.

## 3. Bối cảnh và đối thủ

**Thị trường.** Năm học 2024–2025, Đại học Thái Nguyên có 91.643 người học, trong đó hơn 50.000 sinh viên chính quy (phần còn lại là vừa làm vừa học và từ xa); nhu cầu thuê trọ nhiều khả năng tập trung ở nhóm chính quy (suy luận của mình, chưa có số liệu). Chỉ tiêu tuyển sinh 2026 khoảng 28–29 nghìn (hai nguồn báo chí nêu 28.236 và 29.076 — con số khác nhau, cần đối chiếu nguồn chính thức). Một trang tin đăng Thái Nguyên nêu giá phòng trọ phổ biến khoảng 700.000–2.500.000 đồng/tháng (số của bên bán quảng cáo, chỉ tham khảo).

**Nỗi đau: lừa đảo đặt cọc.** Tháng 3/2026 tại Hải Phòng có vụ giả chủ nhà đăng phòng giá 1,8 triệu trong nhóm sinh viên rồi nhắn "chuyển 1 triệu giữ phòng". Chương trình Cảnh giác 247 (29/8/2026) nêu vụ chiếm đoạt hơn 300 triệu của 150 nạn nhân, và kịch bản kẻ gian thuê căn hộ theo ngày, dẫn nạn nhân đến *xem nhà thật* để thu tiền. Một vụ ở Đà Nẵng dùng lại ảnh/video của người khác. **Hàm ý:** "phòng có thật" chưa đủ — cần bằng chứng về *quyền cho thuê* và đường đặt cọc an toàn.

**Đối thủ (chỉ đọc mô tả trên kho ứng dụng, chưa dùng thử):**

| Đối thủ | Điều họ tuyên bố | Ghi chú |
|---------|------------------|---------|
| Trọ Mới | chủ trọ đã xác thực, thông báo phòng mới, một số chủ hỗ trợ thanh toán online; có app riêng cho chủ trọ | Đã đánh vào "xác thực" — đừng coi xác thực là điểm độc nhất |
| Nhatrovn | dữ liệu phòng đã xác thực, có nhân viên hỗ trợ tại chỗ | Tập trung thành phố lớn |
| Rencity | tìm phòng/căn hộ miễn phí | Hà Nội |
| Phongtro123, Batdongsan, Nhà Tốt… | bảng tin đăng | Không có dữ liệu vận hành |
| Nhóm Facebook/Zalo | kênh chính của sinh viên | Nơi lừa đảo hoạt động |

Trong các kết quả tra được, mình không thấy đối thủ nào công bố tìm phòng bằng hội thoại tiếng Việt hay chi phí thực tế từ hoá đơn; **đây là chưa thấy, không phải bằng chứng là không có**. Cần khảo sát thêm trước khi tuyên bố "chưa ai làm".

## 4. Luận điểm khác biệt

> Bảng tin đăng cho bạn xem phòng. Roomy cho bạn xem **cái giá thật, chủ trọ thật, và cách đặt cọc không bị lừa** — vì Roomy cũng là công cụ vận hành mà chủ trọ dùng hàng tháng.

Điều này quyết định chiến lược: **công cụ quản lý là mũi nhọn kéo nguồn cung**. Chủ trọ dùng miễn phí phần chụp công tơ/hoá đơn/QR → tin đăng và dữ liệu hợp đồng tự sinh ra → người thuê được lợi (giá thật, đánh giá từ người đã thuê). Đây là câu trả lời cho bài toán "gà và trứng" của sàn hai phía.

## 5. Bản đồ "AI vào mọi chỗ"

| Nơi trong app | Điểm chạm AI | Cách làm chính |
|---------------|--------------|----------------|
| Khám phá | Hỏi bằng tiếng Việt tự nhiên, chip hiển thị điều đã hiểu | Ý định→bộ lọc (zod) + xếp hạng lai + `reasons[]` |
| Bản đồ | "Trong 10 phút đạp xe tới trường" | Khoảng cách đường đi tính ở server |
| Thẻ/chi tiết phòng | Giá thật; tín hiệu rủi ro; tóm tắt đánh giá; hỏi đáp theo phòng | SQL tổng hợp; băm ảnh; RAG trên dữ liệu công khai |
| Đặt lịch | Gợi ý khung giờ; câu hỏi sàng lọc gửi kèm | Luật + mô hình soạn |
| Đánh giá | Tóm tắt ưu/nhược có dẫn chứng | Chỉ khi ≥ 3 đánh giá |
| Chủ trọ — Phòng | Ảnh→tin đăng; phát hiện thiếu thông tin; gợi ý giá | Thị giác + so sánh phòng cùng khu vực |
| Chủ trọ — Chỉ số | Chụp công tơ→số | OCR + kiểm tra hợp lý |
| Chủ trọ — Hoá đơn | QR + tự đối soát; soạn tin nhắc thu tiền | VietQR + webhook |
| Chủ trọ — Hợp đồng | Nhắc hết hạn; đọc/tô sáng điều khoản | Luật + mô hình (không phải tư vấn pháp lý) |
| Quản trị | Phân loại sơ bộ hàng chờ, điểm rủi ro | Chỉ gắn cờ; người quyết định |
| Tài khoản | Ghép ở chung (tự nguyện) | Bảng câu hỏi + điểm tương thích |

## 6. Ba tính năng đột phá

**1) Giá thật.** Tin đăng chỉ nói tiền phòng; người thuê trả thêm điện, nước, phụ phí. Roomy đã có `meter_readings` và `invoices`, nên tính được chi phí thực trung bình theo phòng, hiển thị dạng khoảng và số kỳ dữ liệu. Bước một không cần AI: đưa giá điện/nước vào view công khai. Bước hai: gộp ẩn danh có ngưỡng tối thiểu (để không suy ngược ra người thuê). Mô hình chỉ viết câu giải thích. *Vì sao khó sao chép:* đối thủ không giữ hoá đơn.

**2) Cọc an toàn + điểm rủi ro tin đăng.** Điểm rủi ro dựa trên tín hiệu giải thích được: giá thấp bất thường, ảnh trùng với tin của chủ khác, pin lệch địa chỉ, yêu cầu chuyển khoản trước khi xem. Cọc an toàn chỉ mở cho tin đã xác thực: mã VietQR trỏ tới tài khoản đã được admin đối chiếu tên với chủ trọ đã xác thực, kèm biên nhận điện tử có dấu thời gian. Roomy **không giữ tiền**. Cần rà soát pháp lý trước khi công bố lời lẽ bảo đảm.

**3) Từ công tơ đến tiền.** Chụp công tơ → OCR → chủ trọ xác nhận → hoá đơn → mã QR có nội dung chuyển khoản riêng → dịch vụ đọc biến động số dư báo về → hoá đơn tự chuyển "đã thu". SePay công bố mô hình tiền vào thẳng tài khoản của người bán, phí theo gói, có gói miễn phí giới hạn giao dịch/tháng; mình chưa kiểm tra điều kiện hiện hành từng gói nên phải đọc lại trước khi dựa vào. Mô hình này gỡ đúng giới hạn README nêu ("chưa có thanh toán vì cần pháp nhân").

**Bề mặt: "Hỏi Roomy".** Một ô hỏi ở đầu trang Khám phá, dẫn người dùng tới cả ba tính năng ("phòng dưới 2 triệu gần ICTU, tổng chi phí thực dưới 2,5 triệu, chủ đã xác thực"). Đây là tính năng dễ demo nhất, nên xếp trong giai đoạn đầu dù không phải cái khó sao chép nhất.

## 7. Mô hình kinh doanh

| Nguồn thu | Ai trả | Giả thuyết cần kiểm chứng |
|-----------|--------|--------------------------|
| Gói quản lý (freemium): công tơ→hoá đơn→QR→đối soát, nhắc thu tiền, báo cáo | Chủ trọ (theo phòng/tháng) | Mức sẵn sàng chi trả — khảo sát 20–30 chủ trọ quanh các trường |
| Phí kiểm tra hồ sơ để cấp huy hiệu "Đã xác thực" | Chủ trọ | Phí bù chi phí vận hành, **không** bán huy hiệu; huy hiệu chỉ cấp khi qua kiểm tra, nếu không sẽ mất niềm tin |
| Tin nổi bật (kế hoạch đã có trong hồ sơ dự thi) | Chủ trọ | Đặt sau khi có lượng người tìm phòng |
| Đối tác dịch vụ sinh viên: internet, chuyển trọ, nội thất | Đối tác (phí giới thiệu) | Sau khi có lượng người thuê |
| Kênh phân phối qua nhà trường | — | ĐHTN đã tập huấn "App Sinh viên số"; tìm hiểu khả năng hợp tác |

Công thức doanh thu tháng: `số chủ trọ trả phí × số phòng trung bình × giá/phòng`. Ví dụ **giả định, không phải dữ liệu**: 50 chủ × 10 phòng × 10.000 đ = 5 triệu/tháng. Thay số bằng kết quả khảo sát.

**Ràng buộc chi phí của cuộc thi.** Hồ sơ dự thi ghi 800.000 đ cho "công cụ, nền tảng và kỹ thuật hỗ trợ" và tổng vốn 4.000.000 đ. Vì vậy: đặt trần chi tiêu AI hằng tháng, dùng mô hình nhỏ, cache, giới hạn theo người dùng, và luôn có đường lui không-AI. Chi phí mô hình phải **đo trên dữ liệu thử** trước khi cam kết — mình chưa có con số đáng tin.

**Chỉ số để theo dõi:** tỉ lệ chủ trọ tải ≥ 1 ảnh và đăng tin; thời gian từ đăng đến có người xem; tỉ lệ hoá đơn thu qua QR; số phòng có dữ liệu "Giá thật"; số báo cáo lừa đảo; chi phí AI trên mỗi tin/hoá đơn.

## 8. Lộ trình gợi ý

| Giai đoạn | Việc | Ghi chú |
|-----------|------|---------|
| 0 (~1 tuần) | Sửa mục 1–6; nền tảng AI (`ai_usage`, giới hạn tần suất, `_shared/`); upload ảnh | Không có nền này thì mọi thứ sau đều rủi ro |
| 1 (~2 tuần) | Công khai điện/nước; "Hỏi Roomy" bản đầu (ý định→bộ lọc, chưa cần embedding); ảnh→tin đăng | Đủ cho một demo có sức thuyết phục |
| 2 (~3 tuần) | Công tơ→số; VietQR + đối soát; điểm rủi ro + trợ lý kiểm duyệt | Vòng "công tơ đến tiền" chạy trọn |
| 3 (sau thi) | Giá thật đầy đủ; Cọc an toàn; tóm tắt đánh giá, hỏi đáp theo phòng, ghép ở chung | Cần dữ liệu thật và rà soát pháp lý |

Thời lượng là ước lượng cho 1–2 người; điều chỉnh theo thời hạn các vòng tiếp theo của cuộc thi (mình chưa biết lịch).

**Kịch bản demo (2 phút):** *Một tháng của chủ trọ* — chụp công tơ, hoá đơn tự tính, quét QR, đã thu. *Một ngày của sinh viên* — hỏi bằng tiếng Việt, xem giá thật, thấy huy hiệu và tín hiệu rủi ro, đặt lịch.

**Gợi ý sửa hồ sơ dự thi.** Mục "Tính mới, tính sáng tạo" hiện nói chung chung (chuẩn hoá thông tin, bản đồ, đánh giá) — những thứ đối thủ cũng có. Nên thay bằng ba điểm ở mục 6 và dẫn số liệu lừa đảo ở mục 3.

## 9. Rủi ro

- **Pháp lý/dữ liệu:** Luật Bảo vệ dữ liệu cá nhân 2025 có hiệu lực 01/01/2026, có quy định riêng về chuyển dữ liệu ra nước ngoài; gọi mô hình ở nước ngoài cần thiết kế để không gửi dữ liệu cá nhân. Cần người có chuyên môn xem: CCCD, ảnh công tơ, biên nhận đặt cọc, lời lẽ về "an toàn".
- **Gắn nhãn oan:** chỉ hiển thị tín hiệu của tin đăng kèm lý do; có đường khiếu nại.
- **Prompt injection:** tin đăng và đánh giá là dữ liệu không tin cậy.
- **Chi phí AI vượt kiểm soát:** trần chi tiêu, công tắc tắt, đường lui.
- **Nguồn cung:** chủ trọ ngại đổi thói quen — đó là lý do công cụ quản lý phải giúp họ tiết kiệm công ngay tháng đầu.
- **Điều khoản bên thứ ba:** Nominatim, ô nền CARTO, dịch vụ định tuyến, SePay, nhà cung cấp mô hình.

## 10. Chưa xác minh

Chưa chạy app/Supabase; chưa đọc hết UI; chưa thử RLS thực; chưa dùng thử app đối thủ; chưa đo chi phí mô hình; chưa kiểm tra bảng giá SePay hiện hành; chưa có dữ liệu khảo sát người thuê/chủ trọ Thái Nguyên; **bộ skill chưa được thử trong Codex** (định dạng dựa trên tài liệu Codex và các repo skill công khai); file `agents/openai.yaml` là tuỳ chọn — nếu Codex báo lỗi cấu trúc thì xoá file đó, skill vẫn chạy nhờ `SKILL.md`.

## 11. Nguồn

- Codex skills: https://developers.openai.com/codex/skills · mẫu skill-creator: https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md
- Supabase agent skills: https://github.com/supabase/agent-skills · https://supabase.com/blog/supabase-agent-skills
- Expo skills: https://docs.expo.dev/skills.md
- Tìm kiếm lai (pgvector + full-text): https://supabase.com/docs/guides/ai/hybrid-search · embedding tự động: https://supabase.com/docs/guides/ai/automatic-embeddings
- SePay: https://sepay.vn/cong-thanh-toan-vietqr.html · https://developer.sepay.vn/vi/sepay-webhooks/bat-dau-nhanh
- Lừa đảo thuê trọ: https://vnexpress.net/bay-phong-tro-ao-lua-sinh-vien-nguoi-lao-dong-5058726.html · https://lsvn.vn/bay-lua-dao-thue-nha-tro-online-xem-nha-that-van-mat-tien-a178605.html · https://baophapluat.vn/lua-cho-thue-phong-tro-chiem-doat-tien-cua-nhieu-sinh-vien-va-cong-nhan-post467641.html
- Quy mô ĐHTN: https://lsvn.vn/dai-hoc-thai-nguyen-quyet-tam-nang-cao-chat-luong-dao-tao-doi-moi-phuong-thuc-khao-thi-a164136.html · chỉ tiêu 2026: https://lsvn.vn/dai-hoc-thai-nguyen-tuyen-sinh-hon-29-000-chi-tieu-dai-hoc-cao-dang-nam-2026-a171451.html · https://vov.vn/xa-hoi/dai-hoc-thai-nguyen-ap-dung-8-phuong-thuc-tuyen-sinh-nam-2026-post1313395.vov
- Luật Bảo vệ dữ liệu cá nhân 2025: https://luatvietnam.vn/dan-su/luat-bao-ve-du-lieu-ca-nhan-2025-co-hieu-luc-khi-nao-568-103652-article.html
- Đối thủ/tham khảo: https://apps.apple.com/vn/app/tr%E1%BB%8D-m%E1%BB%9Bi-t%C3%ACm-ki%E1%BA%BFm-tr%E1%BB%8D-d%E1%BB%85-d%C3%A0ng/id6745783426 · https://apps.apple.com/vn/app/t%C3%ACm-tr%E1%BB%8D-nhatrovn/id6472759778 · https://github.com/johncegom/soi-tro
