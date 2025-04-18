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
   - `PUT /api/admin/withdrawals/:affiliate_id/:request_time`: Cập nhật trạng thái yêu cầu rút tiền.
     - Yêu cầu xác thực quản trị viên.
     - Hỗ trợ cập nhật các trạng thái: "Pending", "Processing", "Completed", "Rejected", "Cancelled".
     - Body request: `{ "status": "Processing", "note": "Đang xử lý yêu cầu" }`
     - Phản hồi thành công:
     ```json
     {
       "status": "success",
       "data": {
         "message": "Trạng thái yêu cầu rút tiền đã được cập nhật thành Processing",
         "withdrawal": {
           "affiliate_id": "AFF001",
           "full_name": "Võ Xuân Hiếu",
           "amount": 15000000,
           "request_time": "2025-04-18T02:51:55.606Z",
           "status": "Processing",
           "updated_at": "2025-04-18T03:08:44.221Z"
         }
       }
     }
     ```

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
   - API kiểm tra xem email đã được sử dụng cho affiliate nào chưa. Nếu email đã tồn tại và đã được liên kết với một affiliate, hệ thống sẽ báo lỗi và yêu cầu sử dụng email khác.

3. **Cập nhật API quản lý yêu cầu rút tiền (Admin)**:
   - Thêm API endpoint mới: `PUT /api/admin/withdrawals/:affiliate_id/:request_time`
   - API hỗ trợ toàn bộ quy trình quản lý yêu cầu rút tiền từ đầu đến cuối
   - Các trạng thái hợp lệ: "Pending", "Processing", "Completed", "Rejected", "Cancelled"
   - Quy trình thường qua các trạng thái: Pending → Processing → Completed/Rejected
   - Khi chuyển sang trạng thái "Processing", hệ thống tự động trừ số dư của affiliate
   - Khi chuyển sang trạng thái "Rejected", hệ thống hoàn trả số dư đã trừ cho affiliate
   - Khi chuyển sang trạng thái "Cancelled", hệ thống hủy yêu cầu và hoàn trả số dư đã trừ
   - Quản trị viên có thể thêm ghi chú (note) cho mỗi lần cập nhật trạng thái
   - Xác thực bằng token quản trị viên (Bearer token)
   - Ví dụ gọi API:
     ```
     curl -X PUT http://localhost:5000/api/admin/withdrawals/AFF001/2025-04-18T02:51:55.606Z \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer admin" \
       -d '{"status":"Processing", "note":"Đang xử lý yêu cầu rút tiền"}'
     ```
   
4. **Thông tin dữ liệu test**:
   - API `POST /api/reset-data` đã được cập nhật để tạo tài khoản test và dữ liệu mẫu.
   - Affiliate 1: 3 khách hàng (2 hợp đồng) với tổng giá trị 255M VND, hoa hồng 7.65M VND.
   - Affiliate 2: 4 khách hàng (3 hợp đồng) với tổng giá trị 780M VND, hoa hồng 23.4M VND.