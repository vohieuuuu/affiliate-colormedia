# Tài liệu API - Hệ thống ColorMedia Affiliate

## Giới thiệu

Tài liệu này mô tả chi tiết toàn bộ API của hệ thống ColorMedia Affiliate, bao gồm cả hai module chính:
1. **Module Affiliate thường**: Quản lý thông tin affiliate, theo dõi khách hàng được giới thiệu, và xử lý các yêu cầu rút tiền hoa hồng.
2. **Module KOL/VIP**: Quản lý thông tin KOL/VIP với hệ thống KPI, theo dõi liên hệ và quản lý hợp đồng.

Ngoài ra, tài liệu cũng mô tả các API mới về quản lý video và sales kit cho cả hai module.

## Định dạng phản hồi

Tất cả API trả về phản hồi ở định dạng JSON với header `Content-Type: application/json`. Các phản hồi tuân theo định dạng chuẩn:

- **Thành công**: `{ "status": "success", "data": {...} }`
- **Lỗi**: `{ "status": "error", "error": { "code": "ERROR_CODE", "message": "Thông báo lỗi" } }`

## Cơ chế Xác thực

### Tổng quan về xác thực

Hệ thống sử dụng cơ chế xác thực token Bearer JWT. Trừ các endpoint dành riêng cho việc đăng nhập và đăng ký, tất cả các API khác đều yêu cầu xác thực.

Token được truyền qua một trong các cách sau:
1. Header Authorization: `Authorization: Bearer <token>`
2. Cookie: `auth_token=<token>`
3. Request body: `{ "token": "<token>" }`

### Đăng nhập lần đầu

Khi đăng nhập lần đầu, người dùng sẽ được yêu cầu đổi mật khẩu mặc định `color1234@`. API sẽ trả về thông tin `requires_password_change: true` nếu người dùng cần đổi mật khẩu.

---

# I. API Xác thực (Chung cho cả hai module)

## 1. Đăng nhập
**Endpoint**: `POST /api/auth/login`

**Mô tả**: Xác thực người dùng và cung cấp token truy cập.

**Request Body**:
```json
{
  "username": "example@colormedia.vn",
  "password": "password123"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": 2,
    "username": "example@colormedia.vn",
    "role": "AFFILIATE", // Có thể là: "ADMIN", "AFFILIATE", "KOL_VIP"
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

## 2. Đổi mật khẩu
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

## 3. Đăng xuất
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

## 4. Lấy thông tin người dùng hiện tại
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
    "username": "example@colormedia.vn",
    "role": "AFFILIATE" // hoặc "ADMIN", "KOL_VIP"
  }
}
```

---

# II. API Module Affiliate Thường

## 1. Thông tin Affiliate

### 1.1 Lấy thông tin affiliate hiện tại
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

### 1.2 Lấy danh sách khách hàng giới thiệu
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

## 2. Quản lý Rút tiền

### 2.1 Lấy lịch sử rút tiền
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

### 2.2 Tạo yêu cầu rút tiền
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
  "note": "April commission",
  "tax_id": "8901234567" // MST (optional, required only when amount > 2,000,000 VND)
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

### 2.3 Tạo OTP cho rút tiền
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

### 2.4 Xác thực OTP
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
  "otp_code": "123456",
  "tax_id": "8901234567" // MST (optional, required only when amount > 2,000,000 VND)
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

---

# III. API Module KOL/VIP

## 1. Thông tin KOL/VIP

### 1.1 Lấy thông tin KOL/VIP hiện tại
**Endpoint**: `GET /api/kol/me`

**Mô tả**: Lấy thông tin chi tiết của KOL/VIP dựa trên token người dùng.

**Headers**:
```
Authorization: Bearer <token>
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": "KOL101",
    "user_id": 5,
    "full_name": "Trần Văn D",
    "email": "kol1@colormedia.vn",
    "phone": "0905678901",
    "level": "LEVEL_1",
    "join_date": "2024-03-15T00:00:00Z",
    "bank_account": "9876543210",
    "bank_name": "VietcomBank",
    "monthly_stats": {
      "total_contacts": 8,
      "potential_contacts": 3,
      "contracts": 1,
      "contract_value": 50000000,
      "commission": 1500000,
      "base_salary": 5000000
    }
  }
}
```

## 2. Quản lý Liên hệ

