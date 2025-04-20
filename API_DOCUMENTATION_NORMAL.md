# Tài liệu API - Hệ thống ColorMedia Affiliate (Module Thường)

## Giới thiệu
Tài liệu này mô tả chi tiết API của hệ thống ColorMedia Affiliate thường, cho phép quản lý thông tin affiliate, theo dõi khách hàng được giới thiệu, và xử lý các yêu cầu rút tiền hoa hồng.

## Định dạng phản hồi
Tất cả API trả về phản hồi ở định dạng JSON với header `Content-Type: application/json`. Các phản hồi tuân theo định dạng chuẩn:

- **Thành công**: `{ "status": "success", "data": {...} }`
- **Lỗi**: `{ "status": "error", "error": { "code": "ERROR_CODE", "message": "Thông báo lỗi" } }`

## Xác thực
Xác thực người dùng sử dụng token Bearer JWT. Trừ các endpoint dành riêng cho việc đăng nhập và đăng ký, tất cả các API khác đều yêu cầu xác thực.

### Đăng nhập lần đầu
Khi đăng nhập lần đầu, người dùng sẽ được yêu cầu đổi mật khẩu mặc định `color1234@`. API sẽ trả về thông tin `requires_password_change: true` nếu người dùng cần đổi mật khẩu.

## API Xác thực

### Đăng nhập
**Endpoint**: `POST /api/auth/login`

**Mô tả**: Xác thực người dùng và cung cấp token truy cập.

**Request Body**:
```json
{
  "username": "affiliate1@colormedia.vn",
  "password": "password123"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": 2,
    "username": "affiliate1@colormedia.vn",
    "role": "AFFILIATE",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Phản hồi lỗi (cần đổi mật khẩu)**:
```json
{
  "status": "error",
  "error": {
    "code": "CHANGE_PASSWORD_REQUIRED",
    "message": "Bạn cần đổi mật khẩu trước khi đăng nhập lần đầu",
    "user_id": 2
  }
}
```

### Đổi mật khẩu
**Endpoint**: `POST /api/auth/change-password`

**Mô tả**: Đổi mật khẩu người dùng.

**Request Body**:
```json
{
  "user_id": 2,
  "old_password": "color1234@",
  "new_password": "newStrongPassword123!"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại với mật khẩu mới."
  }
}
```

### Đăng xuất
**Endpoint**: `POST /api/auth/logout`

**Mô tả**: Đăng xuất người dùng hiện tại và hủy token.

**Headers**:
```
Authorization: Bearer <token>
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "message": "Đăng xuất thành công"
  }
}
```

### Lấy thông tin người dùng hiện tại
**Endpoint**: `GET /api/auth/me`

**Mô tả**: Lấy thông tin người dùng hiện tại dựa trên token.

**Headers**:
```
Authorization: Bearer <token>
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": 2,
    "username": "affiliate1@colormedia.vn",
    "role": "AFFILIATE"
  }
}
```

## API Affiliate

### Lấy thông tin affiliate hiện tại
**Endpoint**: `GET /api/affiliate/profile`

**Mô tả**: Lấy thông tin chi tiết của affiliate dựa trên token người dùng.

**Headers**:
```
Authorization: Bearer <token>
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": 2,
    "affiliate_id": "AFF101",
    "full_name": "Nguyễn Văn A",
    "email": "affiliate1@colormedia.vn",
    "phone": "0901234567",
    "bank_account": "0123456789",
    "bank_name": "TPBank",
    "total_contacts": 25,
    "total_contracts": 8,
    "contract_value": 180000000,
    "received_balance": 36000000,
    "paid_balance": 18000000,
    "remaining_balance": 80000000
  }
}
```

### Lấy danh sách khách hàng giới thiệu
**Endpoint**: `GET /api/affiliate/customers`

**Mô tả**: Lấy danh sách khách hàng được affiliate giới thiệu.

**Headers**:
```
Authorization: Bearer <token>
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": [
    {
      "customer_name": "ABC Company",
      "status": "Contract signed",
      "created_at": "2023-12-10T00:00:00Z",
      "updated_at": "2023-12-15T00:00:00Z",
      "contract_value": 50000000,
      "commission": 5000000,
      "contract_date": "2023-12-15T00:00:00Z",
      "note": "Customer agreed to a 12-month contract worth 50,000,000 VND."
    },
    {
      "customer_name": "XYZ Corporation",
      "status": "Presenting idea",
      "created_at": "2024-03-25T00:00:00Z",
      "updated_at": "2024-03-28T00:00:00Z",
      "note": "Khách hàng đang xem xét đề xuất"
    }
  ]
}
```

### Lấy lịch sử rút tiền
**Endpoint**: `GET /api/affiliate/withdrawals`

**Mô tả**: Lấy lịch sử rút tiền của affiliate.

**Headers**:
```
Authorization: Bearer <token>
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": [
    {
      "request_date": "2024-04-15T00:00:00Z",
      "amount": 5000000,
      "note": "Commission for March",
      "status": "Processing"
    },
    {
      "request_date": "2024-04-10T00:00:00Z",
      "amount": 3000000,
      "note": "Advance payment",
      "status": "Rejected",
      "message": "Số tiền yêu cầu vượt quá số dư khả dụng"
    },
    {
      "request_date": "2024-03-14T00:00:00Z",
      "amount": 8000000,
      "note": "Commission for February",
      "status": "Completed",
      "transaction_id": "TXN-202403-001",
      "completed_date": "2024-03-16T00:00:00Z"
    }
  ]
}
```

### Tạo yêu cầu rút tiền
**Endpoint**: `POST /api/affiliate/withdrawals`

**Mô tả**: Tạo yêu cầu rút tiền mới.

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "amount": 5000000,
  "note": "April commission"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "request_date": "2024-04-20T00:00:00Z",
    "amount": 5000000,
    "note": "April commission",
    "status": "Pending",
    "message": "Yêu cầu rút tiền đang chờ xử lý"
  }
}
```

