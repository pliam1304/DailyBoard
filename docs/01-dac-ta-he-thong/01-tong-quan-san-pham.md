[← Mục lục Docs](../index.md)

# 01. Tổng Quan Sản Phẩm & Triết Lý Thiết Kế

## 1. Bối Cảnh & Bài Toán Thực Tế

Các ứng dụng nhật ký hoặc quản lý cá nhân phổ biến hiện nay thường rơi vào một trong hai thái cực:
- **Quá thiên về năng suất công việc** (nhiều bảng biểu khô khan, áp lực hoàn thành, thiếu cảm xúc khi mở lên vào cuối ngày).
- **Phụ thuộc hoàn toàn vào kết nối mạng & nền tảng đóng** (rớt mạng không mở được ảnh/ghi chú cũ, thiếu mã hóa phía người dùng cho tâm sự riêng tư, hoặc không hỗ trợ chia sẻ gọn gàng đúng 2 người).

**Nhật Kí (`DailyBoard`)** được xây dựng như một **bảng ghim Scrapbook Lofi đa nền tảng** (chạy mượt trên iPhone/Android dạng PWA, MacBook kèm Mini-Widget `/widget` và PC) nhằm giải quyết đồng thời 3 nhu cầu hằng ngày:
1. Lưu giữ khoảnh khắc nhanh trong 2 giây (tâm trạng, thời tiết, ảnh Polaroid, ghi âm ngắn, viên nang cảm xúc).
2. Quản lý nhẹ nhàng đời sống cá nhân (nhắc việc lặp, đồng hồ Pomodoro, chi tiêu gắn nhãn cảm xúc).
3. Giữ một không gian kết nối ấm cúng cho **2 người** (`Him & Her`) nhưng vẫn tôn trọng tuyệt đối ranh giới riêng tư của mỗi người.

---

## 2. Ba Trụ Cột Thiết Kế

### 2.1. Local-First — Mở Là Dùng Ngay, Không Lo Mất Dữ Liệu
- Mọi thao tác viết ghi chú, chụp ảnh Polaroid, thêm nhắc việc hay ghi chi tiêu đều được phản hồi ngay tức thì trên giao diện và lưu xuống **IndexedDB + Slim LocalStorage** của thiết bị.
- Khi chưa kết nối Supabase (hoặc đang ngoại tuyến trên máy bay/ngoài đường), ứng dụng vẫn hoạt động đầy đủ; toàn bộ thay đổi được xếp vào **Outbox Queue theo tài khoản** và tự động đẩy lên đám mây ngay khi có mạng trở lại.

### 2.2. Linh Hoạt Từ 1 Người Lên 2 Người
- **Mặc định khi khởi tạo:** Bảng cá nhân 1 người gọn gàng với tên bảng `Name` và 1 chú mèo bên cửa sổ.
- **Mở rộng lên 2 người trong 1 chạm:** Người 1 tạo **Link mời mở** (`?invite=DIARY-...`) gửi qua Zalo/Messenger/iMessage; người thứ 2 mở link rồi đăng nhập hoặc tạo tài khoản mới là vào thẳng bảng chung, kích hoạt 2 chú mèo, đồng bộ realtime, chấm trạng thái online, gửi tim `♡` và đồng bộ bài nhạc đang nghe.

### 2.3. Riêng Tư Theo Thiết Kế (Privacy by Design)
- **Mã hóa đầu cuối phía trình duyệt (E2EE):** Tâm thư và Viên nang đánh dấu riêng tư được mã hóa bằng `AES-GCM 256-bit` từ mã PIN ngay tại trình duyệt trước khi lưu hoặc đồng bộ lên cloud.
- **Khóa tầng Cơ sở dữ liệu (RLS):** Ngay cả trong bảng chung 2 người, chính sách PostgreSQL Row Level Security ép cứng `not is_private or author_id = auth.uid()` — người còn lại không thể đọc bản ghi riêng tư dù truy vấn trực tiếp API.
- **Che màn hình nhanh (`Cmd + Shift + L`):** 1 chạm bật lớp phủ che toàn bộ nội dung nhật ký/tài chính khi mở ứng dụng nơi công cộng trong khi nhạc Lofi vẫn phát liên tục.

---

## 3. Phạm Vi Nền Tảng & Đối Tượng Sử Dụng

| Nền tảng / Chế độ | Cách truy cập | Mục đích sử dụng chính |
|---|---|---|
| **Web Desktop (macOS / Windows)** | Trình duyệt tại `/` | Bố cục 2 cột rộng rãi: Cửa sổ Mèo + Phòng Nhạc cố định bên trái, 3 tab nội dung bên phải |
| **iPhone / Android PWA** | Safari/Chrome → *Add to Home Screen* | Chụp ảnh Polaroid nhanh, check-in 2 giây, ghi âm, xem lịch kỷ niệm với thanh 4 tab dưới đáy |
| **Mini-Widget Desktop** | `/widget` | Cửa sổ nhỏ gọn ghim góc màn hình MacBook/PC xem giờ, mèo, nhắc việc nhanh |
| **Cozy Desk Mode** | Nút đồng hồ trên thanh tiêu đề | Màn hình đồng hồ bàn học Lofi toàn màn hình kèm nhạc nền và món quà đặt lên cửa sổ |

---

[← Mục lục Docs](../index.md) | [Tiếp theo: 02. Kiến trúc hệ thống →](./02-kien-truc-he-thong.md)
