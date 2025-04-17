# Tài liệu API - ColorMedia Affiliate System (Đã cập nhật)

## Thông tin chung

- Base URL: `http://localhost:5000/api`
- Test URL: `https://{your-replit-domain}.replit.app/api`

Lưu ý: Các API được bảo vệ bằng token `Bearer` yêu cầu xác thực. Chỉ có một số API công khai không yêu cầu token.

## Tóm tắt các API trong hệ thống

### Authentication APIs
- `POST /api/auth/login` - Đăng nhập hệ thống và lấy token
- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/change-password` - Đổi mật khẩu
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Lấy thông tin người dùng hiện tại

### Affiliate APIs
- `GET /api/affiliate` - Lấy thông tin affiliate hiện tại
- `GET /api/affiliates/top` - Lấy danh sách top affiliates
- `GET /api/affiliate/customer-statistics` - Lấy thống kê khách hàng theo thời gian
- `GET /api/affiliate/time-series` - Lấy dữ liệu thống kê theo chuỗi thời gian

### Customer APIs
- `GET /api/customers` - Lấy danh sách khách hàng giới thiệu

### Withdrawal APIs
- `POST /api/withdrawal-request/send-otp` - Gửi OTP xác thực yêu cầu rút tiền
- `POST /api/withdrawal-request/verify` - Xác thực OTP để hoàn tất yêu cầu rút tiền
- `POST /api/withdrawal-request/resend-otp` - Gửi lại OTP

### Admin APIs
- `GET /api/admin/affiliates` - Lấy danh sách tất cả affiliate (Admin)
- `POST /api/admin/affiliates` - Tạo affiliate mới (Admin)
- `POST /api/admin/customers` - Thêm khách hàng giới thiệu mới (Admin)
- `PUT /api/admin/customers/:id/status` - Cập nhật trạng thái khách hàng (Admin)
- `PUT /api/admin/customers/:id/contract` - Cập nhật giá trị hợp đồng (Admin)
- `POST /api/admin/seed-data` - Seed dữ liệu mẫu (Admin)

### System APIs
- `GET /api/db-status` - Kiểm tra trạng thái database
- `POST /api/reset-data` - Reset dữ liệu và tạo tài khoản test
- `POST /api/db-setup` - Thiết lập database (chỉ dùng khi cần)
- `POST /api/seed-more-data` - Thêm dữ liệu mẫu bổ sung

## Chi tiết API

### Authentication

#### Đăng nhập

```
POST /api/auth/login
```

**Chức năng:** Xác thực người dùng và cấp token truy cập hệ thống

**Request Body:**
```json
{
  "username": "admin@colormedia.vn",
  "password": "admin@123"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "username": "admin@colormedia.vn",
      "role": "ADMIN",
      "is_first_login": false
    },
    "token": "bc707b479a5ed207bea19f0eae5b107144deb0e6748ef3aef0e2566776877104",
    "requires_password_change": false
  }
}
```

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@colormedia.vn", "password": "admin@123"}'
```

#### Đăng ký

```
POST /api/auth/register
```

**Chức năng:** Đăng ký tài khoản mới trong hệ thống

**Request Body:**
```json
{
  "username": "newaffiliate@example.com",
  "password": "color1234@",
  "role": "AFFILIATE"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 4,
      "username": "newaffiliate@example.com",
      "role": "AFFILIATE"
    },
    "token": "a711e7de0f086a83cdcf1f0f1d19175de78465516ffb85e9162c842bcb8de5c5",
    "development_mode": true
  }
}
```

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username": "newaffiliate@example.com", "password": "color1234@", "role": "AFFILIATE"}'
```

#### Đổi mật khẩu

```
POST /api/auth/change-password
```

**Chức năng:** Thay đổi mật khẩu người dùng, đặc biệt quan trọng cho lần đăng nhập đầu tiên

**Request Body:**
```json
{
  "old_password": "color1234@",
  "new_password": "newpassword456@"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Đổi mật khẩu thành công",
    "token": "newTokenValue",
    "development_mode": true
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/auth/change-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your-token}" \
  -d '{"old_password": "color1234@", "new_password": "newpassword456@"}'
