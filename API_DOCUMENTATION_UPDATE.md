# Tài liệu API hệ thống Affiliate ColorMedia - Cập nhật về triển khai

## Vấn đề với triển khai và hướng xử lý

Sau khi phân tích, chúng tôi xác định rằng ứng dụng bị lỗi 502 Bad Gateway khi triển khai trên Replit do một số vấn đề:

1. **Vấn đề với ESM và dynamic imports**: Replit gặp vấn đề khi xử lý các dynamic imports trong môi trường ESM. Điều này ảnh hưởng đến hoạt động của Drizzle ORM khi chạy trên production.

2. **Xung đột giữa backend và frontend**: Khi triển khai, cả frontend và backend được phục vụ từ cùng một server, gây ra vấn đề về router khớp.

### Giải pháp được đề xuất

#### Phương án 1: Tách API server thành repl riêng biệt
- Tạo một Replit mới chỉ chứa phần API (affclm-api)
- Frontend gọi đến API server này thông qua URL đầy đủ
- Cấu hình CORS đã được thêm vào để cho phép requests từ frontend

#### Phương án 2: Sử dụng server proxy đơn giản
- Đã tạo `simple-server.cjs` để phục vụ frontend và redirect API requests
- Sửa đổi `client/src/lib/queryClient.ts` để thêm xử lý URL đầy đủ trong production
- Sửa đổi `client/src/lib/config.ts` để quản lý API_URL trong các môi trường khác nhau

## Hướng dẫn triển khai

### Triển khai frontend và API proxy
1. Sửa đổi file package.json để dùng `simple-server.cjs` trong production:
   ```json
   "scripts": {
     "start": "NODE_ENV=production node simple-server.cjs"
   }
   ```

2. Build và triển khai ứng dụng:
   ```
   npm run build
   ```

3. Kiểm tra sau khi triển khai:
   ```
   curl https://affclm.replit.app/api/check
   ```

### Kiểm tra các API endpoints

Sử dụng script api-test.mjs để kiểm tra API:
```
node api-test.mjs
```

Nếu bạn gặp lỗi 502 Bad Gateway với endpoints `/api/admin/affiliates`, đó là do chưa triển khai API server hoặc cấu hình proxy không đúng. Thử các hành động sau:

1. Kiểm tra status server và logs
2. Sử dụng header "Authorization: Bearer {TOKEN}" trong tất cả API requests
3. Kiểm tra CORS nếu gặp lỗi khi gọi từ frontend

## Kết luận

Server hiện đang trả về lỗi JSON thay vì 502 Bad Gateway thuần túy, đó là một tiến bộ so với trước đây. Để khắc phục hoàn toàn, chúng tôi cần hoàn thiện việc tách frontend và backend, hoặc cấu hình proxy đúng cách.

Hiện tại đã tạo các files:
- simple-server.cjs: Server proxy đơn giản với mock data
- api-proxy.js: Phiên bản nâng cao hơn sẽ kết nối đến API thật
- api-test.mjs: Script kiểm tra các API endpoints