### 2.1 Lấy danh sách liên hệ của KOL/VIP
**Endpoint**: `GET /api/kol/:kolId/contacts`

**Mô tả**: Lấy danh sách liên hệ được KOL/VIP quản lý.

**Headers**:
```
Authorization: Bearer <token>
```

**Params**:
- `kolId`: ID của KOL/VIP

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "contact_name": "Nguyễn Tiến E",
      "company": "Tech Solutions",
      "position": "Giám đốc Marketing",
      "phone": "0912345678",
      "email": "nguyen.e@techsolutions.com",
      "status": "Đang tư vấn",
      "created_at": "2024-04-01T00:00:00Z",
      "note": "Đã liên hệ và giới thiệu dịch vụ",
      "contract_value": null
    },
    {
      "id": 2,
      "contact_name": "Lê Thị F",
      "company": "Global Media",
      "position": "CEO",
      "phone": "0923456789",
      "email": "le.f@globalmedia.com",
      "status": "Đã chốt hợp đồng",
      "created_at": "2024-04-05T00:00:00Z",
      "note": "Đã ký hợp đồng 3 tháng",
      "contract_value": 50000000
    }
  ]
}
```

### 2.2 Thêm liên hệ mới
**Endpoint**: `POST /api/kol/:kolId/contacts`

**Mô tả**: Thêm một liên hệ mới cho KOL/VIP.

**Headers**:
```
Authorization: Bearer <token>
```

**Params**:
- `kolId`: ID của KOL/VIP

**Request Body**:
```json
{
  "contact_name": "Phạm Văn G",
  "company": "Fashion House",
  "position": "Giám đốc Thương hiệu",
  "phone": "0934567890",
  "email": "pham.g@fashionhouse.com",
  "status": "Mới nhập",
  "note": "Gặp tại sự kiện ra mắt sản phẩm"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": 3,
    "kol_id": "KOL101",
    "contact_name": "Phạm Văn G",
    "company": "Fashion House",
    "position": "Giám đốc Thương hiệu",
    "phone": "0934567890",
    "email": "pham.g@fashionhouse.com",
    "status": "Mới nhập",
    "created_at": "2024-04-20T00:00:00Z",
    "note": "Gặp tại sự kiện ra mắt sản phẩm",
    "contract_value": null
  }
}
```

### 2.3 Cập nhật trạng thái liên hệ
**Endpoint**: `PUT /api/kol/:kolId/contacts/:contactId`

**Mô tả**: Cập nhật thông tin hoặc trạng thái của liên hệ.

**Headers**:
```
Authorization: Bearer <token>
```

**Params**:
- `kolId`: ID của KOL/VIP
- `contactId`: ID của liên hệ

**Request Body**:
```json
{
  "status": "Đang tư vấn",
  "note": "Đã trao đổi và gửi báo giá, đang chờ phản hồi"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": 3,
    "contact_name": "Phạm Văn G",
    "company": "Fashion House",
    "status": "Đang tư vấn",
    "updated_at": "2024-04-22T00:00:00Z",
    "note": "Đã trao đổi và gửi báo giá, đang chờ phản hồi"
  }
}
```

### 2.4 Thêm hợp đồng cho liên hệ
**Endpoint**: `POST /api/kol/:kolId/contacts/:contactId/contract`

**Mô tả**: Thêm thông tin hợp đồng cho liên hệ và cập nhật trạng thái thành "Đã chốt hợp đồng".

**Headers**:
```
Authorization: Bearer <token>
```

**Params**:
- `kolId`: ID của KOL/VIP
- `contactId`: ID của liên hệ

**Request Body**:
```json
{
  "contract_value": 75000000,
  "note": "Hợp đồng kéo dài 6 tháng, dịch vụ toàn diện"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "contact": {
      "id": 3,
      "kol_id": "KOL101",
      "contact_name": "Phạm Văn G",
      "company": "Fashion House",
      "position": "Giám đốc Thương hiệu",
      "phone": "0934567890",
      "email": "pham.g@fashionhouse.com",
      "status": "Đã chốt hợp đồng",
      "created_at": "2024-04-20T00:00:00Z",
      "updated_at": "2024-04-25T00:00:00Z",
      "note": "Hợp đồng kéo dài 6 tháng, dịch vụ toàn diện",
      "contract_value": 75000000,
      "commission": 2250000,
      "contract_date": "2024-04-25T00:00:00Z"
    },
    "kol": {
      // Thông tin KOL được cập nhật với số dư mới
    }
  }
}
```

## 3. Quản lý KPI

### 3.1 Lấy thống kê KPI
**Endpoint**: `GET /api/kol/:kolId/kpi-stats`

**Mô tả**: Lấy thống kê KPI của KOL/VIP hiện tại và các tháng trước.

**Headers**:
```
Authorization: Bearer <token>
```

**Params**:
- `kolId`: ID của KOL/VIP

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "current_month": {
      "year": 2024,
      "month": 4,
      "total_contacts": 8,
      "potential_contacts": 3,
      "contracts": 1,
      "performance": "PENDING",
      "base_salary": 5000000,
      "commission": 2250000,
      "evaluation_date": null
    },
    "previous_months": [
      {
        "year": 2024,
        "month": 3,
        "total_contacts": 12,
        "potential_contacts": 6,
        "contracts": 2,
        "performance": "ACHIEVED",
        "base_salary": 5000000,
        "commission": 3000000,
        "evaluation_date": "2024-04-01T00:00:00Z",
        "note": "Đạt KPI tháng 3/2024"
      },
      {
        "year": 2024,
        "month": 2,
        "total_contacts": 5,
        "potential_contacts": 2,
        "contracts": 0,
        "performance": "NOT_ACHIEVED",
        "base_salary": 5000000,
        "commission": 0,
        "evaluation_date": "2024-03-01T00:00:00Z",
        "note": "Chưa đạt KPI tháng 2/2024"
      }
    ]
  }
}
```

