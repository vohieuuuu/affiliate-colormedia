# Thông tin quan trọng về cơ sở dữ liệu

## Cấu trúc cơ sở dữ liệu

Hệ thống ColorMedia Affiliate sử dụng PostgreSQL làm cơ sở dữ liệu chính với Drizzle ORM để tương tác với database.

### Các bảng chính trong hệ thống:

1. **users** - Lưu thông tin tài khoản người dùng (admin, affiliate, KOL)
2. **affiliates** - Lưu thông tin chi tiết về affiliate
3. **kol_vip_affiliates** - Lưu thông tin chi tiết về KOL/VIP
4. **customers** - Khách hàng được giới thiệu bởi affiliate
5. **contracts** - Hợp đồng từ khách hàng
6. **withdrawal_requests** - Yêu cầu rút tiền
7. **kol_contacts** - Liên hệ/khách hàng tiềm năng của KOL
8. **monthly_kpis** - Mục tiêu KPI hàng tháng của KOL
9. **videos** - Video tài liệu và hướng dẫn
10. **sales_materials** - Tài liệu bán hàng

### Các mối quan hệ quan trọng:

- Mỗi `user` có thể có một `affiliate` hoặc một `kol_vip_affiliate`
- Mỗi `affiliate` có thể có nhiều `customer`
- Mỗi `kol_vip_affiliate` có thể có nhiều `kol_contact`
- Mỗi `affiliate` và `kol_vip_affiliate` có thể có nhiều `withdrawal_request`

## Lược đồ cơ sở dữ liệu (Database Schema)

Lược đồ cơ sở dữ liệu được định nghĩa trong tập tin `shared/schema.ts` sử dụng Drizzle ORM và được đồng bộ với database thông qua lệnh `npm run db:push`.

## Backup và khôi phục

### Tạo backup:

```bash
pg_dump -U username -h localhost -d colormedia-affiliate > backup_$(date +%Y%m%d%H%M%S).sql
```

### Khôi phục từ backup:

```bash
psql -U username -h localhost -d colormedia-affiliate < backup_file.sql
```

## Cập nhật cơ sở dữ liệu

Khi cần thay đổi cấu trúc cơ sở dữ liệu:

1. Cập nhật các định nghĩa model trong `shared/schema.ts`
2. Chạy lệnh `npm run db:push` để áp dụng thay đổi vào cơ sở dữ liệu

**Lưu ý quan trọng**: Luôn tạo backup trước khi thực hiện các thay đổi cấu trúc cơ sở dữ liệu.

## Xử lý lỗi cơ sở dữ liệu phổ biến

1. **Lỗi kết nối**:
   - Kiểm tra DATABASE_URL trong file .env
   - Đảm bảo PostgreSQL đang chạy
   - Kiểm tra quyền truy cập của người dùng

2. **Lỗi migration**:
   - Nếu gặp lỗi khi chạy `db:push`, có thể cần thay đổi từng bước
   - Trong một số trường hợp, có thể cần tạo lại bảng nếu thay đổi quá lớn

3. **Hiệu năng chậm**:
   - Kiểm tra và tối ưu các câu truy vấn SQL phức tạp
   - Thêm index cho các cột thường xuyên được tìm kiếm
   - Xem xét việc caching nếu có nhiều truy vấn lặp lại

## Bảo mật cơ sở dữ liệu

1. Sử dụng mật khẩu mạnh cho người dùng database
2. Giới hạn quyền truy cập đến mức tối thiểu cần thiết
3. Đặt PostgreSQL để chỉ lắng nghe trên localhost nếu không cần truy cập từ xa
4. Đảm bảo sao lưu đều đặn và lưu trữ ở nơi an toàn
5. Mã hóa dữ liệu nhạy cảm trước khi lưu vào cơ sở dữ liệu

## Cấu trúc dữ liệu quan trọng

### Trạng thái khách hàng (Customer Status):
- "Mới nhập"
- "Đang tư vấn"
- "Chờ phản hồi"
- "Đã chốt hợp đồng"
- "Không tiềm năng"

### Mức KOL/VIP:
- LEVEL_1: 5 triệu VND/tháng
- LEVEL_2: 10 triệu VND/tháng
- LEVEL_3: 15 triệu VND/tháng

### Cấu trúc thời gian hệ thống:
- Giới hạn rút tiền reset vào 9:00 AM mỗi ngày
- OTP hết hạn sau 5 phút