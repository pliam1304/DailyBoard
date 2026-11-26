# MacBook Desktop Widget (SwiftUI WidgetKit)

Thư mục này chứa sẵn mã nguồn SwiftUI WidgetKit (`CatyBoardWidget.swift`) khớp đúng với bảng dữ liệu của [`supabase/schema.sql`](../supabase/schema.sql).

## Cách 1 — Dùng ngay không cần Xcode (MacBook & PC)

Mở đường dẫn `/widget` của CatyBoard trên Chrome/Safari/Edge, chọn **Thêm vào Dock (Add to Dock)** trên macOS Safari (hoặc *Install App* trên Chrome) để ghim cửa sổ thẻ nhỏ gọn luôn nổi ở góc màn hình.

## Cách 2 — Build Desktop Widget macOS thật bằng Xcode

1. Cài **Xcode** từ Mac App Store.
2. Tạo project mới: *macOS App* (`CatyBoardMac`) → chọn *File → New → Target → Widget Extension*.
3. Dán nội dung [`CatyBoardWidget.swift`](CatyBoardWidget.swift) vào Widget Extension, điền `supabaseURL`, `supabaseAnonKey`, `boardId` (lấy trong Supabase) và bấm **Run**.
4. Nhấn chuột phải lên màn hình nền MacBook → **Edit Widgets** → thêm **CatyBoard Lofi & Mèo**.