## 4. AI và OCR

### 4.1 Quét card visit với AI
**Endpoint**: `POST /api/kol/:kolId/scan-card`

**Mô tả**: Quét và trích xuất thông tin từ ảnh card visit với AI.

**Headers**:
```
Authorization: Bearer <token>
```

**Params**:
- `kolId`: ID của KOL/VIP

**Request Body**:
```json
{
  "image_base64": "base64_encoded_image_data..."
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "contact_name": "Hoàng Minh H",
    "company": "Digital Solutions",
    "position": "Marketing Director",
    "phone": "0945678901",
    "email": "hoang.h@digitalsolutions.vn"
  }
}
```

## 5. Quản lý Rút tiền KOL/VIP

### 5.1 Tạo yêu cầu rút tiền KOL/VIP
**Endpoint**: `POST /api/kol/withdrawals`

**Mô tả**: Tạo yêu cầu rút tiền mới cho KOL/VIP.

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "amount": 5000000,
  "note": "April commission",
  "tax_id": "8901234567" // MST (optional, required only when amount > 2,000,000 VND)
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

### 5.2 Tạo OTP cho rút tiền KOL/VIP
**Endpoint**: `POST /api/kol/withdrawals/otp`

**Mô tả**: Tạo mã OTP để xác thực yêu cầu rút tiền cho KOL/VIP.

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

### 5.3 Xác thực OTP cho KOL/VIP
**Endpoint**: `POST /api/kol/withdrawals/verify-otp`

**Mô tả**: Xác thực mã OTP để hoàn tất yêu cầu rút tiền cho KOL/VIP.

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "amount": 5000000,
  "note": "April commission",
  "otp_code": "123456",
  "tax_id": "8901234567" // MST (optional, required only when amount > 2,000,000 VND)
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

---

# IV. API Quản lý Tài nguyên (Videos & Sales Kits)

## 1. Videos

### 1.1 Lấy tất cả videos
**Endpoint**: `GET /api/videos`

**Mô tả**: Lấy danh sách tất cả videos.

**Headers**:
```
Authorization: Bearer <token>
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "videos": [
      {
        "id": 1,
        "title": "Hướng dẫn sử dụng dashboard",
        "description": "Giới thiệu tổng quan và hướng dẫn sử dụng dashboard",
        "url": "https://youtu.be/abc123",
        "thumbnail_url": "https://i.ytimg.com/vi/abc123/maxresdefault.jpg",
        "created_at": "2024-04-10T00:00:00Z",
        "category": "Tutorial",
        "views": 150
      },
      {
        "id": 2,
        "title": "Chiến lược tiếp cận khách hàng 2024",
        "description": "Chiến lược tiếp cận khách hàng hiệu quả năm 2024",
        "url": "https://youtu.be/def456",
        "thumbnail_url": "https://i.ytimg.com/vi/def456/maxresdefault.jpg",
        "created_at": "2024-03-15T00:00:00Z",
        "category": "Strategy",
        "views": 320
      }
    ]
  }
}
```

