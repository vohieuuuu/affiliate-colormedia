# Tài liệu API - Hệ thống ColorMedia Affiliate (Module KOL/VIP)

## Giới thiệu
Tài liệu này mô tả chi tiết API của hệ thống ColorMedia Affiliate module KOL/VIP, cho phép quản lý thông tin KOL/VIP, theo dõi KPI và liên hệ, cũng như quản lý các hợp đồng đã ký.

## Định dạng phản hồi
Tất cả API trả về phản hồi ở định dạng JSON với header `Content-Type: application/json`. Các phản hồi tuân theo định dạng chuẩn:

- **Thành công**: `{ "status": "success", "data": {...} }`
- **Lỗi**: `{ "status": "error", "error": { "code": "ERROR_CODE", "message": "Thông báo lỗi" } }`

## Xác thực
Xác thực người dùng sử dụng token bảo mật trong cookie HTTP-only hoặc thông qua header Bearer Authorization.

### Cookie Authentication
Khi đăng nhập thành công, hệ thống sẽ thiết lập cookie có tên `auth_token`.

### Bearer Token Authentication
Cũng có thể xác thực với token trong header:
```
Authorization: Bearer <token>
```

### Đăng nhập lần đầu
Khi đăng nhập lần đầu, người dùng sẽ được yêu cầu đổi mật khẩu mặc định `color1234@`. API sẽ trả về thông tin `requires_password_change: true` nếu người dùng cần đổi mật khẩu.

## API Xác thực

### Đăng nhập
**Endpoint**: `POST /api/auth/login`

**Mô tả**: Xác thực người dùng và cung cấp token truy cập.

**Request Body**:
```json
{
  "username": "kol1@colormedia.vn",
  "password": "password123"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 5,
      "username": "kol1@colormedia.vn",
      "role": "KOL_VIP"
    },
    "requires_password_change": false
  }
}
```

**Phản hồi lỗi (cần đổi mật khẩu)**:
```json
{
  "status": "error",
  "error": {
    "code": "PASSWORD_CHANGE_REQUIRED",
    "message": "Bạn cần thay đổi mật khẩu mặc định."
  },
  "requires_password_change": true
}
```

### Đổi mật khẩu
**Endpoint**: `POST /api/auth/change-password`

**Mô tả**: Thay đổi mật khẩu của người dùng hiện tại.

**Request Body**:
```json
{
  "old_password": "color1234@",
  "new_password": "NewSecurePassword123!"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "message": "Mật khẩu đã được thay đổi thành công."
  }
}
```

### Đăng xuất
**Endpoint**: `POST /api/auth/logout`

**Mô tả**: Đăng xuất người dùng hiện tại, vô hiệu hóa token.

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "message": "Đăng xuất thành công."
  }
}
```

### Lấy thông tin người dùng hiện tại
**Endpoint**: `GET /api/auth/me`

**Mô tả**: Lấy thông tin người dùng đang đăng nhập.

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 5,
      "username": "kol1@colormedia.vn",
      "role": "KOL_VIP"
    },
    "kol_vip": {
      "id": 3,
      "user_id": 5,
      "full_name": "Nguyễn Văn A",
      "email": "kol1@colormedia.vn",
      "phone": "0912345678",
      "level": "LEVEL_1",
      "current_base_salary": 5000000,
      "remaining_balance": 2500000
    }
  }
}
```

## API KOL/VIP

### Lấy thông tin KOL/VIP
**Endpoint**: `GET /api/kol/me`

**Mô tả**: Lấy thông tin chi tiết của KOL/VIP hiện tại.