```

#### Đăng xuất

```
POST /api/auth/logout
```

**Chức năng:** Đăng xuất và hủy token hiện tại

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Đăng xuất thành công",
    "development_mode": true
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/auth/logout" \
  -H "Authorization: Bearer {your-token}"
```

#### Lấy thông tin người dùng hiện tại

```
GET /api/auth/me
```

**Chức năng:** Lấy thông tin người dùng đã đăng nhập dựa trên token

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "username": "admin@colormedia.vn",
      "role": "ADMIN",
      "is_first_login": false
    },
    "development_mode": true
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/auth/me" \
  -H "Authorization: Bearer {your-token}"
```

### Affiliate Management

#### Lấy thông tin Affiliate hiện tại

```
GET /api/affiliate
```

**Chức năng:** Lấy thông tin chi tiết của affiliate liên kết với tài khoản hiện tại

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "user_id": 2,
    "affiliate_id": "AFF101",
    "full_name": "Nguyen Van A",
    "email": "affiliate1@colormedia.vn",
    "phone": "0987654321",
    "bank_account": "0123456789",
    "bank_name": "TPBank",
    "total_contacts": 36,
    "total_contracts": 12,
    "contract_value": 240000000,
    "received_balance": 48000000,
    "paid_balance": 24000000,
    "remaining_balance": 24000000
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/affiliate" \
  -H "Authorization: Bearer {your-token}"
```

#### Lấy danh sách tất cả Affiliate (Admin)

```
GET /api/admin/affiliates
```

**Chức năng:** Lấy danh sách tất cả affiliate trong hệ thống (chỉ dành cho Admin)

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 2,
      "user_id": 2,
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
      "remaining_balance": 80000000,
      "referred_customers": [...],
      "withdrawal_history": [...]
    },
    {
      "id": 3,
      "user_id": 3,
      "affiliate_id": "AFF102",
      "full_name": "Trần Thị B",
      "email": "affiliate2@colormedia.vn",
      "phone": "0909876543",
      "bank_account": "9876543210",
      "bank_name": "Vietcombank",
      "total_contacts": 18,
      "total_contracts": 6,
      "contract_value": 150000000,
      "received_balance": 30000000,
      "paid_balance": 15000000,
      "remaining_balance": 75000000,
      "referred_customers": [...],
      "withdrawal_history": [...]
    }
  ]
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}` (Token với quyền Admin)

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/admin/affiliates" \
  -H "Authorization: Bearer {admin-token}"
```

#### Lấy danh sách Top Affiliates

```
GET /api/affiliates/top
```

**Chức năng:** Lấy danh sách top affiliate sắp xếp theo giá trị hợp đồng

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 2,
      "full_name": "Jane Cooper",
      "contract_value": 320000000,
      "total_contracts": 15
    },
    {
      "id": 1,
      "full_name": "Nguyen Van A",
      "contract_value": 240000000,
      "total_contracts": 12
    },
    {
      "id": 3,
      "full_name": "Tran Van B",
      "contract_value": 210000000,
      "total_contracts": 11
    }
  ]
}
```

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/affiliates/top" \
  -H "Authorization: Bearer {your-token}"
```

#### Lấy thống kê khách hàng theo thời gian

```
GET /api/affiliate/customer-statistics?period=month
```

**Chức năng:** Lấy thống kê khách hàng và hợp đồng theo khoảng thời gian

**Query Parameters:**
- `period` - Khoảng thời gian: day, week, month, year, all (mặc định: all)
- `status` - (Tùy chọn) Lọc theo trạng thái khách hàng

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalCustomers": 5,
    "totalContracts": 2,
    "totalContractValue": 150000000,
    "totalCommission": 4500000,
    "periodType": "month",
    "periodStart": "2025-04-01T00:00:00.000Z",
    "periodEnd": "2025-04-30T23:59:59.999Z",
    "customers": [
      {
        "id": 0,
        "customer_name": "ABC Company",
        "status": "Contract signed",
        "contract_value": 50000000,
        "commission": 1500000,
        "created_at": "2025-04-10T00:00:00.000Z"
      }
    ]
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/affiliate/customer-statistics?period=month" \
  -H "Authorization: Bearer {your-token}"