### 1.2 Lấy top videos
**Endpoint**: `GET /api/videos/top`

**Mô tả**: Lấy danh sách top videos (theo lượt xem).

**Headers**:
```
Authorization: Bearer <token>
```

**Query Params**:
- `limit`: Số lượng videos trả về (mặc định: 5)

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "videos": [
      {
        "id": 2,
        "title": "Chiến lược tiếp cận khách hàng 2024",
        "description": "Chiến lược tiếp cận khách hàng hiệu quả năm 2024",
        "url": "https://youtu.be/def456",
        "thumbnail_url": "https://i.ytimg.com/vi/def456/maxresdefault.jpg",
        "created_at": "2024-03-15T00:00:00Z",
        "category": "Strategy",
        "views": 320
      },
      {
        "id": 1,
        "title": "Hướng dẫn sử dụng dashboard",
        "description": "Giới thiệu tổng quan và hướng dẫn sử dụng dashboard",
        "url": "https://youtu.be/abc123",
        "thumbnail_url": "https://i.ytimg.com/vi/abc123/maxresdefault.jpg",
        "created_at": "2024-04-10T00:00:00Z",
        "category": "Tutorial",
        "views": 150
      }
    ]
  }
}
```

### 1.3 Lấy top videos theo ngành
**Endpoint**: `GET /api/videos/category/:category`

**Mô tả**: Lấy danh sách top videos theo ngành cụ thể.

**Headers**:
```
Authorization: Bearer <token>
```

**Params**:
- `category`: Tên ngành (ví dụ: commerce, pharma, finance, tech, government, conglomerate)

**Query Params**:
- `limit`: Số lượng videos trả về (mặc định: 5)

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 3,
      "title": "Chiến lược tiếp thị cho ngành thương mại",
      "description": "Các chiến lược tiếp thị hiệu quả cho doanh nghiệp thương mại",
      "youtube_id": "comm123",
      "thumbnail_url": "https://i.ytimg.com/vi/comm123/maxresdefault.jpg",
      "created_at": "2024-02-15T00:00:00Z",
      "published_at": "2024-02-15T00:00:00Z",
      "category": "commerce",
      "views": 450,
      "order": 1,
      "is_featured": true
    },
    {
      "id": 4,
      "title": "Xu hướng thương mại điện tử 2024",
      "description": "Phân tích các xu hướng thương mại điện tử năm 2024",
      "youtube_id": "ecomm456",
      "thumbnail_url": "https://i.ytimg.com/vi/ecomm456/maxresdefault.jpg",
      "created_at": "2024-01-20T00:00:00Z",
      "published_at": "2024-01-20T00:00:00Z",
      "category": "commerce",
      "views": 380,
      "order": 2,
      "is_featured": true
    }
  ]
}
```

**Danh sách các ngành được hỗ trợ**:
- `commerce`: Thương mại - Sản xuất
- `pharma`: Dược - Mỹ phẩm
- `finance`: Tài chính - Bảo hiểm
- `tech`: Công nghệ
- `government`: Tổ chức N.G.Os (Chính phủ)
- `conglomerate`: Tập đoàn Đa ngành

### 1.4 Thêm video mới (Admin only)
**Endpoint**: `POST /api/videos`

**Mô tả**: Thêm video mới vào hệ thống.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Request Body**:
```json
{
  "title": "Kỹ năng thuyết trình chuyên nghiệp",
  "description": "Hướng dẫn kỹ năng thuyết trình chuyên nghiệp cho đối tác",
  "url": "https://youtu.be/ghi789",
  "thumbnail_url": "https://i.ytimg.com/vi/ghi789/maxresdefault.jpg",
  "category": "Skills"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "video": {
      "id": 3,
      "title": "Kỹ năng thuyết trình chuyên nghiệp",
      "description": "Hướng dẫn kỹ năng thuyết trình chuyên nghiệp cho đối tác",
      "url": "https://youtu.be/ghi789",
      "thumbnail_url": "https://i.ytimg.com/vi/ghi789/maxresdefault.jpg",
      "created_at": "2024-04-23T00:00:00Z",
      "category": "Skills",
      "views": 0
    }
  }
}
```

