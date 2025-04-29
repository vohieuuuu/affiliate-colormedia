# Tài liệu API ColorMedia Affiliate System

## Tổng quan

API của hệ thống ColorMedia Affiliate được xây dựng trên RESTful API, sử dụng Express.js làm backend framework. Tất cả API đều yêu cầu xác thực thông qua token (lưu trong cookie hoặc gửi qua header Authorization), ngoại trừ API đăng nhập và đăng ký.

## Xác thực và bảo mật

### Đăng nhập

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "username": "your_username",
      "role": "ADMIN|AFFILIATE|KOL_VIP",
      "is_first_login": false,
      "full_name": "Your Name",
      "affiliate_id": "AF0001"
    }
  }
}
```

### Đăng xuất

```
POST /api/auth/logout
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Đăng xuất thành công"
  }
}
```

### Thông tin người dùng hiện tại

```
GET /api/auth/me
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "username": "your_username",
      "role": "ADMIN|AFFILIATE|KOL_VIP",
      "is_first_login": false,
      "full_name": "Your Name",
      "affiliate_id": "AF0001"
    }
  }
}
```

### Đổi mật khẩu

```
POST /api/auth/change-password
```

**Request Body:**
```json
{
  "currentPassword": "current_password",
  "newPassword": "new_password"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Đổi mật khẩu thành công"
  }
}
```

## API dành cho Affiliate thường

### Lấy thông tin chi tiết của affiliate

```
GET /api/affiliate
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "user_id": 2,
    "affiliate_id": "AF0001",
    "full_name": "Affiliate Name",
    "email": "affiliate@example.com",
    "phone": "0987654321",
    "bank_account": "0987654321",
    "bank_name": "Ngân hàng VPBank",
    "total_customers": 5,
    "total_contracts": 2,
    "contract_value": 150000000,
    "received_balance": 4500000,
    "paid_balance": 2500000,
    "remaining_balance": 2000000,
    "referred_customers": [],
    "withdrawal_history": []
  }
}
```

### Lấy danh sách khách hàng của affiliate

```
GET /api/affiliate/customers
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "affiliate_id": "AF0001",
      "customer_name": "Customer Name",
      "company": "Company Name",
      "phone": "0987654321",
      "email": "customer@example.com",
      "address": "Customer Address",
      "created_at": "2025-01-01T00:00:00.000Z",
      "contracts": []
    }
  ]
}
```

### Lấy danh sách top affiliate

```
GET /api/affiliates/top
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "affiliate_id": "AF0001",
      "full_name": "Affiliate Name",
      "contract_value": 150000000,
      "total_contracts": 2
    }
  ]
}
```

### Tạo yêu cầu rút tiền

```
POST /api/affiliate/withdrawals
```

**Request Body:**
```json
{
  "amount": 1000000,
  "note": "Rút tiền tháng 1/2025",
  "tax_id": "0123456789"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "affiliate_id": "AF0001",
    "request_date": "2025-01-15T10:00:00.000Z",
    "amount": 1000000,
    "tax_amount": 0,
    "amount_after_tax": 1000000,
    "has_tax": false,
    "tax_rate": 0.1,
    "note": "Rút tiền tháng 1/2025",
    "status": "Pending"
  }
}
```

## API dành cho KOL/VIP

### Lấy thông tin chi tiết KOL/VIP

```
GET /api/kol/me
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "user_id": 3,
    "affiliate_id": "KOL001",
    "full_name": "KOL Name",
    "email": "kol@example.com",
    "phone": "0987654321",
    "bank_account": "0987654321",
    "bank_name": "Ngân hàng VPBank",
    "level": "LEVEL_1",
    "current_base_salary": 5000000,
    "join_date": "2025-01-01T00:00:00.000Z",
    "total_contacts": 10,
    "potential_contacts": 5,
    "total_contracts": 1,
    "contract_value": 150000000,
    "received_balance": 4500000,
    "paid_balance": 2500000,
    "remaining_balance": 2000000,
    "monthly_contract_value": 0,
    "kpi_history": [],
    "referred_customers": [],
    "withdrawal_history": []
  }
}
```

### Lấy danh sách liên hệ của KOL/VIP

```
GET /api/kol/{affiliate_id}/contacts
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "kol_id": "KOL001",
      "contact_name": "Contact Name",
      "company": "Company Name",
      "position": "CEO",
      "phone": "0987654321",
      "email": "contact@example.com",
      "status": "Đang tư vấn",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-15T00:00:00.000Z",
      "source": "Referral",
      "image_url": null
    }
  ]
}
```

### Thêm liên hệ mới cho KOL/VIP

```
POST /api/kol/{affiliate_id}/contacts
```

**Request Body:**
```json
{
  "contact_name": "New Contact",
  "company": "ABC Corp",
  "position": "Marketing Director",
  "phone": "0987654321",
  "email": "contact@example.com",
  "status": "Mới nhập",
  "source": "Referral",
  "image_url": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 2,
    "kol_id": "KOL001",
    "contact_name": "New Contact",
    "company": "ABC Corp",
    "position": "Marketing Director",
    "phone": "0987654321",
    "email": "contact@example.com",
    "status": "Mới nhập",
    "created_at": "2025-01-20T10:00:00.000Z",
    "updated_at": "2025-01-20T10:00:00.000Z",
    "source": "Referral",
    "image_url": "..."
  }
}
```

### Cập nhật trạng thái liên hệ

```
PATCH /api/kol/{affiliate_id}/contacts/{contact_id}
```

**Request Body:**
```json
{
  "status": "Đã chốt hợp đồng",
  "description": "Hợp đồng trị giá 100 triệu"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 2,
    "kol_id": "KOL001",
    "contact_name": "New Contact",
    "company": "ABC Corp",
    "position": "Marketing Director",
    "phone": "0987654321",
    "email": "contact@example.com",
    "status": "Đã chốt hợp đồng",
    "created_at": "2025-01-20T10:00:00.000Z",
    "updated_at": "2025-01-25T10:00:00.000Z",
    "source": "Referral",
    "image_url": "...",
    "description": "Hợp đồng trị giá 100 triệu"
  }
}
```

### Lấy các video hướng dẫn

```
GET /api/videos
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "title": "Hướng dẫn sử dụng hệ thống",
      "description": "Video hướng dẫn chi tiết cách sử dụng hệ thống affiliate",
      "url": "https://www.youtube.com/embed/...",
      "thumbnail": "https://example.com/thumbnail.jpg",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

