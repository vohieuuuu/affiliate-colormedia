# Tài liệu API - Hệ thống ColorMedia Affiliate (Module KOL/VIP)

## Giới thiệu
Tài liệu này mô tả chi tiết API của hệ thống ColorMedia Affiliate module KOL/VIP, cho phép quản lý thông tin KOL/VIP, theo dõi KPI và liên hệ, cũng như quản lý các hợp đồng đã ký.

## Định dạng phản hồi
Tất cả API trả về phản hồi ở định dạng JSON với header `Content-Type: application/json`. Các phản hồi tuân theo định dạng chuẩn:

- **Thành công**: `{ "status": "success", "data": {...} }`
- **Lỗi**: `{ "status": "error", "error": { "code": "ERROR_CODE", "message": "Thông báo lỗi" } }`

## Xác thực
Xác thực người dùng sử dụng token Bearer JWT. Trừ các endpoint dành riêng cho việc đăng nhập và đăng ký, tất cả các API khác đều yêu cầu xác thực.

### Đăng nhập lần đầu
Khi đăng nhập lần đầu, người dùng sẽ được yêu cầu đổi mật khẩu mặc định `color1234@`. API sẽ trả về mã lỗi `CHANGE_PASSWORD_REQUIRED` nếu người dùng cần đổi mật khẩu.

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
    "id": 5,
    "username": "kol1@colormedia.vn",
    "role": "KOL_VIP",
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
    "user_id": 5
  }
}
```

### Đổi mật khẩu
**Endpoint**: `POST /api/auth/change-password`

**Mô tả**: Đổi mật khẩu người dùng.

**Request Body**:
```json
{
  "user_id": 5,
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
    "id": 5,
    "username": "kol1@colormedia.vn",
    "role": "KOL_VIP"
  }
}
```

## API KOL/VIP

### Lấy thông tin KOL/VIP hiện tại
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

### Lấy danh sách liên hệ của KOL/VIP
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

### Thêm liên hệ mới
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

### Cập nhật trạng thái liên hệ
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

### Thêm hợp đồng cho liên hệ
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
  "contractValue": 75000000,
  "note": "Hợp đồng kéo dài 6 tháng, dịch vụ toàn diện"
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
    "status": "Đã chốt hợp đồng",
    "updated_at": "2024-04-25T00:00:00Z",
    "contract_value": 75000000,
    "commission": 2250000,
    "note": "Hợp đồng kéo dài 6 tháng, dịch vụ toàn diện"
  }
}
```

### Lấy thống kê KPI
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

### Quét card visit với AI
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

## API Admin cho KOL/VIP

### Lấy danh sách tất cả KOL/VIP
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

### Tạo KOL/VIP mới
**Endpoint**: `POST /api/admin/kol/create`

**Mô tả**: Tạo một KOL/VIP mới và tài khoản người dùng liên kết.

**Headers**:
```
Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60
```

**Request Body**:
```json
{
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
    "id": "KOL103",
    "user_id": 7,
    "full_name": "Lê Quang I",
    "email": "kol3@colormedia.vn",
    "phone": "0927890123",
    "level": "LEVEL_1",
    "join_date": "2024-04-20T00:00:00Z",
    "bank_account": "1234567890",
    "bank_name": "VietinBank",
    "message": "KOL/VIP mới đã được tạo thành công. Email kích hoạt đã được gửi."
  }
}
```

### Cập nhật cấp độ KOL/VIP
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

## Tài khoản kiểm thử

```
Admin:
- Username: admin@colormedia.vn
- Password: admin@123
- Admin token: 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60

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

1. Module KOL/VIP hoạt động độc lập và không ảnh hưởng đến module Affiliate thông thường.
2. Chỉ người dùng với quyền "KOL_VIP" mới có thể truy cập các API của KOL/VIP.
3. Chỉ người dùng với quyền "admin" (sử dụng token Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60) mới có thể quản lý và tạo tài khoản KOL/VIP.
4. KOL/VIP được phân chia thành 3 cấp độ:
   - LEVEL_1 (Fresher): Lương cơ bản 5 triệu VND/tháng, KPI: 10 liên hệ, 5 liên hệ tiềm năng
   - LEVEL_2 (Advanced): Lương cơ bản 10 triệu VND/tháng, KPI: 20 liên hệ, 10 liên hệ tiềm năng, 1 hợp đồng
   - LEVEL_3 (Elite): Lương cơ bản 15 triệu VND/tháng, KPI: 30 liên hệ, 15 liên hệ tiềm năng, 2 hợp đồng
5. Tất cả KOL/VIP đều được hưởng hoa hồng 3% trên giá trị hợp đồng.
6. Trạng thái liên hệ bao gồm: "Mới nhập", "Đang tư vấn", "Chờ phản hồi", "Đã chốt hợp đồng", "Không tiềm năng".
7. Tính năng quét card visit yêu cầu OPENAI_API_KEY được cấu hình trong hệ thống.