### 1.5 Cập nhật video (Admin only)
**Endpoint**: `PUT /api/videos/:id`

**Mô tả**: Cập nhật thông tin video.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Params**:
- `id`: ID của video

**Request Body**:
```json
{
  "title": "Kỹ năng thuyết trình chuyên nghiệp 2024",
  "description": "Hướng dẫn kỹ năng thuyết trình chuyên nghiệp cho đối tác - Phiên bản cập nhật 2024",
  "category": "Professional Skills"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "video": {
      "id": 3,
      "title": "Kỹ năng thuyết trình chuyên nghiệp 2024",
      "description": "Hướng dẫn kỹ năng thuyết trình chuyên nghiệp cho đối tác - Phiên bản cập nhật 2024",
      "url": "https://youtu.be/ghi789",
      "thumbnail_url": "https://i.ytimg.com/vi/ghi789/maxresdefault.jpg",
      "created_at": "2024-04-23T00:00:00Z",
      "updated_at": "2024-04-23T01:30:00Z",
      "category": "Professional Skills",
      "views": 0
    }
  }
}
```

### 1.6 Xóa video (Admin only)
**Endpoint**: `DELETE /api/videos/:id`

**Mô tả**: Xóa video.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Params**:
- `id`: ID của video

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "message": "Video deleted successfully"
  }
}
```

## 2. Sales Kits

### 2.1 Lấy tất cả sales kits
**Endpoint**: `GET /api/sales-kits`

**Mô tả**: Lấy danh sách tất cả sales kits.

**Headers**:
```
Authorization: Bearer <token>
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "salesKits": [
      {
        "id": 1,
        "title": "Bộ tài liệu bán hàng dịch vụ marketing",
        "description": "Bộ tài liệu đầy đủ giới thiệu dịch vụ marketing của ColorMedia",
        "file_url": "https://api.colormedia.vn/files/marketing-kit-2024.pdf",
        "thumbnail_url": "https://api.colormedia.vn/images/marketing-kit-thumb.png",
        "created_at": "2024-02-15T00:00:00Z",
        "category": "Marketing",
        "downloads": 45,
        "file_size": 2560000
      },
      {
        "id": 2,
        "title": "Bảng giá dịch vụ 2024",
        "description": "Bảng giá đầy đủ các dịch vụ ColorMedia năm 2024",
        "file_url": "https://api.colormedia.vn/files/pricelist-2024.pdf",
        "thumbnail_url": "https://api.colormedia.vn/images/pricelist-thumb.png",
        "created_at": "2024-01-10T00:00:00Z",
        "category": "Pricing",
        "downloads": 78,
        "file_size": 1280000
      }
    ]
  }
}
```

### 2.2 Thêm sales kit mới (Admin only)
**Endpoint**: `POST /api/sales-kits`

**Mô tả**: Thêm sales kit mới vào hệ thống.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Request Body**:
```json
{
  "title": "Hướng dẫn sử dụng API",
  "description": "Tài liệu hướng dẫn chi tiết về cách sử dụng API của ColorMedia",
  "file_url": "https://api.colormedia.vn/files/api-guide-2024.pdf",
  "thumbnail_url": "https://api.colormedia.vn/images/api-guide-thumb.png",
  "category": "Technical",
  "file_size": 1840000
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "salesKit": {
      "id": 3,
      "title": "Hướng dẫn sử dụng API",
      "description": "Tài liệu hướng dẫn chi tiết về cách sử dụng API của ColorMedia",
      "file_url": "https://api.colormedia.vn/files/api-guide-2024.pdf",
      "thumbnail_url": "https://api.colormedia.vn/images/api-guide-thumb.png",
      "created_at": "2024-04-23T00:00:00Z",
      "category": "Technical",
      "downloads": 0,
      "file_size": 1840000
    }
  }
}
```

### 2.3 Cập nhật sales kit (Admin only)
**Endpoint**: `PUT /api/sales-kits/:id`

**Mô tả**: Cập nhật thông tin sales kit.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Params**:
- `id`: ID của sales kit

**Request Body**:
```json
{
  "title": "Hướng dẫn sử dụng API - Phiên bản 2.0",
  "description": "Tài liệu hướng dẫn chi tiết về cách sử dụng API của ColorMedia (Cập nhật mới nhất)",
  "category": "API Documentation"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "salesKit": {
      "id": 3,
      "title": "Hướng dẫn sử dụng API - Phiên bản 2.0",
      "description": "Tài liệu hướng dẫn chi tiết về cách sử dụng API của ColorMedia (Cập nhật mới nhất)",
      "file_url": "https://api.colormedia.vn/files/api-guide-2024.pdf",
      "thumbnail_url": "https://api.colormedia.vn/images/api-guide-thumb.png",
      "created_at": "2024-04-23T00:00:00Z",
      "updated_at": "2024-04-23T02:15:00Z",
      "category": "API Documentation",
      "downloads": 0,
      "file_size": 1840000
    }
  }
}
```

### 2.4 Xóa sales kit (Admin only)
**Endpoint**: `DELETE /api/sales-kits/:id`

**Mô tả**: Xóa sales kit.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Params**:
- `id`: ID của sales kit

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "message": "Sales kit deleted successfully"
  }
}
```

