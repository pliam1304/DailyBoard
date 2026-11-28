[← Mục lục Docs](../../index.md)

# F05 — Sổ Tay, Tâm Thư, Nhắc Việc Lặp & Tài Chính Cảm Xúc

## 1. Mục Tiêu & Trải Nghiệm Người Dùng

Tập hợp toàn bộ công cụ ghi chép và quản lý sinh hoạt hằng ngày trong tab **Sổ tay** (có bộ lọc nhanh: *Tất cả*, *Nhắc việc*, *Chi tiêu & Tiết kiệm*, *Ghi chú & Thư*), đi kèm cơ chế **Hoàn tác 5 giây (`Undo Toast`)** chống xóa nhầm.

---

## 2. Bốn Khối Nghiệp Vụ Chính

### 2.1. Ghi Chú Giấy Rách, Tâm Thư Niêm Phong Sáp & Câu Hỏi Mỗi Ngày
- **`NotesAndLetters.tsx`:** Hỗ trợ ghi chú nhanh (`sticky`) và tâm thư dài (`letter`) trên nhiều nền giấy (`cream-torn`, `blue-lined`...), ghim lên đầu (`pinned`) và khóa riêng tư (`isPrivate`) bằng mã PIN + mã hóa AES-GCM 256-bit.
- **`DailyPromptCard.tsx`:** Mỗi ngày chọn cố định 1 câu hỏi gợi mở theo ngày (`getDailyPrompt(entryDate)`) để 1 hoặc 2 người cùng trả lời và lưu vào `day_entries.prompt_answers`.

### 2.2. Băng Thu Âm Cassette (`VoiceMemoCard.tsx`)
- Ghi âm trực tiếp từ micro trình duyệt/điện thoại (tối đa **45 giây**), phát lại trực tiếp trong giao diện băng cassette.
- Dữ liệu audio được giữ trong IndexedDB (không ghi vào `localStorage`) và kiểm duyệt định dạng `data:audio/*` + giới hạn dung lượng `<= 2.2MB` khi đồng bộ lên bảng `voice_memos`.

### 2.3. Nhắc Việc & Lặp Lại Thông Minh (`RemindersPanel.tsx`)
- Hỗ trợ giờ nhắc (`dueTime`) kèm bộ kiểm tra tự động mỗi 30 giây phát chuông nhẹ & thông báo cục bộ (`sendLocalNotification`) khi tới giờ.
- **Lặp lại (`daily` / `weekly`):** Hàm `getRemindersForDateWithRecurrence` (`src/lib/search.ts`) tự động sinh các bản nhắc ảo (`id: rec-...`) cho ngày tương ứng mà không làm phình cơ sở dữ liệu; khi người dùng tích hoàn thành một nhắc việc ảo, hệ thống mới vật chất hóa (materialize) thành bản ghi thật mang UUID mới cho ngày hôm đó (`handleToggleReminder`).

### 2.4. Tài Chính Theo Cảm Xúc (`FinancePanel.tsx`)
- Ghi nhận 3 loại dòng tiền: `expense` (Chi tiêu), `income` (Thu nhập), `saving` (Tiết kiệm cho mục tiêu chung như *Quỹ đi Đà Lạt*).
- Gắn thẻ cảm xúc (`essential`, `treat`, `proud`, `impulse`...) để hiểu thói quen chi tiêu thay vì chỉ nhìn con số khô khan.
- **Nhập số tiền mượt & Sửa trực tiếp:** Tự động thêm dấu chấm phân tách hàng nghìn VND ngay lúc gõ (`formatVndInput` / `parseVndInput`: `45000` → `45.000`), hỗ trợ sửa trực tiếp khoản chi/thu đã tạo (`handleUpdateFinance`).

---

## 3. Cơ Chế Hoàn Tác 5 Giây (`Undo Toast`)

Khi người dùng xóa một Ghi chú (thường), Lời nhắc, Khoản chi tiêu hoặc Băng thu âm:
1. Bản ghi bị gỡ ngay trên UI và đẩy lệnh xóa vào Outbox.
2. Thanh thông báo **Hoàn tác (`Undo Toast`)** hiện lên trong **5 giây** giữ bản sao đầy đủ của đối tượng vừa xóa.
3. Nếu người dùng bấm **Hoàn tác**, bản ghi được khôi phục nguyên vẹn (giữ nguyên UUID gốc) vào state và đẩy lệnh `upsert_*` lên Outbox để đồng bộ lại với cloud.

---

## 4. Các Tệp Mã Nguồn & Kiểm Thử Liên Quan

- **Giao diện:** `src/components/board/NotesAndLetters.tsx`, `src/components/board/DailyPromptCard.tsx`, `src/components/board/VoiceMemoCard.tsx`, `src/components/board/RemindersPanel.tsx`, `src/components/board/FinancePanel.tsx`
- **Logic thuần:** `src/lib/date.ts` (`formatVnd`, `formatVndInput`, `parseVndInput`), `src/lib/search.ts` (`getRemindersForDateWithRecurrence`), `src/lib/prompts.ts` (`getDailyPrompt`)
- **Kiểm thử tự động:** `tests/core.test.ts` (test `formatVndInput`/`parseVndInput`, test lặp nhắc việc `daily` & `weekly`, test `getDailyPrompt` ổn định theo ngày).

---

[← Trước: F04. Hũ Viên Nang & Lửa Trại Let-Go](./F04-hu-vien-nang-va-lua-trai.md) | [Tiếp theo: F06. Phòng Nhạc Lofi & Âm Thanh →](./F06-phong-nhac-lofi-va-am-thanh.md)
