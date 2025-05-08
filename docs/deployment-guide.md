# Hướng dẫn triển khai ColorMedia Affiliate System

## Cách triển khai với Replit

### 1. Chỉnh sửa cấu hình Replit (Through UI)

Để triển khai thành công trên Replit, bạn cần thay đổi cấu hình chạy. Làm theo các bước sau:

1. Nhấp vào tab "Shell" để mở terminal
2. Chạy lệnh build để tạo bản build mới:
   ```
   npm run build
   ```
3. Sau khi build thành công, mở cài đặt của Replit (biểu tượng bánh răng ở thanh bên trái)
4. Tìm đến phần "Deployment"
5. Ở mục "Run command", thay đổi lệnh chạy thành:
   ```
   NODE_ENV=production node index.cjs
   ```
6. Bấm "Deploy" để triển khai

### 2. Kiểm tra triển khai

Sau khi triển khai, bạn có thể kiểm tra các API bằng các lệnh sau:

```bash
# Kiểm tra API health
curl https://affclm.replit.app/api/check

# Lấy danh sách top affiliates
curl https://affclm.replit.app/api/affiliates/top

# Lấy danh sách tất cả affiliates (cần token admin)
curl -H "Authorization: Bearer 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60" https://affclm.replit.app/api/admin/affiliates
```

## Giải thích tệp `index.cjs`

Tệp `index.cjs` là một server Express đơn giản được thiết kế đặc biệt cho môi trường production:

1. **Sử dụng CommonJS thay vì ESM**: Tránh vấn đề với dynamic imports trên Replit
2. **In-memory data**: Sử dụng dữ liệu mẫu trong bộ nhớ, không phụ thuộc vào database
3. **Auto-tạo thư mục dist/public**: Tự động tạo thư mục nếu chưa tồn tại
4. **API endpoints đơn giản**: Cung cấp các API cơ bản để kiểm tra và thử nghiệm
5. **Xác thực token**: Duy trì bảo mật với token admin

## Cấu trúc API

Server cung cấp các API endpoints sau:

1. **GET /api/check**: Kiểm tra trạng thái server
2. **GET /api/affiliates/top**: Danh sách top affiliates 
3. **GET /api/admin/affiliates**: Danh sách tất cả affiliates (yêu cầu token admin)
4. **POST /api/admin/affiliates**: Tạo affiliate mới (yêu cầu token admin)
5. **GET /api/videos**: Danh sách video
6. **GET /api/affiliates/:id**: Lấy thông tin chi tiết của một affiliate

## Đề xuất giải pháp lâu dài

Để có giải pháp bền vững hơn:

1. **Tách thành 2 repositories riêng biệt**:
   - Frontend (React): https://affclm.replit.app
   - Backend (API): https://affclm-api.replit.app

2. **Chạy cả hai với Node.js (không cần ESM)**:
   - Frontend: Vite build + Express serve static
   - Backend: Express API server

3. **Cấu hình CORS đúng cách** để 2 domain có thể giao tiếp với nhau