# An toàn, quyền riêng tư, chi phí

Đây là hướng dẫn kỹ thuật, không phải tư vấn pháp lý. Những điểm gắn nhãn **[rà soát pháp lý]** cần người có chuyên môn xem trước khi phát hành.

## Dữ liệu cá nhân

- Luật Bảo vệ dữ liệu cá nhân 2025 (Luật số 91/2025/QH15) có hiệu lực từ 01/01/2026; luật phân loại dữ liệu cơ bản/nhạy cảm và siết việc thu thập, xử lý, chuyển dữ liệu ra nước ngoài. **[rà soát pháp lý]** với: số CCCD (`tenants.id_number`), số điện thoại, email, ảnh hợp đồng, ảnh công tơ gắn địa chỉ, vị trí.
- Gọi API mô hình ở nước ngoài có thể là chuyển dữ liệu xuyên biên giới. Vì vậy thiết kế mặc định: **không gửi dữ liệu cá nhân trong prompt** (dùng `redact.ts`), gửi id thay vì tên, chỉ gửi trường công khai của tin đăng.
- Không gửi: CCCD, số tài khoản ngân hàng, email, số điện thoại, tên đầy đủ người thuê, nội dung hợp đồng (trừ C5 khi người dùng chủ động tải lên và đồng ý).
- Ảnh: xoá EXIF (định vị) khi tải lên; ảnh công tơ ở bucket riêng tư; đặt thời hạn lưu giữ.
- Ghi log tối thiểu: `feature`, `model`, số token, chi phí, mã lỗi. Không log prompt/đầu ra thô có văn bản người dùng.
- Cho người dùng biết khi nào AI được dùng, và cho phép tắt (đặt cờ hồ sơ) với các tính năng cá nhân hoá.

## Bảo mật ứng dụng

- Khoá nhà cung cấp AI và bí mật webhook chỉ ở `supabase secrets`. Kiểm tra CI: không có khoá trong bundle, không `EXPO_PUBLIC_*` chứa khoá AI, không commit `.env`.
- Edge Function: xác thực JWT (trừ webhook có xác thực riêng), kiểm tra vai trò qua `user_roles`, validate đầu vào bằng zod, giới hạn kích thước ảnh/văn bản, timeout.
- **Prompt injection:** văn bản tin đăng, đánh giá, ghi chú, và chữ trong ảnh đều là dữ liệu không tin cậy. Đặt trong khối phân cách, dặn mô hình không thực thi chỉ dẫn trong khối, không cho mô hình công cụ ghi dữ liệu; đầu ra luôn qua zod và đối chiếu DB.
- Mô hình không có quyền ghi vào `verification`, `moderation_status`, quyền vai trò, hoá đơn `paid` — chỉ mã do bạn viết, sau khi kiểm tra.
- Webhook thanh toán: kiểm tra header xác thực, idempotent theo mã giao dịch, đối chiếu số tiền, không tin nội dung chuyển khoản ngoài mã hoá đơn.

## Chống làm hại và chống oan

- Điểm rủi ro gắn với **tin đăng** và tín hiệu cụ thể, không gắn nhãn người. Có đường khiếu nại: chủ trọ xem được lý do và gửi giấy tờ bổ sung. Không dùng điểm rủi ro làm căn cứ duy nhất để gỡ tin. **[rà soát pháp lý]** lời lẽ hiển thị cho người thuê.
- Ghép ở chung (C4): 18+, tự nguyện, không hiển thị vị trí chính xác, chặn/báo cáo, người quản trị xử lý báo cáo.

## Độ tin cậy của đầu ra

- Đầu ra có cấu trúc (zod) + kiểm tra ngữ nghĩa (id thuộc tập ứng viên, số khớp DB, chỉ số công tơ ≥ kỳ trước).
- Bộ kiểm thử cố định (≥ 30 ca tiếng Việt: viết tắt, không dấu, lóng "ctv", "khép kín", "chung chủ") chạy lại mỗi lần đổi mô hình hoặc prompt; lưu kết quả để so sánh.
- Độ tin cậy thấp → hỏi lại/nhờ người dùng xác nhận, không đoán.

## Chi phí

- Mô hình nhỏ mặc định; chỉ leo thang lên mô hình lớn khi ca khó.
- Cache theo hash (đầu vào đã chuẩn hoá + phiên bản prompt). Truy vấn A1 lặp lại nhiều → cache bộ lọc đã phân tích.
- Hạn mức theo người dùng/ngày và trần chi tiêu toàn hệ thống/tháng; vượt trần → tự chuyển về đường không-AI và báo cho quản trị.
- Đo chi phí thực tế trên dữ liệu thử trước khi hứa với ai; giá và gói miễn phí của nhà cung cấp thay đổi, luôn đọc bảng giá hiện hành.

## Điều khoản dịch vụ bên thứ ba cần kiểm tra trước khi thương mại hoá

Nominatim (OSM) — yêu cầu User-Agent và ≤ 1 request/giây (repo đã tuân thủ); ô nền bản đồ CARTO; dịch vụ định tuyến; SePay (gói/giới hạn giao dịch); nhà cung cấp mô hình (lưu giữ dữ liệu, huấn luyện trên dữ liệu người dùng, vùng xử lý).