### 2.5 Tăng lượt tải sales kit
**Endpoint**: `POST /api/sales-kits/:id/download`

**Mô tả**: Tăng số đếm lượt tải xuống của sales kit.

**Headers**:
```
Authorization: Bearer <token>
```

**Params**:
- `id`: ID của sales kit

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "downloads": 46
  }
}
```

---

# V. API Admin

## 1. Quản lý Affiliate Thường

### 1.1 Lấy danh sách tất cả affiliate
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

### 1.2 Tạo affiliate mới
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

### 1.3 Thêm khách hàng giới thiệu mới
**Endpoint**: `POST /api/admin/customers`

**Mô tả**: Thêm một khách hàng mới được giới thiệu bởi affiliate.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Request Body**:
```json
{
  "affiliate_id": "AFF101",
  "customer_name": "DEF Industries",
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
    "customer_name": "DEF Industries",
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

### 1.4 Cập nhật trạng thái khách hàng
**Endpoint**: `PUT /api/admin/customers/:id/status`

**Mô tả**: Cập nhật trạng thái của khách hàng giới thiệu.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Params**:
- `id`: ID của khách hàng

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
    "customer_name": "DEF Industries",
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

### 1.5 Cập nhật giá trị hợp đồng
**Endpoint**: `PUT /api/admin/customers/:id/contract`

**Mô tả**: Cập nhật giá trị hợp đồng cho khách hàng và tính hoa hồng.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Params**:
- `id`: ID của khách hàng

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
    "customer_name": "DEF Industries",
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

### 1.6 Cập nhật trạng thái yêu cầu rút tiền
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

## 2. Quản lý KOL/VIP

### 2.1 Lấy danh sách tất cả KOL/VIP
**Endpoint**: `GET /api/admin/kol`

**Mô tả**: Lấy danh sách tất cả KOL/VIP trong hệ thống.

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
      "id": "KOL101",
      "full_name": "Trần Văn D",
      "email": "kol1@colormedia.vn",
      "phone": "0905678901",
      "level": "LEVEL_1",
      "join_date": "2024-03-15T00:00:00Z",
      "total_contacts": 8,
      "contracts": 1,
      "contract_value": 50000000
    },
    {
      "id": "KOL102",
      "full_name": "Nguyễn Thị H",
      "email": "kol2@colormedia.vn",
      "phone": "0916789012",
      "level": "LEVEL_2",
      "join_date": "2024-02-10T00:00:00Z",
      "total_contacts": 22,
      "contracts": 3,
      "contract_value": 180000000
    }
  ]
}
```

### 2.2 Tạo KOL/VIP mới
**Endpoint**: `POST /api/admin/kol/create`

**Mô tả**: Tạo một KOL/VIP mới và tài khoản người dùng liên kết.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Request Body**:
```json
{
  "affiliate_id": "KOL003",
  "full_name": "Lê Quang I",
  "email": "kol3@colormedia.vn",
  "phone": "0927890123",
  "level": "LEVEL_1",
  "bank_account": "1234567890",
  "bank_name": "VietinBank"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 7,
      "username": "kol3@colormedia.vn",
      "role": "KOL_VIP"
    },
    "kolVip": {
      "id": 1,
      "user_id": 7,
      "affiliate_id": "KOL003",
      "full_name": "Lê Quang I",
      "email": "kol3@colormedia.vn",
      "phone": "0927890123",
      "level": "LEVEL_1",
      "current_base_salary": 5000000,
      "join_date": "2024-04-20T00:00:00Z",
      "bank_account": "1234567890",
      "bank_name": "VietinBank"
    }
  }
}
```

### 2.3 Cập nhật cấp độ KOL/VIP
**Endpoint**: `POST /api/admin/kol/:kolId/update-level`

**Mô tả**: Thay đổi cấp độ của KOL/VIP.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Params**:
- `kolId`: ID của KOL/VIP

**Request Body**:
```json
{
  "level": "LEVEL_2",
  "note": "Nâng cấp lên LEVEL_2 do đạt KPI 2 tháng liên tiếp"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": "KOL101",
    "full_name": "Trần Văn D",
    "previous_level": "LEVEL_1",
    "new_level": "LEVEL_2",
    "update_date": "2024-04-20T00:00:00Z",
    "note": "Nâng cấp lên LEVEL_2 do đạt KPI 2 tháng liên tiếp"
  }
}
```

---

# Thông tin bổ sung

## Vai trò người dùng

Hệ thống có ba vai trò người dùng chính:
1. **ADMIN**: Quản trị viên, có quyền truy cập tất cả các API.
2. **AFFILIATE**: Affiliate thường, quản lý khách hàng giới thiệu và nhận hoa hồng 3% giá trị hợp đồng.
3. **KOL_VIP**: KOL/VIP Affiliate, có lương cơ bản theo 3 cấp độ và hoa hồng 3% giá trị hợp đồng.

## Cấp độ KOL/VIP

KOL/VIP được phân chia thành 3 cấp độ:
- **LEVEL_1 (Fresher)**: Lương cơ bản 5 triệu VND/tháng, KPI: 10 liên hệ, 5 liên hệ tiềm năng
- **LEVEL_2 (Advanced)**: Lương cơ bản 10 triệu VND/tháng, KPI: 20 liên hệ, 10 liên hệ tiềm năng, 1 hợp đồng
- **LEVEL_3 (Elite)**: Lương cơ bản 15 triệu VND/tháng, KPI: 30 liên hệ, 15 liên hệ tiềm năng, 2 hợp đồng

## Trạng thái khách hàng/liên hệ

### Affiliate thường:
- "Contact received"
- "Presenting idea"
- "Awaiting response"
- "Contract signed"
- "Not potential"

### KOL/VIP:
- "Mới nhập"
- "Đang tư vấn"
- "Chờ phản hồi"
- "Đã chốt hợp đồng"
- "Không tiềm năng"

## Trạng thái rút tiền

- "Pending": Đang chờ xử lý
- "Processing": Đang xử lý
- "Completed": Đã hoàn thành
- "Rejected": Bị từ chối
- "Cancelled": Đã hủy

## Tài khoản kiểm thử

```
Admin:
- Username: admin@colormedia.vn
- Password: admin@123
- Admin token: 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60