**Phản hồi lỗi (vượt quá hạn mức)**:
```json
{
  "status": "error",
  "error": {
    "code": "DAILY_LIMIT_EXCEEDED",
    "message": "Vượt quá giới hạn rút tiền trong ngày. Hạn mức còn lại: 15,000,000 VND"
  }
}
```

## API Admin

### Lấy danh sách tất cả affiliate
**Endpoint**: `GET /api/admin/affiliates`

**Mô tả**: Lấy danh sách tất cả các affiliate trong hệ thống.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "affiliate_id": "AFF100",
      "full_name": "ColorMedia Admin",
      "email": "admin@colormedia.vn",
      "phone": "0909123456",
      "total_contracts": 12,
      "contract_value": 240000000,
      "remaining_balance": 95000000
    },
    {
      "id": 2,
      "affiliate_id": "AFF101",
      "full_name": "Nguyễn Văn A",
      "email": "affiliate1@colormedia.vn",
      "phone": "0901234567",
      "total_contracts": 8,
      "contract_value": 180000000,
      "remaining_balance": 80000000
    }
  ]
}
```

### Tạo affiliate mới
**Endpoint**: `POST /api/admin/affiliates`

**Mô tả**: Tạo một affiliate mới và tài khoản người dùng liên kết.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Request Body**:
```json
{
  "affiliate_id": "AFF103",
  "full_name": "Lê Thị C",
  "email": "affiliate_c@example.com",
  "phone": "0903456789",
  "bank_account": "9876543210",
  "bank_name": "VietcomBank"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": 4,
    "user_id": 4,
    "affiliate_id": "AFF103",
    "full_name": "Lê Thị C",
    "email": "affiliate_c@example.com",
    "phone": "0903456789",
    "bank_account": "9876543210",
    "bank_name": "VietcomBank",
    "total_contacts": 0,
    "total_contracts": 0,
    "contract_value": 0,
    "received_balance": 0,
    "paid_balance": 0,
    "remaining_balance": 0,
    "message": "Affiliate mới đã được tạo thành công. Email kích hoạt đã được gửi."
  }
}
```

**Phản hồi lỗi (email đã tồn tại)**:
```json
{
  "status": "error",
  "error": {
    "code": "EMAIL_ALREADY_IN_USE",
    "message": "Email affiliate_c@example.com đã được sử dụng bởi affiliate khác. Vui lòng sử dụng email khác."
  }
}
```

**Phản hồi lỗi (affiliate_id không đúng định dạng)**:
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_AFFILIATE_ID",
    "message": "Affiliate ID phải bắt đầu bằng 'AFF' (ví dụ: AFF101)"
  }
}
```

### Thêm khách hàng giới thiệu mới
**Endpoint**: `POST /api/admin/customers`

**Mô tả**: Thêm một khách hàng mới được giới thiệu bởi affiliate.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Request Body**:
```json
{
  "affiliate_id": 2,
  "name": "DEF Industries",
  "phone": "0942345678",
  "email": "contact@def-industries.com",
  "status": "Contact received",
  "description": "Khách hàng được giới thiệu qua hội thảo"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": 0,
    "name": "DEF Industries",
    "phone": "0942345678",
    "email": "contact@def-industries.com",
    "status": "Contact received",
    "created_at": "2024-04-20T00:00:00Z",
    "updated_at": "2024-04-20T00:00:00Z",
    "contract_value": null,
    "events": [
      {
        "id": 0,
        "timestamp": "2024-04-20T00:00:00Z",
        "status": "Contact received",
        "description": "Khách hàng được giới thiệu qua hội thảo"
      }
    ]
  }
}
```

