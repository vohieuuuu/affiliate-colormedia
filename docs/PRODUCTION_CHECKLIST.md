# Danh sách kiểm tra triển khai sản phẩm ColorMedia Affiliate System

## 1. Chuẩn bị triển khai

- [ ] Đã build dự án thành công (`npm run build`)
- [ ] Đã tạo file `.env` với các biến môi trường cần thiết
- [ ] Đã kiểm tra DB schema là mới nhất (`npm run db:push`)
- [ ] Đã đảm bảo tất cả các tập tin tĩnh (logo, hình ảnh) đều nằm trong thư mục `public`

## 2. Cấu hình hệ thống cơ sở dữ liệu

- [ ] Đã tạo database PostgreSQL
- [ ] Đã cấp quyền cho người dùng truy cập vào database
- [ ] Đã thiết lập xác thực database an toàn
- [ ] Đã kiểm tra kết nối đến database từ VPS

## 3. Bảo mật

- [ ] Đã thay đổi tất cả mật khẩu mặc định
- [ ] Đã thiết lập SESSION_SECRET và JWT_SECRET duy nhất
- [ ] Đã cấu hình HTTPS/SSL cho domain
- [ ] Đã kiểm tra không để lộ thông tin nhạy cảm trong logs
- [ ] Đã kiểm tra rate limiting API để tránh tấn công brute force

## 4. Chức năng quan trọng cần kiểm tra

### Chức năng xác thực
- [ ] Đăng nhập tài khoản admin
- [ ] Đăng nhập tài khoản affiliate thường
- [ ] Đăng nhập tài khoản KOL/VIP
- [ ] Đổi mật khẩu hoạt động đúng
- [ ] Đăng xuất hoạt động đúng

### Chức năng Affiliate thường
- [ ] Xem thông tin affiliate
- [ ] Xem danh sách khách hàng giới thiệu
- [ ] Tạo yêu cầu rút tiền
- [ ] Xem thống kê hoa hồng
- [ ] Xem bảng xếp hạng top affiliate

### Chức năng KOL/VIP
- [ ] Xem thông tin KOL
- [ ] Thêm liên hệ mới
- [ ] Quản lý danh sách liên hệ
- [ ] Cập nhật trạng thái liên hệ
- [ ] Xem KPI và mục tiêu
- [ ] Truy cập tài liệu bán hàng
- [ ] Truy cập video hướng dẫn

### Chức năng Admin
- [ ] Quản lý tài khoản affiliate
- [ ] Quản lý tài khoản KOL/VIP
- [ ] Quản lý yêu cầu rút tiền
- [ ] Cập nhật trạng thái hợp đồng
- [ ] Quản lý thống kê và báo cáo

## 5. Kiểm tra giao diện

- [ ] Kiểm tra giao diện trên các trình duyệt (Chrome, Firefox, Safari)
- [ ] Kiểm tra giao diện trên thiết bị di động (responsive)
- [ ] Kiểm tra thông báo lỗi hiển thị đúng và rõ ràng
- [ ] Kiểm tra tất cả thông báo (toast) hoạt động đúng

## 6. Tối ưu hóa

- [ ] Đã kiểm tra kích thước bundle để tối ưu tải trang
- [ ] Đã mã hóa (minify) các tập tin JS/CSS
- [ ] Đã tối ưu tải hình ảnh
- [ ] Đã thiết lập caching phù hợp (HTTP cache, database query cache)
- [ ] Đã thiết lập nén (gzip/brotli) trên máy chủ web

## 7. Giám sát và Bảo trì

- [ ] Đã thiết lập ghi nhật ký (logging) cho cả frontend và backend
- [ ] Đã thiết lập cảnh báo khi xảy ra lỗi
- [ ] Đã thiết lập sao lưu tự động cơ sở dữ liệu
- [ ] Đã có kế hoạch khôi phục sau sự cố

## 8. Tài khoản kiểm thử

- [ ] Admin: admin / admin123
- [ ] KOL: kol_test@colormedia.vn / color1234@
- [ ] Affiliate: test_affiliate@example.com / test123

## Ghi chú

- Website đang dùng webhook n8n cho tính năng tạo liên hệ KOL: https://aicolormedia.app.n8n.cloud/webhook-test/2d2c9a88-ebaf-4f2c-bf03-8f4c4a398e86
- Tài liệu chính sách Affiliate: https://colormedia.sg.larksuite.com/docx/OCzqdz5xUogQLkxCofolRNbCgcd
- Hướng dẫn đăng ký: https://colormedia.sg.larksuite.com/wiki/LQxvwbgBjixFpfkGeUolFnMjgnb