**Headers**:
```
Authorization: Bearer <token>
```
hoặc cookie `auth_token`

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "id": 3,
    "user_id": 8,
    "affiliate_id": "KOL8",
    "full_name": "Trần Văn B",
    "email": "kol345@colormedia.vn",
    "phone": "0987654321",
    "bank_account": "00112233445",
    "bank_name": "Vietcombank",
    "level": "LEVEL_1",
    "current_base_salary": 5000000,
    "remaining_balance": 1500000,
    "accumulated_commission": 2500000,
    "kpi_history": [
      {
        "year": 2025,
        "month": 3,
        "total_contacts": 12,
        "potential_contacts": 5,
        "signed_contracts": 1,
        "performance": "ACHIEVED"
      }
    ]
  }
}
```

### Lấy danh sách liên hệ
**Endpoint**: `GET /api/kol/:kolId/contacts`

**Mô tả**: Lấy danh sách tất cả liên hệ của KOL/VIP.

**Headers**:
```
Authorization: Bearer <token>
```
hoặc cookie `auth_token`

**Params**:
- `kolId`: ID của KOL/VIP (thường là ID do hệ thống tạo, ví dụ: "KOL8")

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 4,
      "kol_id": "KOL8",
      "contact_name": "Nguyễn Thị C",
      "company": "Công ty ABC",
      "position": "Giám đốc Marketing",
      "phone": "0912345678",
      "email": "nguyenc@abc.com",
      "status": "Đang tư vấn",
      "created_at": "2025-04-15T00:00:00Z",
      "updated_at": "2025-04-15T00:00:00Z",
      "note": "Đã gặp lần 1, hẹn gặp lại vào tuần sau"
    },
    {
      "id": 5,
      "kol_id": "KOL8",
      "contact_name": "Trần Văn D",
      "company": "Công ty XYZ",
      "position": "CEO",
      "phone": "0987654321",
      "email": "trand@xyz.com",
      "status": "Chờ phản hồi",
      "created_at": "2025-04-10T00:00:00Z",
      "updated_at": "2025-04-12T00:00:00Z",
      "note": "Đã gửi báo giá"
    }
  ]
}
```

### Thêm liên hệ mới
**Endpoint**: `POST /api/kol/:kolId/contacts`

**Mô tả**: Thêm liên hệ mới cho KOL/VIP.

**Headers**:
```
Authorization: Bearer <token>
```
hoặc cookie `auth_token`

**Params**:
- `kolId`: ID của KOL/VIP

**Request Body**:
```json
{
  "contact_name": "Phạm Văn E",
  "company": "Công ty DEF",
  "position": "Giám đốc Sản phẩm",
  "phone": "0912345678",
  "email": "phame@def.com",
  "status": "Mới nhập",
  "note": "Gặp tại sự kiện XYZ"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "contact": {
      "id": 6,
      "kol_id": "KOL8",
      "contact_name": "Phạm Văn E",
      "company": "Công ty DEF",
      "position": "Giám đốc Sản phẩm",
      "phone": "0912345678",
      "email": "phame@def.com",
      "status": "Mới nhập",
      "created_at": "2025-04-22T00:00:00Z",
      "updated_at": "2025-04-22T00:00:00Z",
      "note": "Gặp tại sự kiện XYZ"
    },
    "kol": {
      "id": 3,
      "affiliate_id": "KOL8",
      "full_name": "Trần Văn B",
      "level": "LEVEL_1"
    }
  }
}
```

### Cập nhật thông tin liên hệ
**Endpoint**: `PUT /api/kol/:kolId/contacts/:contactId`

**Mô tả**: Cập nhật thông tin của liên hệ. API này đã được đơn giản hóa để chỉ cần gửi các trường cần cập nhật.

**Headers**:
```
Authorization: Bearer <token>
```
hoặc cookie `auth_token`

**Params**:
- `kolId`: ID của KOL/VIP
- `contactId`: ID của liên hệ

**Request Body** (Cấu trúc đơn giản hóa):
```json
{
  "status": "Đang tư vấn",
  "note": "Đã gặp và tư vấn sơ bộ"
}
```

Chỉ cần gửi các trường cần cập nhật. Trong ví dụ trên, chỉ cập nhật trạng thái và ghi chú.

