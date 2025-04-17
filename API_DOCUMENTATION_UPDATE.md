## Cập nhật API (Hệ thống Affiliate ColorMedia)

### Thay đổi mới trong API

1. **Cải thiện xử lý lỗi**:
   - Tất cả API endpoint đều trả về phản hồi dạng JSON với định dạng chuẩn.
   - Bổ sung header Content-Type: application/json cho tất cả phản hồi API.
   - Thêm middleware để xử lý routes không tồn tại, trả về lỗi 404 dưới dạng JSON thay vì HTML.

2. **Định dạng JSON mẫu cho phản hồi**:
   - Phản hồi thành công: `{ "status": "success", "data": {...} }`
   - Phản hồi lỗi: `{ "status": "error", "error": { "code": "ERROR_CODE", "message": "Thông báo lỗi" } }`

3. **API quản lý admin mới**:
   - `GET /api/admin/affiliates`: Lấy danh sách tất cả các affiliate trong hệ thống.
   - Cập nhật `POST /api/admin/affiliates` để tự động tạo tài khoản người dùng và liên kết với affiliate.

### Ví dụ tài khoản test

```
Admin:
- Username: admin@colormedia.vn
- Password: admin@123

Affiliate 1:
- Username: affiliate1@colormedia.vn
- Password: affiliate1@123
- Affiliate ID: AFF101

Affiliate 2:
- Username: affiliate2@colormedia.vn
- Password: affiliate2@123
- Affiliate ID: AFF102
```

### Thay đổi quan trọng

1. **Lưu ý về tính trùng lặp affiliate_id**:
   - Trong môi trường phát triển (MemStorage), việc kiểm tra trùng lặp affiliate_id có giới hạn vì cấu trúc dữ liệu.
   - Trong môi trường sản xuất (PostgreSQL), kiểm tra trùng lặp sẽ hoạt động chính xác.

2. **Cập nhật API tạo affiliate**:
   - API không còn yêu cầu `user_id` trong body của request nữa.
   - Hệ thống sẽ tự động tạo tài khoản người dùng với mật khẩu mặc định là "color1234@".
   - Email kích hoạt sẽ được gửi đến địa chỉ email của affiliate với thông tin đăng nhập.
   - API sẽ kiểm tra xem email của affiliate đã tồn tại trong hệ thống chưa. Nếu đã tồn tại, sẽ sử dụng tài khoản người dùng hiện có thay vì tạo mới.

3. **Thông tin dữ liệu test**:
   - API `POST /api/reset-data` đã được cập nhật để tạo tài khoản test và dữ liệu mẫu.
   - Affiliate 1: 3 khách hàng (2 hợp đồng) với tổng giá trị 255M VND, hoa hồng 7.65M VND.
   - Affiliate 2: 4 khách hàng (3 hợp đồng) với tổng giá trị 780M VND, hoa hồng 23.4M VND.