```

#### Lấy dữ liệu thống kê theo chuỗi thời gian

```
GET /api/affiliate/time-series?period=month
```

**Chức năng:** Lấy dữ liệu dạng time-series để hiển thị biểu đồ theo thời gian

**Query Parameters:**
- `period` - Khoảng thời gian: day, week, month, year (mặc định: month)

**Response:**
```json
{
  "status": "success",
  "data": {
    "periodType": "month",
    "data": [
      {
        "period": "2025-03-19",
        "contractValue": 0,
        "commission": 0,
        "contractCount": 0
      },
      {
        "period": "2025-03-20",
        "contractValue": 0,
        "commission": 0,
        "contractCount": 0
      },
      // ... more days
      {
        "period": "2025-04-17",
        "contractValue": 50000000,
        "commission": 1500000,
        "contractCount": 1
      }
    ]
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/affiliate/time-series?period=month" \
  -H "Authorization: Bearer {your-token}"
```

### Referred Customers

#### Lấy danh sách khách hàng giới thiệu

```
GET /api/customers
```

**Chức năng:** Lấy danh sách khách hàng đã được affiliate giới thiệu

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 0,
      "customer_name": "ABC Company",
      "status": "Contract signed",
      "created_at": "2023-12-10T00:00:00Z",
      "updated_at": "2023-12-15T00:00:00Z",
      "contract_value": 50000000,
      "commission": 1500000,
      "contract_date": "2023-12-15T00:00:00Z",
      "note": "Customer agreed to a 12-month contract worth 50,000,000 VND."
    },
    {
      "id": 1,
      "customer_name": "XYZ Corporation",
      "status": "Presenting idea",
      "created_at": "2024-03-25T00:00:00Z",
      "updated_at": "2024-03-28T00:00:00Z",
      "note": "Khách hàng đang xem xét đề xuất"
    }
  ]
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/customers" \
  -H "Authorization: Bearer {your-token}"
```

### Withdrawal Management

#### Gửi OTP xác thực yêu cầu rút tiền

```
POST /api/withdrawal-request/send-otp
```

**Chức năng:** Tạo và gửi OTP xác thực trước khi thực hiện yêu cầu rút tiền

**Request Body:**
```json
{
  "amount": 5000000,
  "note": "Rút tiền hoa hồng tháng 4"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "OTP đã được gửi đến email của bạn",
    "expiry": 300,
    "request_id": "1234567890"
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/withdrawal-request/send-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your-token}" \
  -d '{"amount": 5000000, "note": "Rút tiền hoa hồng tháng 4"}'
```

#### Xác thực OTP để hoàn tất yêu cầu rút tiền

```
POST /api/withdrawal-request/verify
```

**Chức năng:** Xác thực OTP để hoàn tất quá trình tạo yêu cầu rút tiền

**Request Body:**
```json
{
  "request_id": "1234567890",
  "otp_code": "123456",
  "amount": 5000000,
  "note": "Rút tiền hoa hồng tháng 4"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "request_date": "2025-04-17T05:10:00.000Z",
    "amount": 5000000,
    "note": "Rút tiền hoa hồng tháng 4",
    "status": "Pending",
    "affiliate_id": "AFF101",
    "remaining_balance": 19000000
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/withdrawal-request/verify" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your-token}" \
  -d '{"request_id": "1234567890", "otp_code": "123456", "amount": 5000000, "note": "Rút tiền hoa hồng tháng 4"}'
```

#### Gửi lại OTP

```
POST /api/withdrawal-request/resend-otp
```

**Chức năng:** Gửi lại mã OTP khi mã trước đó đã hết hạn hoặc thất lạc

**Request Body:**
```json
{
  "request_id": "1234567890"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "OTP mới đã được gửi đến email của bạn",
    "expiry": 300
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/withdrawal-request/resend-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your-token}" \
  -d '{"request_id": "1234567890"}'
```

### Admin Functions

#### Tạo Affiliate mới (Admin)

```
POST /api/admin/affiliates
```

**Chức năng:** Tạo hồ sơ affiliate mới trong hệ thống (chỉ dành cho Admin)

**Request Body:**
```json
{
  "affiliate_id": "AFF104",
  "full_name": "Le Van C",
  "email": "c.le@example.com",
  "phone": "0987123456",
  "bank_account": "9876123456",
  "bank_name": "VPBank",
  "user_id": 3
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 3,
    "affiliate_id": "AFF104",
    "full_name": "Le Van C",
    "email": "c.le@example.com",
    "phone": "0987123456",
    "bank_account": "9876123456",
    "bank_name": "VPBank",
    "user_id": 3,
    "total_contacts": 0,
    "total_contracts": 0,
    "contract_value": 0,
    "received_balance": 0,
    "paid_balance": 0,
    "remaining_balance": 0
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}` (Token với quyền Admin)

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/admin/affiliates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin-token}" \
  -d '{
    "affiliate_id": "AFF104",
    "full_name": "Le Van C",
    "email": "c.le@example.com",
    "phone": "0987123456",
    "bank_account": "9876123456",
    "bank_name": "VPBank",
    "user_id": 3
  }'