**Request Body** (Cấu trúc đầy đủ, tương thích ngược):
```json
{
  "contact_name": "Phạm Văn E",
  "company": "Công ty DEF",
  "position": "Giám đốc Sản phẩm",
  "phone": "0912345678",
  "email": "phame@def.com",
  "status": "Đang tư vấn",
  "note": "Đã gặp và tư vấn sơ bộ",
  "meeting_time": "2025-04-25T14:00:00Z"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "contact": {
      "id": 6,
      "kol_id": "KOL8",
      "contact_name": "Phạm Văn E",
      "company": "Công ty DEF",
      "position": "Giám đốc Sản phẩm",
      "phone": "0912345678",
      "email": "phame@def.com",
      "status": "Đang tư vấn",
      "created_at": "2025-04-22T00:00:00Z",
      "updated_at": "2025-04-22T01:30:00Z",
      "note": "Đã gặp và tư vấn sơ bộ",
      "meeting_time": "2025-04-25T14:00:00Z"
    },
    "kol": {
      "id": 3,
      "affiliate_id": "KOL8",
      "full_name": "Trần Văn B",
      "level": "LEVEL_1"
    }
  }
}
```

### Thêm thông tin hợp đồng cho liên hệ
**Endpoint**: `POST /api/kol/:kolId/contacts/:contactId/contract` hoặc `PUT /api/kol/:kolId/contacts/:contactId/contract`

**Mô tả**: Thêm thông tin hợp đồng cho liên hệ và cập nhật trạng thái thành "Đã chốt hợp đồng". API này hỗ trợ cả phương thức POST và PUT.

**Headers**:
```
Authorization: Bearer <token>
```
hoặc cookie `auth_token`

**Params**:
- `kolId`: ID của KOL/VIP
- `contactId`: ID của liên hệ

**Request Body**:
```json
{
  "contractValue": 75000000,
  "note": "Hợp đồng kéo dài 6 tháng, dịch vụ toàn diện"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "contact": {
      "id": 6,
      "contact_name": "Phạm Văn E",
      "company": "Công ty DEF",
      "status": "Đã chốt hợp đồng",
      "updated_at": "2025-04-25T00:00:00Z",
      "contract_value": 75000000,
      "commission": 2250000,
      "note": "Hợp đồng kéo dài 6 tháng, dịch vụ toàn diện"
    },
    "kol": {
      "id": 3,
      "affiliate_id": "KOL8",
      "full_name": "Trần Văn B",
      "level": "LEVEL_1",
      "current_base_salary": 5000000,
      "accumulated_commission": 4750000
    }
  }
}
```

### Lấy thống kê KPI
**Endpoint**: `GET /api/kol/:kolId/kpi-stats`

**Mô tả**: Lấy thống kê KPI của KOL/VIP cho tháng hiện tại.

**Headers**:
```
Authorization: Bearer <token>
```
hoặc cookie `auth_token`

**Params**:
- `kolId`: ID của KOL/VIP

**Query Parameters (tùy chọn)**:
- `month`: Tháng cần lấy thống kê (1-12)
- `year`: Năm cần lấy thống kê

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "kolVip": {
      "id": 3,
      "affiliate_id": "KOL8",
      "full_name": "Trần Văn B",
      "level": "LEVEL_1",
      "current_base_salary": 5000000
    },
    "period": {
      "year": 2025,
      "month": 4
    },
    "kpi": {
      "contacts": {
        "current": 2,
        "target": 10,
        "percentage": 20
      },
      "potentialContacts": {
        "current": 0,
        "target": 5,
        "percentage": 0
      },
      "contracts": {
        "current": 0,
        "target": 0,
        "percentage": 100
      },
      "overall": {
        "achieved": false,
        "performance": "PENDING"
      }
    },
    "stats": {
      "totalContacts": 2,
      "potentialContacts": 0,
      "contractsCount": 0,
      "contractValue": 0,
      "commission": 0,
      "baseSalary": 5000000,
      "totalIncome": 5000000
    },
    "contacts": [
      {
        "id": 4,
        "contact_name": "Nguyễn Thị C",
        "company": "Công ty ABC",
        "phone": "0912345678",
        "email": "nguyenc@abc.com",
        "status": "Mới nhập",
        "created_at": "2025-04-15T00:00:00Z"
      },
      {
        "id": 5,
        "contact_name": "Trần Văn D",
        "company": "Công ty XYZ",
        "phone": "0987654321",
        "email": "trand@xyz.com",
        "status": "Mới nhập",
        "created_at": "2025-04-10T00:00:00Z"
      }
    ]
  }
}
```

## API quét Card Visit 
**Endpoint**: `POST /api/kol/:kolId/scan-card`

**Mô tả**: Quét và xử lý card visit bằng OCR để trích xuất thông tin liên hệ.

**Headers**:
```
Authorization: Bearer <token>
```
hoặc cookie `auth_token`

**Params**:
- `kolId`: ID của KOL/VIP

**Request Body**:
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4..."
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "raw_text": "Nguyễn Văn A\nGiám đốc Marketing\nCông ty XYZ\nĐiện thoại: 0912345678\nEmail: nguyena@xyz.com",
    "contact_data": {
      "contact_name": "Nguyễn Văn A",
      "company": "Công ty XYZ",
      "position": "Giám đốc Marketing",
      "phone": "0912345678",
      "email": "nguyena@xyz.com"
    }
  }
}
```