## API dành cho Admin

### Lấy danh sách tất cả affiliate

```
GET /api/admin/affiliates
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "user_id": 2,
      "affiliate_id": "AF0001",
      "full_name": "Affiliate Name",
      "email": "affiliate@example.com",
      "phone": "0987654321",
      "total_customers": 5,
      "total_contracts": 2,
      "contract_value": 150000000
    }
  ]
}
```

### Lấy danh sách tất cả KOL/VIP

```
GET /api/admin/kols
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "user_id": 3,
      "affiliate_id": "KOL001",
      "full_name": "KOL Name",
      "email": "kol@example.com",
      "phone": "0987654321",
      "level": "LEVEL_1",
      "total_contacts": 10,
      "potential_contacts": 5,
      "total_contracts": 1,
      "contract_value": 150000000
    }
  ]
}
```

### Lấy danh sách yêu cầu rút tiền

```
GET /api/admin/withdrawals
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "affiliate_id": "AF0001",
      "affiliate_type": "AFFILIATE",
      "full_name": "Affiliate Name",
      "request_date": "2025-01-15T10:00:00.000Z",
      "amount": 1000000,
      "tax_amount": 0,
      "amount_after_tax": 1000000,
      "has_tax": false,
      "tax_rate": 0.1,
      "note": "Rút tiền tháng 1/2025",
      "status": "Pending"
    }
  ]
}
```

### Cập nhật trạng thái yêu cầu rút tiền

```
PATCH /api/admin/withdrawals/{withdrawal_id}
```

**Request Body:**
```json
{
  "status": "Completed"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "affiliate_id": "AF0001",
    "affiliate_type": "AFFILIATE",
    "request_date": "2025-01-15T10:00:00.000Z",
    "amount": 1000000,
    "tax_amount": 0,
    "amount_after_tax": 1000000,
    "has_tax": false,
    "tax_rate": 0.1,
    "note": "Rút tiền tháng 1/2025",
    "status": "Completed"
  }
}
```

## Mã trạng thái API

- 200: Thành công
- 201: Tạo mới thành công
- 400: Lỗi dữ liệu đầu vào
- 401: Chưa xác thực hoặc xác thực thất bại
- 403: Không có quyền truy cập
- 404: Không tìm thấy tài nguyên
- 500: Lỗi hệ thống

## Xử lý lỗi

Tất cả các API đều trả về định dạng lỗi thống nhất:

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi chi tiết"
  }
}
```

## Giới hạn API

- API rút tiền: Tối đa 20 triệu VND mỗi ngày
- API xác thực OTP: Tối đa 5 lần thử lại
- OTP hết hạn sau 5 phút
- Giới hạn tốc độ: 100 request/phút/IP