### Cập nhật trạng thái khách hàng
**Endpoint**: `PUT /api/admin/customers/:id/status`

**Mô tả**: Cập nhật trạng thái của khách hàng giới thiệu.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Params**:
- `id`: ID của khách hàng (index trong mảng)

**Request Body**:
```json
{
  "status": "Presenting idea",
  "description": "Đã trình bày ý tưởng, đang chờ phản hồi"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": 0,
    "name": "DEF Industries",
    "status": "Presenting idea",
    "updated_at": "2024-04-22T00:00:00Z",
    "events": [
      {
        "id": 0,
        "timestamp": "2024-04-22T00:00:00Z",
        "status": "Presenting idea",
        "description": "Đã trình bày ý tưởng, đang chờ phản hồi"
      }
    ]
  }
}
```

### Cập nhật giá trị hợp đồng
**Endpoint**: `PUT /api/admin/customers/:id/contract`

**Mô tả**: Cập nhật giá trị hợp đồng cho khách hàng và tính hoa hồng.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Params**:
- `id`: ID của khách hàng (index trong mảng)

**Request Body**:
```json
{
  "contract_value": 50000000
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": 0,
    "name": "DEF Industries",
    "status": "Contract signed",
    "contract_value": 50000000,
    "additional_contract_value": 50000000,
    "commission": 1500000,
    "additional_commission": 1500000,
    "updated_at": "2024-04-25T00:00:00Z",
    "affiliate_balance": {
      "total_contract_value": 230000000,
      "total_received_balance": 37500000,
      "paid_balance": 18000000,
      "remaining_balance": 19500000,
      "actual_balance": 19500000
    }
  }
}
```

### Cập nhật trạng thái yêu cầu rút tiền
**Endpoint**: `PUT /api/admin/withdrawals/:affiliate_id/:request_time`

**Mô tả**: Cập nhật trạng thái của yêu cầu rút tiền.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Params**:
- `affiliate_id`: ID của affiliate (ví dụ: "AFF101")
- `request_time`: Thời gian yêu cầu (định dạng ISO)

**Request Body**:
```json
{
  "status": "Processing",
  "message": "Đang xử lý yêu cầu rút tiền"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "request_date": "2024-04-15T00:00:00Z",
    "amount": 5000000,
    "note": "Commission for March",
    "status": "Processing",
    "message": "Đang xử lý yêu cầu rút tiền"
  }
}
```

### Thêm dữ liệu mẫu
**Endpoint**: `POST /api/admin/seed-data`

**Mô tả**: Thêm dữ liệu mẫu vào hệ thống.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Request Body**:
```json
{
  "affiliates_count": 5,
  "customers_per_affiliate": 3,
  "withdrawals_per_affiliate": 2
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "message": "Đã thêm dữ liệu mẫu thành công",
    "summary": {
      "affiliates_added": 5,
      "customers_added": 15,
      "withdrawals_added": 10
    }
  }
}
```

## Kiểm tra OTP

### Tạo OTP cho rút tiền
**Endpoint**: `POST /api/affiliate/withdrawals/otp`

**Mô tả**: Tạo mã OTP để xác thực yêu cầu rút tiền.

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "amount": 5000000
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "message": "Mã OTP đã được gửi đến email của bạn",
    "expires_in": 300
  }
}
```

### Xác thực OTP
**Endpoint**: `POST /api/affiliate/withdrawals/verify-otp`

**Mô tả**: Xác thực mã OTP để hoàn tất yêu cầu rút tiền.

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "amount": 5000000,
  "note": "April commission",
  "otp_code": "123456"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "request_date": "2024-04-20T00:00:00Z",
    "amount": 5000000,
    "note": "April commission",
    "status": "Pending",
    "message": "Yêu cầu rút tiền đã được xác thực và đang chờ xử lý"
  }
}
```

**Phản hồi lỗi (OTP không hợp lệ)**:
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_OTP",
    "message": "Mã OTP không hợp lệ hoặc đã hết hạn"
  }
}
```

## Tài khoản kiểm thử

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

## Lưu ý quan trọng

1. Chỉ người dùng có role "AFFILIATE" mới có thể truy cập các API của Affiliate.
2. Admin sử dụng token cố định là `45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60`.
3. Yêu cầu rút tiền sẽ tự động trừ thuế thu nhập cá nhân 10% nếu số tiền rút vượt quá 2 triệu VND.
4. Giới hạn rút tiền trong ngày là 20 triệu VND và reset vào 9:00 sáng mỗi ngày.
5. Hoa hồng được tính là 3% giá trị hợp đồng khi khách hàng chuyển sang trạng thái "Đã chốt hợp đồng".