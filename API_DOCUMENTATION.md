# ColorMedia Affiliate API Documentation

## Tổng quan

API của hệ thống Affiliate ColorMedia được thiết kế để hỗ trợ các chức năng chính của hệ thống affiliate marketing. API cho phép truy cập vào dữ liệu affiliate, bao gồm thông tin cá nhân, số liệu thống kê, khách hàng đã giới thiệu, và lịch sử rút tiền hoa hồng. Ngoài ra, API cũng cung cấp các endpoints cho việc quản lý và nhập dữ liệu vào hệ thống.

## Base URL

```
https://api.colormedia.vn/api
```

## Xác thực

Tất cả các yêu cầu API đều yêu cầu xác thực. API sử dụng JWT (JSON Web Token) để xác thực. Token phải được gửi trong header của mỗi yêu cầu:

```
Authorization: Bearer {your_jwt_token}
```

## Định dạng phản hồi

Tất cả các phản hồi API đều có định dạng JSON với cấu trúc chuẩn như sau:

Thành công:
```json
{
  "status": "success",
  "data": {
    // Dữ liệu phản hồi
  }
}
```

Lỗi:
```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi"
  }
}
```

## Endpoints

### Affiliate

#### Lấy thông tin affiliate hiện tại

```
GET /affiliate
```

Trả về thông tin chi tiết về affiliate hiện tại được xác thực.

