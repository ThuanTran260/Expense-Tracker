# Prompt — Cải thiện UX: Loading Button & Custom Category Dropdown

> Đưa prompt này kèm theo code component hiện tại (Modal thêm giao dịch + phần xử lý
> danh mục) cho AI code. Đừng chỉ đưa prompt suông — AI cần thấy code thật mới sửa
> đúng, không đoán/viết lại từ đầu.

---

## 1. Vai trò & bối cảnh

```
Bạn là Frontend Engineer chuyên về UI/UX và animation, đang cải thiện trải nghiệm cho
modal "Thêm giao dịch mới" trong app Expense Tracker (React + TailwindCSS, theme dark).

Yêu cầu SỬA TRÊN CODE HIỆN CÓ (mình sẽ paste code bên dưới), không viết lại toàn bộ
component từ đầu. Giữ nguyên logic form, tên field, cách gọi API — chỉ cải thiện phần
UX/animation theo yêu cầu dưới đây.
```

---

## 2. Hiện trạng (mô tả UI hiện tại — để AI hình dung dù không thấy ảnh)

```
- Modal "Thêm giao dịch mới" gồm: toggle Chi/Thu (2 nút), input số tiền, dropdown
  "Danh mục", input ngày, textarea ghi chú, 2 nút "Hủy" / "Thêm giao dịch".

- Vấn đề 1 — nút "Thêm giao dịch": khi bấm, có độ trễ do gọi API, nhưng UI không có
  bất kỳ phản hồi trực quan nào trong lúc chờ -> người dùng thấy màn hình "đứng hình"
  1-2 giây rồi mới đóng modal, tạo cảm giác app bị lag/đứng.

- Vấn đề 2 — dropdown "Danh mục": đang dùng thẻ <select> mặc định của trình duyệt.
  Danh sách có 13 mục (Ăn uống, Đầu tư, Di chuyển, Du lịch, Freelance, Giải trí,
  Hóa đơn, Học tập, Khác (Chi), Khác (Thu), Lương, Mua sắm, Quần áo, Sức khỏe,
  Thưởng), mỗi mục có icon emoji đi kèm. Giao diện native <select> nhìn cơ bản,
  không animation, không đồng bộ với theme dark tím/indigo của app.
```

---

## 3. Yêu cầu cụ thể

### 3.1 Loading state cho nút "Thêm giao dịch"

```
- Bấm nút -> disable ngay lập tức (chống bấm 2 lần / double-submit)
- Đổi nội dung nút thành spinner + text "Đang thêm..." trong lúc chờ API
- Dùng CSS transition mượt (Tailwind: transition-all duration-200/300) cho việc
  chuyển đổi trạng thái nút, tránh thay đổi UI đột ngột
- Khi API trả về THÀNH CÔNG:
  - Hiệu ứng đóng modal mượt (fade + scale nhẹ), không đóng phựt một cái
  - Danh sách giao dịch/dashboard cập nhật có animation nhẹ (item mới fade-in hoặc
    highlight brief 1-2s rồi tắt) để người dùng thấy rõ giao dịch vừa được thêm
- Khi API LỖI:
  - KHÔNG đóng modal, hiển thị thông báo lỗi ngay trong modal (toast hoặc inline
    error text), giữ nguyên dữ liệu người dùng đã nhập
  - Nút trở lại trạng thái bình thường để thử lại
- An toàn: đặt timeout hợp lý (8-10s) — nếu quá thời gian đó API chưa phản hồi, hiển
  thị lỗi "Có vẻ mạng chậm, thử lại nhé" thay vì loading vô thời hạn
```

### 3.2 Redesign dropdown "Danh mục"

```
- Thay <select> native bằng custom dropdown component. Chọn 1 trong các lựa chọn sau
  (ưu tiên theo thứ tự, vì nhẹ và có sẵn accessibility):
  1. Headless UI Listbox (nếu đã dùng Tailwind, tích hợp tự nhiên nhất)
  2. Radix UI Select
  3. shadcn/ui Select (nếu project đã cài shadcn)

- Animation khi mở/đóng: fade + slide nhẹ (150-200ms), không giật, không lag khi có
  13 items.

- Hover / focus state: highlight item rõ ràng bằng background + transition màu mượt
  (không đổi màu đột ngột).

- Item đang được chọn: có dấu check (✓) hoặc background riêng biệt để phân biệt rõ
  với các item khác.

- Vì danh sách khá dài (13 mục): thêm scroll mượt bên trong dropdown (không để tràn
  ra ngoài modal). Nếu sau này danh mục tăng lên nhiều, cân nhắc thêm ô search nhỏ ở
  đầu dropdown để lọc nhanh.

- Giữ nguyên icon emoji hiện có cho từng danh mục, chỉ chỉnh lại spacing/alignment
  cho gọn gàng, chuyên nghiệp hơn.

- Accessible: điều hướng được bằng bàn phím (mũi tên lên/xuống để chuyển item, Enter
  để chọn, Esc để đóng dropdown) — đây là điểm cộng lớn khi demo cho nhà tuyển dụng.

- Đồng bộ màu với theme hiện tại: nền tối, viền tím/indigo khi đang focus (giống màu
  viền input số tiền/ngày trong modal hiện tại).
```

---

## 4. Ràng buộc kỹ thuật