## API admin KOL/VIP
### Tạo tài khoản KOL/VIP mới
**Endpoint**: `POST /api/admin/kol/create`

**Mô tả**: Tạo tài khoản KOL/VIP mới (chỉ dành cho admin).

**Headers**:
```
Authorization: Bearer <token>
```
hoặc cookie `auth_token`

**Request Body**:
```json
{
  "affiliate_id": "KOL003",
  "full_name": "Lê Quang I",
  "email": "kol3456@colormedia.vn",
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
    "kol": {
      "id": 3,
      "user_id": 12,
      "affiliate_id": "KOL003",
      "full_name": "Lê Quang I",
      "email": "kol3456@colormedia.vn",
      "level": "LEVEL_1",
      "current_base_salary": 5000000,
      "join_date": "2025-04-22T02:15:00Z"
    },
    "user": {
      "id": 12,
      "username": "kol3456@colormedia.vn",
      "role": "KOL_VIP",
      "is_first_login": 1
    },
    "default_password": "color1234@"
  }
}
```

### API lấy danh sách KOL/VIP
**Endpoint**: `GET /api/admin/kol`

**Mô tả**: Lấy danh sách tất cả KOL/VIP (chỉ dành cho admin).

**Headers**:
```
Authorization: Bearer <token>
```
hoặc cookie `auth_token`

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "kols": [
      {
        "id": 1,
        "affiliate_id": "KOL001",
        "full_name": "Nguyễn Văn A",
        "email": "kol1@colormedia.vn",
        "level": "LEVEL_2",
        "current_base_salary": 10000000,
        "total_contacts": 15,
        "total_contracts": 2
      },
      {
        "id": 2,
        "affiliate_id": "KOL002",
        "full_name": "Trần Thị B",
        "email": "kol2@colormedia.vn",
        "level": "LEVEL_1",
        "current_base_salary": 5000000,
        "total_contacts": 8,
        "total_contracts": 0
      }
    ]
  }
}
```

## API Tài chính KOL/VIP

### Lấy lịch sử giao dịch
**Endpoint**: `GET /api/kol/:kolId/transactions`

**Mô tả**: Lấy lịch sử giao dịch tài chính của KOL/VIP với khả năng lọc theo thời gian và loại giao dịch.

**Headers**:
```
Authorization: Bearer <token>
```
hoặc cookie `auth_token`

**Params**:
- `kolId`: ID của KOL/VIP

**Query Parameters (tùy chọn)**:
- `startDate`: Ngày bắt đầu khoảng thời gian (định dạng: YYYY-MM-DD)
- `endDate`: Ngày kết thúc khoảng thời gian (định dạng: YYYY-MM-DD)
- `type`: Loại giao dịch (SALARY, COMMISSION, WITHDRAWAL, BONUS, TAX, ADJUSTMENT)

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": [
    {
      "id": 15,
      "kol_id": "KOL8",
      "transaction_type": "SALARY",
      "description": "Lương cơ bản tháng 4/2025",
      "amount": 5000000,
      "created_at": "2025-04-01T00:00:00Z",
      "balance_after": 5000000,
      "reference_id": null
    },
    {
      "id": 16,
      "kol_id": "KOL8",
      "transaction_type": "COMMISSION",
      "description": "Hoa hồng từ hợp đồng Công ty ABC",
      "amount": 2250000,
      "created_at": "2025-04-15T14:30:00Z",
      "balance_after": 7250000,
      "reference_id": "C12345"
    },
    {
      "id": 17,
      "kol_id": "KOL8",
      "transaction_type": "WITHDRAWAL",
      "description": "Rút tiền về tài khoản Vietcombank",
      "amount": -5000000,
      "created_at": "2025-04-20T10:15:00Z",
      "balance_after": 2250000,
      "reference_id": "W67890"
    }
  ]
}
```

