# Hướng dẫn triển khai ColorMedia Affiliate System lên VPS

## Yêu cầu hệ thống

- Node.js phiên bản 18 trở lên
- PostgreSQL 15+ (đã có database)
- PM2 để quản lý quy trình Node.js (cài đặt: `npm install -g pm2`)
- Nginx hoặc Apache để làm proxy (khuyến nghị: Nginx)

## Bước 1: Chuẩn bị môi trường VPS

Đảm bảo VPS đã được cài đặt các thành phần sau:

```bash
# Cài đặt Node.js LTS (nếu chưa có)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Cài đặt PM2
npm install -g pm2

# Cài đặt Nginx
sudo apt install -y nginx

# Cài đặt PostgreSQL (nếu chưa có)
sudo apt install -y postgresql postgresql-contrib
```

## Bước 2: Clone mã nguồn và cài đặt dependencies

```bash
# Clone mã nguồn từ repository
git clone [URL-REPOSITORY] colormedia-affiliate
cd colormedia-affiliate

# Cài đặt dependencies
npm install
```

## Bước 3: Cấu hình môi trường

Tạo file `.env` trong thư mục gốc của dự án:

```
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/colormedia-affiliate

# Các thiết lập bảo mật
SESSION_SECRET=secret-key-for-session
JWT_SECRET=secret-key-for-jwt

# Cấu hình email (nếu sử dụng)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# Cấu hình YesScale API (nếu sử dụng)
YESCALE_API_KEY=your-api-key
```

Thay thế các giá trị trên bằng thông tin thực của bạn.

## Bước 4: Cài đặt và cấu hình cơ sở dữ liệu

```bash
# Tạo database (nếu chưa có)
sudo -u postgres psql -c "CREATE DATABASE \"colormedia-affiliate\";"
sudo -u postgres psql -c "CREATE USER your_username WITH ENCRYPTED PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"colormedia-affiliate\" TO your_username;"

# Áp dụng schema cho database
# Lưu ý: Đảm bảo DATABASE_URL đã được thiết lập trong file .env
npm run db:push
```

## Bước 5: Biên dịch và xây dựng ứng dụng

```bash
# Build frontend và backend
npm run build
```

## Bước 6: Chạy ứng dụng với PM2

```bash
# Tạo file ecosystem.config.js cho PM2
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: "colormedia-affiliate",
    script: "dist/index.js",
    env: {
      NODE_ENV: "production",
      PORT: 5000
    },
    instances: "max",
    exec_mode: "cluster"
  }]
}
EOL

# Khởi động ứng dụng với PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Bước 7: Cấu hình Nginx làm proxy

Tạo file cấu hình Nginx:

```bash
sudo nano /etc/nginx/sites-available/colormedia-affiliate
```

Thêm nội dung sau:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Kích hoạt cấu hình và khởi động lại Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/colormedia-affiliate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Bước 8: Cấu hình SSL với Certbot (tùy chọn nhưng khuyến nghị)

```bash
# Cài đặt Certbot
sudo apt install -y certbot python3-certbot-nginx

# Lấy chứng chỉ SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Bước 9: Kiểm tra và hoàn thiện

- Kiểm tra ứng dụng đã hoạt động bằng cách truy cập vào domain
- Đăng nhập với tài khoản quản trị (admin) để kiểm tra chức năng
- Kiểm tra tất cả chức năng quan trọng (đăng nhập, đăng ký, quản lý affiliate, rút tiền, v.v.)

## Xử lý sự cố

- **Kiểm tra logs**: `pm2 logs colormedia-affiliate`
- **Khởi động lại dịch vụ**: `pm2 restart colormedia-affiliate`
- **Kiểm tra trạng thái**: `pm2 status`
- **Kiểm tra logs Nginx**: `sudo tail -f /var/log/nginx/error.log`

## Cập nhật ứng dụng

Khi có bản cập nhật mới, thực hiện các bước sau:

```bash
# Di chuyển đến thư mục dự án
cd colormedia-affiliate

# Pull mã nguồn mới
git pull

# Cài đặt dependencies
npm install

# Rebuild ứng dụng
npm run build

# Khởi động lại ứng dụng
pm2 restart colormedia-affiliate
```

## Tài khoản mặc định

- Admin: admin / admin123
- KOL Test: kol_test@colormedia.vn / color1234@
- Affiliate Test: test_affiliate@example.com / test123