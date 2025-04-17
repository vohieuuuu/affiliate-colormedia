# API Documentation - ColorMedia Affiliate System

## Thông tin chung

- Base URL: `http://localhost:5000/api`
- Test URL: `https://{your-replit-domain}.replit.app/api`

Lưu ý: Các API được bảo vệ bằng token `Bearer` yêu cầu xác thực. Chỉ có một số API công khai không yêu cầu token.

## Authentication

### Đăng nhập

```
POST /api/auth/login
```

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
    "id": 1,
    "username": "admin@colormedia.vn",
    "role": "ADMIN",
    "token": "jwt-token-here",
    "is_first_login": 0
  }
}
```

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin@colormedia.vn", "password": "admin@123"}'
```

### Đăng ký

```
POST /api/auth/register
```

**Request Body:**
```json
{
  "username": "newaffiliate@example.com",
  "password": "password123",
  "role": "AFFILIATE"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 3,
    "username": "newaffiliate@example.com",
    "role": "AFFILIATE",
    "token": "jwt-token-here",
    "is_first_login": 1
  }
}
```

### Đổi mật khẩu (Cho lần đăng nhập đầu tiên)

```
POST /api/auth/change-password
```

**Request Body:**
```json
{
  "old_password": "password123",
  "new_password": "newpassword456"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Password changed successfully"
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

### Đăng xuất

```
POST /api/auth/logout
```

**Response:**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

### Lấy thông tin người dùng hiện tại

```
GET /api/auth/me
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "username": "admin@colormedia.vn",
    "role": "ADMIN",
    "is_first_login": 0
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/auth/me" \
  -H "Authorization: Bearer {your-token}"
```

## Affiliate Management

### Lấy thông tin Affiliate hiện tại

```
GET /api/affiliates/me
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "affiliate_id": "AFF123",
    "full_name": "Nguyen Van A",
    "email": "a.nguyen@example.com",
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
curl -X GET "http://localhost:5000/api/affiliates/me" \
  -H "Authorization: Bearer {your-token}"
```

### Lấy danh sách Top Affiliates

```
GET /api/affiliates/top
```

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
    // ... more affiliates
  ]
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

### Tạo Affiliate mới

```
POST /api/affiliates
```

**Request Body:**
```json
{
  "affiliate_id": "AFF104",
  "full_name": "Le Van C",
  "email": "c.le@example.com",
  "phone": "0987123456",
  "bank_account": "9876123456",
  "bank_name": "VPBank"
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
    "remaining_balance": 0,
    "referred_customers": [],
    "withdrawal_history": []
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

## Referred Customers

### Lấy danh sách khách hàng giới thiệu

```
GET /api/customers
```

**Response:**
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
      "commission": 1500000,
      "contract_date": "2023-12-15T00:00:00Z",
      "note": "Customer agreed to a 12-month contract worth 50,000,000 VND."
    },
    // ... more customers
  ]
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/customers" \
  -H "Authorization: Bearer {your-token}"
```

### Thêm khách hàng giới thiệu mới

```
POST /api/customers
```

**Request Body:**
```json
{
  "customer_name": "New Company Ltd",
  "status": "Contact received",
  "note": "Initial contact made through email"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "customer_name": "New Company Ltd",
    "status": "Contact received",
    "created_at": "2024-04-17T03:45:00.000Z",
    "updated_at": "2024-04-17T03:45:00.000Z",
    "note": "Initial contact made through email"
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

### Cập nhật trạng thái khách hàng

```
PUT /api/admin/customers/:id/status
```

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
    "id": 0,
    "name": "New Company Ltd",
    "status": "Presenting idea",
    "updated_at": "2024-04-17T03:50:00.000Z",
    "events": [
      {
        "id": 0,
        "timestamp": "2024-04-17T03:50:00.000Z",
        "status": "Presenting idea",
        "description": "Đã trình bày ý tưởng, khách hàng đang xem xét"
      }
    ]
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X PUT "http://localhost:5000/api/admin/customers/0/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your-token}" \
  -d '{"status": "Presenting idea", "description": "Đã trình bày ý tưởng, khách hàng đang xem xét"}'
```

### Cập nhật giá trị hợp đồng

```
PUT /api/admin/customers/:id/contract
```

**Request Body:**
```json
{
  "contract_value": 500000000,
  "name": "Phạm Văn D",
  "phone": "0923456789",
  "email": "phamvand@example.com",
  "status": "khách hàng ký hợp đồng"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 0,
    "name": "Phạm Văn D",
    "status": "khách hàng ký hợp đồng",
    "contract_value": 500000000,
    "additional_contract_value": 500000000,
    "commission": 22000000,
    "additional_commission": 15000000,
    "updated_at": "2024-04-17T03:45:00.000Z",
    "affiliate_balance": {
      "total_contract_value": 740000000,
      "total_received_balance": 63000000,
      "paid_balance": 24000000,
      "remaining_balance": 39000000,
      "actual_balance": 39000000
    }
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X PUT "http://localhost:5000/api/admin/customers/0/contract" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your-token}" \
  -d '{
    "contract_value": 500000000,
    "name": "Phạm Văn D",
    "phone": "0923456789",
    "email": "phamvand@example.com",
    "status": "khách hàng ký hợp đồng"
  }'