### Lấy tổng quan tài chính
**Endpoint**: `GET /api/kol/:kolId/financial-summary`

**Mô tả**: Lấy thông tin tổng quan tài chính của KOL/VIP với khả năng lọc theo khoảng thời gian.

**Headers**:
```
Authorization: Bearer <token>
```
hoặc cookie `auth_token`

**Params**:
- `kolId`: ID của KOL/VIP

**Query Parameters (tùy chọn)**:
- `period`: Khoảng thời gian (week, month, year, all), mặc định là month

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "currentBalance": 2250000,
    "totalIncome": 7250000,
    "totalExpense": 5000000,
    "netProfit": 2250000,
    "incomeSources": {
      "salary": 5000000,
      "commission": 2250000,
      "bonus": 0,
      "other": 0
    },
    "expenseSources": {
      "withdrawal": 5000000,
      "tax": 0,
      "other": 0
    },
    "timePeriod": {
      "startDate": "2025-04-01T00:00:00Z",
      "endDate": "2025-04-30T23:59:59Z",
      "label": "Tháng 4/2025"
    }
  }
}
```

### Thêm giao dịch mới (Admin)
**Endpoint**: `POST /api/kol/:kolId/transactions`

**Mô tả**: Thêm giao dịch mới cho KOL/VIP (chỉ dành cho admin).

**Headers**:
```
Authorization: Bearer <token>
```
hoặc cookie `auth_token`

**Params**:
- `kolId`: ID của KOL/VIP

**Request Body**:
```json
{
  "transaction_type": "BONUS",
  "description": "Thưởng hoàn thành KPI tháng 4/2025",
  "amount": 1000000,
  "reference_id": "B12345"
}
```

**Phản hồi thành công**:
```json
{
  "status": "success",
  "data": {
    "transaction": {
      "id": 18,
      "kol_id": "KOL8",
      "transaction_type": "BONUS",
      "description": "Thưởng hoàn thành KPI tháng 4/2025",
      "amount": 1000000,
      "created_at": "2025-04-22T08:45:00Z",
      "balance_after": 3250000,
      "reference_id": "B12345"
    },
    "kolVip": {
      "id": 3,
      "affiliate_id": "KOL8",
      "full_name": "Trần Văn B",
      "level": "LEVEL_1",
      "balance": 3250000
    }
  }
}
```

## Các endpoints có thể triển khai thêm
1. `PUT /api/admin/kol/:kolId` - API cập nhật thông tin KOL/VIP (dành cho admin)
2. `GET /api/admin/kol/:kolId/kpi` - API lấy lịch sử KPI của KOL/VIP (dành cho admin)

## Mã lỗi
- `UNAUTHORIZED` - Người dùng chưa xác thực
- `FORBIDDEN` - Không có quyền truy cập
- `NOT_FOUND` - Không tìm thấy tài nguyên
- `INVALID_DATA` - Dữ liệu không hợp lệ
- `INTERNAL_SERVER_ERROR` - Lỗi máy chủ nội bộ
- `KOL_NOT_FOUND` - Không tìm thấy thông tin KOL/VIP
- `CONTACT_NOT_FOUND` - Không tìm thấy thông tin liên hệ
- `INVALID_STATUS` - Trạng thái không hợp lệ
- `PASSWORD_CHANGE_REQUIRED` - Yêu cầu thay đổi mật khẩu