Affiliate 1:
- Username: affiliate1@colormedia.vn
- Password: affiliate1@123
- Affiliate ID: AFF101

Affiliate 2:
- Username: affiliate2@colormedia.vn
- Password: affiliate2@123
- Affiliate ID: AFF102

KOL/VIP 1:
- Username: kol1@colormedia.vn
- Password: kol1@123
- ID: KOL101
- Level: LEVEL_1

KOL/VIP 2:
- Username: kol2@colormedia.vn
- Password: kol2@123
- ID: KOL102
- Level: LEVEL_2
```

## Lưu ý quan trọng

1. Hệ thống áp dụng thuế thu nhập cá nhân 10% cho các khoản rút tiền vượt quá 2 triệu VND (cho cả Affiliate thường và KOL/VIP).
2. OTP có thời hạn 5 phút và mỗi người dùng chỉ được nhập sai tối đa 5 lần trước khi bị khóa.
3. Giới hạn rút tiền trong ngày là 20 triệu VND và reset vào 9:00 sáng mỗi ngày (áp dụng cho cả hai module).
4. Tính năng quét card visit (OCR) chỉ có sẵn trong module KOL/VIP.
5. API quản lý videos và sales kits được chia sẻ giữa cả hai module, cho phép cả Affiliate thường và KOL/VIP truy cập.