```
- KHÔNG đổi field name, cấu trúc state form, hay cách gọi API hiện có — chỉ thay đổi
  phần hiển thị (UI) và animation.
- Ưu tiên thư viện nhẹ, có sẵn accessibility (Headless UI / Radix), tránh thêm
  dependency nặng không cần thiết (ví dụ tránh cả 1 bộ UI kit lớn chỉ để lấy 1
  component select).
- Responsive: đảm bảo loading state và dropdown hoạt động tốt trên mobile (test ở
  viewport 375px).
- Không phá vỡ test hiện có (nếu đã có test cho form này, chạy lại test sau khi sửa).
```

---

## 5. Tiêu chí nghiệm thu (Definition of Done)

```
[ ] Bấm "Thêm giao dịch" có phản hồi trực quan ngay lập tức (spinner/disable), không
    còn cảm giác đứng hình
[ ] Trường hợp API lỗi được xử lý rõ ràng, nút không bị kẹt ở trạng thái loading mãi
[ ] Dropdown danh mục có animation mượt, đúng theme dark, dùng được bằng bàn phím
[ ] Test trên Chrome DevTools ở chế độ mạng chậm (Network throttling: Slow 3G) để
    xác nhận loading state hiển thị đúng, không giật
[ ] Test responsive ở mobile viewport
[ ] Không phát sinh console error/warning mới
```

---

## 7. BUG FIX BỔ SUNG — Dropdown đẩy layout, xuất hiện scrollbar dài toàn modal

> Gặp sau khi custom dropdown: list category khi mở ra bị render theo flow bình
> thường (đẩy các field bên dưới xuống) thay vì nổi đè lên trên, khiến cả modal xuất
> hiện 1 scrollbar dài chạy suốt chiều cao, thay vì chỉ có scrollbar nhỏ riêng cho
> khung list.

```
Nguyên nhân: dropdown panel hiện đang render trong document flow bình thường (không
có position: absolute), nên khi mở ra nó chiếm chỗ thật trong layout, đẩy các phần tử
sau nó (nút Hủy/Thêm giao dịch...) xuống, làm tổng chiều cao nội dung modal vượt quá
khung hiển thị -> trình duyệt tự thêm scrollbar cho CẢ modal.

Yêu cầu sửa:

1. Dropdown panel PHẢI định vị nổi (floating), không chiếm chỗ trong layout:
   - Nút trigger (ô "— Chọn danh mục —") cần có `position: relative`
   - Panel danh sách cần có `position: absolute; top: 100%; left: 0; right: 0;
     z-index: 50` (Tailwind: `absolute top-full left-0 right-0 z-50`)
   - Panel phải "đè" lên trên các field bên dưới (Ngày, Ghi chú...), KHÔNG đẩy chúng
     xuống.

2. Giới hạn chiều cao panel + chỉ 1 scrollbar RIÊNG cho panel này:
   - `max-height` cỡ 5-6 items (ví dụ max-h-60 / 240px), `overflow-y: auto` CHỈ đặt
     trên panel này
   - TUYỆT ĐỐI không đặt overflow-y-auto hay max-height nào ở modal wrapper/container
     cha chỉ vì dropdown — modal cha giữ nguyên overflow tự nhiên của nó
   - Style scrollbar mỏng, tinh tế cho riêng panel (VD: `scrollbar-thin
     scrollbar-thumb-slate-600 scrollbar-track-transparent` nếu dùng plugin
     tailwind-scrollbar, hoặc custom ::-webkit-scrollbar width 4-6px)

3. Nếu modal cha có `overflow: hidden` hoặc `overflow-y: auto` với chiều cao cố định
   (rất có thể đang là nguyên nhân dropdown bị "kẹt"/clip): dùng giải pháp Portal để
   panel render thẳng ra ngoài DOM tree của modal (render vào document.body), tránh bị
   cha clip mất. Nếu đang dùng Headless UI Listbox, chuyển sang dùng kèm
   `@headlessui/react` Portal, hoặc đơn giản nhất là đổi qua Radix UI Select /
   shadcn/ui Select — cả hai đều tự động Portal ra ngoài, tránh toàn bộ vấn đề clip +
   đẩy layout này mà không cần tự xử lý CSS phức tạp (khuyến nghị nếu đang gặp bug
   này nhiều lần).

4. Khi panel đóng lại: layout modal phải trở về đúng chiều cao ban đầu ngay lập tức,
   không để lại khoảng trống hay giật layout (layout shift).

Tiêu chí kiểm tra sau khi sửa:
[ ] Mở dropdown: các field bên dưới (Ngày, Ghi chú, nút Hủy/Thêm) KHÔNG bị đẩy xuống
[ ] Chỉ có đúng 1 scrollbar nhỏ, nằm bên trong khung list category — không còn
    scrollbar dài chạy suốt modal
[ ] Đóng dropdown: layout trở lại bình thường ngay, không giật
[ ] Test với modal ở màn hình nhỏ (mobile) — dropdown vẫn hiển thị đúng, không bị cắt
```

---

## 8. Cách dùng prompt này

```
1. Mở file component Modal thêm giao dịch (và component Select nếu tách riêng)
2. Copy nguyên nội dung 2 file đó, paste ngay phía trên hoặc dưới prompt này
3. Đưa cho AI code (Claude Code/Cursor...) trong 1 lượt duy nhất — vì đây là task sửa
   UI cụ thể trên code có sẵn, không cần chia nhỏ nhiều lượt như prompt kiến trúc hệ
   thống trước đó
4. Sau khi AI sửa xong: tự tay test lại theo mục 5 (Definition of Done) trước khi
   commit, đừng chỉ nhìn code là "có vẻ đúng" rồi push luôn
```