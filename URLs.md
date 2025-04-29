# Cấu hình URL cho ColorMedia Affiliate System

Tài liệu này mô tả các URL và endpoint được sử dụng trong hệ thống ColorMedia Affiliate, cùng với cách cấu hình chúng cho các môi trường khác nhau.

## Các URL chính

| URL | Mô tả | Cấu hình |
|-----|-------|----------|
| **Frontend URL** | URL chính của ứng dụng web | `VITE_APP_URL` |
| **API URL** | URL của API backend | `API_URL` (server), `VITE_API_URL` (client) |
| **Webhook URL** | URL webhook nhận dữ liệu KOL | `WEBHOOK_URL` |

## Cấu hình theo môi trường

### Development (localhost)

```
Frontend URL: http://localhost:5000
API URL: http://localhost:5000 (hoặc http://localhost:3000 nếu tách biệt)
Webhook URL: https://aicolormedia.app.n8n.cloud/webhook-test/2d2c9a88-ebaf-4f2c-bf03-8f4c4a398e86
```

### Staging

```
Frontend URL: https://staging.colormedia.vn
API URL: https://api-staging.colormedia.vn
Webhook URL: https://aicolormedia.app.n8n.cloud/webhook-test/2d2c9a88-ebaf-4f2c-bf03-8f4c4a398e86
```

### Production (Replit)

```
Frontend URL: https://affclm.replit.app
API URL: https://affclm-api.replit.app (hoặc URL tương đối cho cùng một origin)
Webhook URL: https://aicolormedia.app.n8n.cloud/webhook-test/2d2c9a88-ebaf-4f2c-bf03-8f4c4a398e86
```

### Production (VPS)

```
Frontend URL: https://affiliate.colormedia.vn
API URL: https://api.affiliate.colormedia.vn (hoặc URL tương đối cho cùng một origin)
Webhook URL: https://aicolormedia.app.n8n.cloud/webhook-test/2d2c9a88-ebaf-4f2c-bf03-8f4c4a398e86
```

## API Endpoints

Dưới đây là danh sách các API endpoints chính được sử dụng trong hệ thống:

### API xác thực

- **POST /api/auth/login**: Đăng nhập
- **POST /api/auth/register**: Đăng ký
- **POST /api/auth/logout**: Đăng xuất
- **GET /api/auth/me**: Lấy thông tin người dùng hiện tại
- **POST /api/auth/change-password**: Thay đổi mật khẩu

### API quản lý Affiliate

- **GET /api/affiliate**: Lấy thông tin Affiliate hiện tại
- **GET /api/customers**: Lấy danh sách khách hàng của Affiliate
- **POST /api/customers**: Thêm khách hàng mới
- **GET /api/affiliate/statistics**: Thống kê của Affiliate
- **GET /api/affiliate/time-series**: Dữ liệu biểu đồ theo thời gian

### API quản lý KOL/VIP

- **GET /api/kol/me**: Lấy thông tin KOL/VIP hiện tại
- **GET /api/kol/:kolId/contacts**: Lấy danh sách liên hệ của KOL
- **POST /api/kol/:kolId/contacts**: Thêm liên hệ mới
- **GET /api/kol/:kolId/kpi-stats**: Lấy thống kê KPI của KOL

### API quản lý rút tiền

- **GET /api/withdrawals**: Lấy danh sách lệnh rút tiền
- **POST /api/withdrawals**: Tạo lệnh rút tiền mới
- **POST /api/withdrawals/verify-otp**: Xác minh OTP để rút tiền
- **GET /api/withdrawals/stats**: Thống kê rút tiền

### API quản trị

- **GET /api/admin/affiliates**: Lấy danh sách tất cả Affiliate
- **GET /api/admin/statistics**: Lấy thống kê tổng hợp
- **GET /api/admin/withdrawals**: Lấy danh sách tất cả lệnh rút tiền
- **PUT /api/admin/withdrawals/:id**: Cập nhật trạng thái lệnh rút tiền

### API kiểm tra cấu hình

- **GET /api/check**: Kiểm tra cấu hình hệ thống

## Webhook Endpoints

- **POST /api/webhook/kol-contacts**: Nhận dữ liệu liên hệ KOL từ các dịch vụ bên ngoài

## Cập nhật URL động theo môi trường

System sử dụng 2 cơ chế để tự động cập nhật URL:

1. **Frontend**: Sử dụng biến môi trường Vite (`VITE_API_URL`, `VITE_APP_URL`) được nhúng vào mã nguồn khi build.
2. **Backend**: Sử dụng biến môi trường Node.js (`API_URL`, `APP_ENV`) được đọc khi khởi động.

### Ví dụ cách sử dụng trong mã nguồn:

**Frontend (TypeScript)**:
```typescript
import { API_URL, CONFIG } from "@/lib/config";

// Gọi API với đường dẫn tự động
const response = await fetch(`${API_URL}/api/auth/me`);

// Kiểm tra môi trường
if (CONFIG.isProduction) {
  // Xử lý cho môi trường sản xuất
}
```

**Backend (Node.js)**:
```javascript
// Đọc cấu hình từ biến môi trường
const appEnv = process.env.APP_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development');

// Cấu hình theo môi trường
const apiEndpoints = {
  production: process.env.API_URL || 'https://affclm-api.replit.app',
  staging: process.env.STAGING_API_URL || 'https://api-staging.colormedia.vn',
  development: process.env.DEV_API_URL || 'http://localhost:3000',
};

// Chọn cấu hình phù hợp
const backendUrl = apiEndpoints[appEnv] || apiEndpoints.production;
```

## Kiểm tra cấu hình URL

Để kiểm tra cấu hình URL hiện tại, chạy script:

```bash
node api-check.js
```

Sau đó truy cập: http://localhost:3001/api/check