```

#### Thêm khách hàng giới thiệu mới (Admin)

```
POST /api/admin/customers
```

**Chức năng:** Thêm khách hàng mới vào danh sách khách hàng được giới thiệu (chỉ dành cho Admin)

**Request Body:**
```json
{
  "affiliate_id": "AFF101",
  "customer_name": "New Company Ltd",
  "status": "Contact received",
  "note": "Initial contact made through email",
  "phone": "0912345678",
  "email": "contact@newcompany.com"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 5,
    "customer_name": "New Company Ltd",
    "status": "Contact received",
    "created_at": "2025-04-17T05:15:00.000Z",
    "updated_at": "2025-04-17T05:15:00.000Z",
    "note": "Initial contact made through email",
    "phone": "0912345678",
    "email": "contact@newcompany.com"
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}` (Token với quyền Admin)

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/admin/customers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin-token}" \
  -d '{
    "affiliate_id": "AFF101",
    "customer_name": "New Company Ltd",
    "status": "Contact received",
    "note": "Initial contact made through email",
    "phone": "0912345678",
    "email": "contact@newcompany.com"
  }'
```

#### Cập nhật trạng thái khách hàng (Admin)

```
PUT /api/admin/customers/:id/status
```

**Chức năng:** Cập nhật trạng thái của khách hàng trong quá trình giới thiệu (chỉ dành cho Admin)

**URL Parameters:**
- `:id` - ID của khách hàng (ví dụ: 0, 1, 2...)

**Request Body:**
```json
{
  "status": "Presenting idea",
  "description": "Đã trình bày ý tưởng, khách hàng đang xem xét"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "customer_id": 0,
    "customer_name": "New Company Ltd",
    "status": "Presenting idea",
    "updated_at": "2025-04-17T05:20:00.000Z",
    "description": "Đã trình bày ý tưởng, khách hàng đang xem xét"
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}` (Token với quyền Admin)

**Curl Example:**
```bash
curl -X PUT "http://localhost:5000/api/admin/customers/0/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin-token}" \
  -d '{"status": "Presenting idea", "description": "Đã trình bày ý tưởng, khách hàng đang xem xét"}'
```

#### Cập nhật giá trị hợp đồng (Admin)

```
PUT /api/admin/customers/:id/contract
```

**Chức năng:** Cập nhật giá trị hợp đồng và thông tin khách hàng (chỉ dành cho Admin)

**URL Parameters:**
- `:id` - ID của khách hàng (ví dụ: 0, 1, 2...)