**Phản hồi mẫu:**

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "affiliate_id": "AFF123",
    "full_name": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "phone": "0901234567",
    "bank_name": "Vietcombank",
    "bank_account": "1234567890",
    "total_contacts": 45,
    "total_contracts": 12,
    "contract_value": 120000000,
    "remaining_balance": 12000000,
    "received_balance": 8000000,
    "paid_balance": 5000000,
    "join_date": "2023-01-15T00:00:00.000Z"
  }
}
```

#### Lấy danh sách affiliate hàng đầu

```
GET /affiliates/top
```

Trả về danh sách affiliate hàng đầu dựa trên tổng giá trị hợp đồng.

**Tham số truy vấn:**

| Tham số | Mô tả | Mặc định |
|---------|-------|----------|
| limit | Số lượng affiliate trả về | 5 |

**Phản hồi mẫu:**

```json
{
  "status": "success",
  "data": [
    {
      "id": 2,
      "full_name": "Jane Cooper",
      "profile_image": "https://randomuser.me/api/portraits/women/12.jpg",
      "contract_value": 180000000,
      "total_contracts": 18
    },
    {
      "id": 1,
      "full_name": "Nguyễn Văn A",
      "profile_image": null,
      "contract_value": 120000000,
      "total_contracts": 12
    }
  ]
}
```

### Khách hàng được giới thiệu

#### Lấy danh sách khách hàng được giới thiệu

```
GET /customers/referred
```

Trả về danh sách khách hàng được giới thiệu bởi affiliate hiện tại.

**Tham số truy vấn:**

| Tham số | Mô tả | Mặc định |
|---------|-------|----------|
| page | Số trang | 1 |
| limit | Số lượng khách hàng trên mỗi trang | 10 |
| status | Lọc theo trạng thái (LEAD, CONTACTED, MEETING, CONTRACT, CANCELLED) | Tất cả |

**Phản hồi mẫu:**

```json
{
  "status": "success",
  "data": {
    "customers": [
      {
        "id": 1,
        "name": "Trần Văn B",
        "phone": "0912345678",
        "email": "tranvanb@example.com",
        "status": "CONTRACT",
        "created_at": "2024-03-01T09:30:00.000Z",
        "updated_at": "2024-03-10T14:20:00.000Z",
        "contract_value": 15000000,
        "events": [
          {
            "id": 1,
            "timestamp": "2024-03-01T09:30:00.000Z",
            "status": "LEAD",
            "description": "Khách hàng được giới thiệu"
          },
          {
            "id": 2,
            "timestamp": "2024-03-03T10:15:00.000Z",
            "status": "CONTACTED",
            "description": "Đã liên hệ khách hàng qua điện thoại"
          },
          {
            "id": 3,
            "timestamp": "2024-03-05T15:00:00.000Z",
            "status": "MEETING",
            "description": "Đã gặp trực tiếp và tư vấn dịch vụ"
          },
          {
            "id": 4,
            "timestamp": "2024-03-10T14:20:00.000Z",
            "status": "CONTRACT",
            "description": "Khách hàng đã ký hợp đồng"
          }
        ]
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 10,
      "total_pages": 5
    }
  }
}
```

### Rút tiền hoa hồng

#### Tạo yêu cầu rút tiền

```
POST /withdrawal/request
```

Tạo yêu cầu rút tiền hoa hồng mới.

**Body:**

```json
{
  "amount": 5000000,
  "note": "Rút tiền hoa hồng tháng 3/2024"
}
```

**Phản hồi mẫu:**

```json
{
  "status": "success",
  "data": {
    "id": 5,
    "affiliate_id": 1,
    "amount": 5000000,
    "status": "PENDING",
    "note": "Rút tiền hoa hồng tháng 3/2024",
    "created_at": "2024-04-15T08:45:00.000Z"
  }
}
```

#### Lấy lịch sử rút tiền

```
GET /withdrawal/history
```

Trả về lịch sử rút tiền của affiliate hiện tại.

**Tham số truy vấn:**

| Tham số | Mô tả | Mặc định |
|---------|-------|----------|
| page | Số trang | 1 |
| limit | Số lượng giao dịch trên mỗi trang | 10 |
| status | Lọc theo trạng thái (PENDING, APPROVED, COMPLETED, REJECTED) | Tất cả |

**Phản hồi mẫu:**

```json
{
  "status": "success",
  "data": {
    "withdrawals": [
      {
        "id": 5,
        "amount": 5000000,
        "status": "PENDING",
        "note": "Rút tiền hoa hồng tháng 3/2024",
        "created_at": "2024-04-15T08:45:00.000Z",
        "processed_at": null
      },
      {
        "id": 4,
        "amount": 3000000,
        "status": "COMPLETED",
        "note": "Rút tiền hoa hồng tháng 2/2024",
        "created_at": "2024-03-15T09:30:00.000Z",
        "processed_at": "2024-03-17T14:20:00.000Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "total_pages": 1
    }
  }
}
```

### Quản lý dữ liệu

#### Thêm Affiliate mới

```
POST /admin/affiliates
```

Thêm một affiliate mới vào hệ thống.

**Body:**

```json
{
  "affiliate_id": "AFF456",
  "full_name": "Lê Thị C",
  "email": "lethic@example.com",
  "phone": "0987654321",
  "bank_name": "BIDV",
  "bank_account": "9876543210"
}
```

**Phản hồi mẫu:**

```json
{
  "status": "success",
  "data": {
    "id": 3,
    "affiliate_id": "AFF456",
    "full_name": "Lê Thị C",
    "email": "lethic@example.com",
    "phone": "0987654321",
    "bank_name": "BIDV",
    "bank_account": "9876543210",
    "total_contacts": 0,
    "total_contracts": 0,
    "contract_value": 0,
    "remaining_balance": 0,
    "received_balance": 0,
    "paid_balance": 0,
    "join_date": "2024-04-16T00:00:00.000Z"
  }
}
```

#### Thêm khách hàng được giới thiệu

```
POST /admin/customers
```

Thêm một khách hàng mới được giới thiệu bởi affiliate.

**Body:**

```json
{
  "affiliate_id": 1,
  "name": "Phạm Văn D",
  "phone": "0923456789",
  "email": "phamvand@example.com",
  "status": "LEAD",
  "description": "Khách hàng quan tâm đến dịch vụ thiết kế website"
}
```

**Phản hồi mẫu:**

```json
{
  "status": "success",
  "data": {
    "id": 2,
    "name": "Phạm Văn D",
    "phone": "0923456789",
    "email": "phamvand@example.com",
    "status": "LEAD",
    "created_at": "2024-04-16T10:30:00.000Z",
    "updated_at": "2024-04-16T10:30:00.000Z",
    "contract_value": null,
    "events": [
      {
        "id": 5,
        "timestamp": "2024-04-16T10:30:00.000Z",
        "status": "LEAD",
        "description": "Khách hàng quan tâm đến dịch vụ thiết kế website"
      }
    ]
  }
}
```

#### Cập nhật trạng thái khách hàng

```
PUT /admin/customers/:id/status
```

Cập nhật trạng thái của khách hàng được giới thiệu.

**Body:**

```json
{
  "status": "CONTACTED",
  "description": "Đã liên hệ khách hàng qua điện thoại vào ngày 16/04/2024"
}
```

**Phản hồi mẫu:**

```json
{
  "status": "success",
  "data": {
    "id": 2,
    "name": "Phạm Văn D",
    "status": "CONTACTED",
    "updated_at": "2024-04-16T14:45:00.000Z",
    "events": [
      {
        "id": 5,
        "timestamp": "2024-04-16T10:30:00.000Z",
        "status": "LEAD",
        "description": "Khách hàng quan tâm đến dịch vụ thiết kế website"
      },
      {
        "id": 6,
        "timestamp": "2024-04-16T14:45:00.000Z",
        "status": "CONTACTED",
        "description": "Đã liên hệ khách hàng qua điện thoại vào ngày 16/04/2024"
      }
    ]
  }
}
```

#### Thêm dữ liệu mẫu

```
POST /admin/seed-data
```

Thêm dữ liệu mẫu vào hệ thống cho mục đích thử nghiệm.

**Body:**

```json
{
  "affiliates_count": 10,
  "customers_per_affiliate": 5,
  "withdrawals_per_affiliate": 3
}
```

**Phản hồi mẫu:**

```json
{
  "status": "success",
  "data": {
    "message": "Đã thêm dữ liệu mẫu thành công",
    "summary": {
      "affiliates_added": 10,
      "customers_added": 50,
      "withdrawals_added": 30
    }
  }
}
```

## Mã lỗi

| Mã lỗi | Mô tả |
|--------|-------|
| UNAUTHORIZED | Chưa xác thực hoặc token không hợp lệ |
| FORBIDDEN | Không có quyền truy cập tài nguyên |
| NOT_FOUND | Không tìm thấy tài nguyên |
| VALIDATION_ERROR | Lỗi xác thực dữ liệu đầu vào |
| INSUFFICIENT_BALANCE | Số dư không đủ để thực hiện giao dịch |
| INTERNAL_SERVER_ERROR | Lỗi máy chủ nội bộ |

## Giới hạn tốc độ

API có giới hạn tốc độ là 100 yêu cầu/phút cho mỗi tài khoản. Nếu vượt quá giới hạn, API sẽ trả về mã lỗi 429 (Too Many Requests).

## Hỗ trợ

Nếu bạn gặp bất kỳ vấn đề nào với API, vui lòng liên hệ:

- Email: api-support@colormedia.vn
- Điện thoại: +84 (0) 123 456 789