```

## Withdrawal Management

### Lấy lịch sử rút tiền

```
GET /api/withdrawals
```

**Response:**
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
    // ... more withdrawal history
  ]
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/withdrawals" \
  -H "Authorization: Bearer {your-token}"
```

### Tạo yêu cầu rút tiền mới

```
POST /api/withdrawals
```

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
    "request_date": "2024-04-17T04:00:00.000Z",
    "amount": 5000000,
    "note": "Rút tiền hoa hồng tháng 4",
    "status": "Pending"
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X POST "http://localhost:5000/api/withdrawals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your-token}" \
  -d '{"amount": 5000000, "note": "Rút tiền hoa hồng tháng 4"}'
```

### Cập nhật trạng thái yêu cầu rút tiền (Admin)

```
PUT /api/admin/withdrawals/:affiliate_id/:request_time
```

**URL Parameters:**
- `:affiliate_id` - ID của affiliate (ví dụ: "AFF123")
- `:request_time` - Thời gian yêu cầu rút tiền (ISO format, URL encoded)

**Request Body:**
```json
{
  "status": "Completed",
  "transaction_id": "TXN-202404-001",
  "message": "Đã chuyển khoản thành công"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "affiliate_id": "AFF123",
    "request_date": "2024-04-17T04:00:00.000Z",
    "amount": 5000000,
    "note": "Rút tiền hoa hồng tháng 4",
    "status": "Completed",
    "transaction_id": "TXN-202404-001",
    "message": "Đã chuyển khoản thành công",
    "completed_date": "2024-04-17T04:10:00.000Z"
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

### Kiểm tra giới hạn rút tiền theo ngày

```
GET /api/withdrawals/daily-limit-check?amount=5000000
```

**Query Parameters:**
- `amount` - Số tiền muốn rút (VND)

**Response:**
```json
{
  "status": "success",
  "data": {
    "exceeds": false,
    "totalWithdrawn": 8000000,
    "remainingLimit": 12000000,
    "dailyLimit": 20000000
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/withdrawals/daily-limit-check?amount=5000000" \
  -H "Authorization: Bearer {your-token}"
```

## OTP Verification

### Gửi OTP cho yêu cầu rút tiền

```
POST /api/otp/send
```

**Request Body:**
```json
{
  "verification_type": "WITHDRAWAL",
  "related_id": 1
}
```

**Response:**
```json
{
  "status": "success",
  "message": "OTP đã được gửi đến email của bạn"
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

### Xác thực OTP

```
POST /api/otp/verify
```

**Request Body:**
```json
{
  "otp_code": "123456",
  "verification_type": "WITHDRAWAL"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "verified": true
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

## Stats and Metrics

### Lấy thống kê theo thời gian (Time Series)

```
GET /api/stats/time-series?period=MONTH
```

**Query Parameters:**
- `period` - Khoảng thời gian: DAY, WEEK, MONTH, YEAR

**Response:**
```json
{
  "status": "success",
  "data": {
    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    "contracts": [2, 3, 4, 2, 1, 3],
    "values": [45000000, 60000000, 80000000, 40000000, 20000000, 60000000]
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

### Lấy thống kê khách hàng

```
GET /api/stats/customers
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "total": 36,
    "by_status": {
      "Contact received": 10,
      "Presenting idea": 8,
      "Pending reconciliation": 6,
      "Contract signed": 12
    }
  }
}
```

**Yêu cầu Header:** `Authorization: Bearer {token}`

## Admin Functions

### Seed dữ liệu mẫu

```
POST /api/admin/seed-data
```

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

**Yêu cầu Header:** `Authorization: Bearer {token}`

### API reset dữ liệu và tạo tài khoản test

```
POST /api/reset-data
```

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

### Kiểm tra trạng thái cơ sở dữ liệu

```
GET /api/db-status
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "storage_type": "In-memory",
    "database_status": "Not connected",
    "environment": "development",
    "use_database": false
  }
}
```

**Curl Example:**
```bash
curl -X GET "http://localhost:5000/api/db-status"
```

## URL Test

Dưới đây là các URL có thể sử dụng để test API:

1. **URL test local:**
   - Địa chỉ: `http://localhost:5000/api/...`

2. **URL test trên Replit:**
   - Địa chỉ: `https://{your-replit-domain}.replit.app/api/...`

3. **Reset Data và lấy tài khoản test:**
   - `http://localhost:5000/api/reset-data` (POST)

4. **Đăng nhập (không yêu cầu token):**
   - `http://localhost:5000/api/auth/login` (POST)

5. **Cập nhật giá trị hợp đồng (yêu cầu token):**
   - `http://localhost:5000/api/admin/customers/0/contract` (PUT)