**Request Body:**
```json
{
  "contract_value": 150000000,
  "name": "New Company Ltd",
  "phone": "0912345678",
  "email": "contact@newcompany.com",
  "status": "Contract signed"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "customer_id": 0,
    "customer_name": "New Company Ltd",
    "status": "Contract signed",
    "contract_value": 150000000,
    "additional_contract_value": 150000000,
    "commission": 4500000,
    "additional_commission": 4500000,
    "updated_at": "2025-04-17T05:25:00.000Z",
    "affiliate_balance": {
      "total_contract_value": 150000000,
      "total_received_balance": 4500000,
      "paid_balance": 0,
      "remaining_balance": 4500000
    }
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}` (Token với quyền Admin)

**Curl Example:**
```bash
curl -X PUT "http://localhost:5000/api/admin/customers/0/contract" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin-token}" \
  -d '{
    "contract_value": 150000000,
    "name": "New Company Ltd",
    "phone": "0912345678",
    "email": "contact@newcompany.com",
    "status": "Contract signed"
  }'
```

#### Seed dữ liệu mẫu (Admin)

```
POST /api/admin/seed-data
```

**Chức năng:** Tạo dữ liệu mẫu cho hệ thống (chỉ dành cho Admin và môi trường phát triển)

**Request Body:**
```json
{
  "affiliates_count": 5,
  "customers_per_affiliate": 3,
  "withdrawals_per_affiliate": 2
}
```

**Response:**
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

**Yêu cầu Header:** `Authorization: Bearer {token}` (Token với quyền Admin)

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/admin/seed-data" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin-token}" \
  -d '{"affiliates_count": 5, "customers_per_affiliate": 3, "withdrawals_per_affiliate": 2}'
```

### System APIs

#### Kiểm tra trạng thái database

```
GET /api/db-status
```

**Chức năng:** Kiểm tra trạng thái kết nối và thông tin về cơ sở dữ liệu

**Response:**
```json
{
  "status": "success",
  "data": {
    "storage_type": "In-memory",
    "database_status": "Not connected",
    "environment": "development",
    "use_database": false,
    "database_tables": {}
  }
}
```

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/db-status"
```

#### Reset dữ liệu và tạo tài khoản test

```
POST /api/reset-data
```

**Chức năng:** Reset dữ liệu hệ thống và tạo tài khoản test mặc định

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Đã tạo mới dữ liệu thành công",
    "accounts": [
      {
        "role": "Admin",
        "username": "admin@colormedia.vn",
        "password": "admin@123"
      },
      {
        "role": "Affiliate 1",
        "username": "affiliate1@colormedia.vn",
        "password": "affiliate1@123",
        "affiliate_id": "AFF101"
      },
      {
        "role": "Affiliate 2",
        "username": "affiliate2@colormedia.vn",
        "password": "affiliate2@123",
        "affiliate_id": "AFF102"
      }
    ]
  }
}
```

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/reset-data"
```

## Thông tin bổ sung

### Lỗi 404 API Format

Tất cả các endpoint API không tồn tại sẽ trả về JSON với format:

```json
{
  "status": "error",
  "error": {
    "code": "NOT_FOUND",
    "message": "API endpoint not found: /api/non-existent-endpoint"
  }
}
```

### Authentication Errors

Khi token không hợp lệ hoặc hết hạn:

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token không hợp lệ hoặc đã hết hạn"
  }
}
```

### URL Test

Dưới đây là các URL có thể sử dụng để test API:

1. **URL test local:**
   - Địa chỉ: `http://localhost:5000/api/...`

2. **URL test trên Replit:**
   - Địa chỉ: `https://{your-replit-domain}.replit.app/api/...`

3. **Reset Data và lấy tài khoản test:**
   - `http://localhost:5000/api/reset-data` (POST)

4. **Đăng nhập (không yêu cầu token):**
   - `http://localhost:5000/api/auth/login` (POST)

5. **Truy cập trang admin:**
   - Đăng nhập với tài khoản admin@colormedia.vn / admin@123