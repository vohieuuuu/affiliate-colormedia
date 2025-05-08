# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG COLORMEDIA AFFILIATE

Tài liệu này cung cấp hướng dẫn chi tiết để triển khai ColorMedia Affiliate System trên các môi trường khác nhau. Tài liệu được cập nhật ngày 29/04/2025.

## MỤC LỤC

1. [Triển khai trên Replit](#triển-khai-trên-replit)
2. [Triển khai trên VPS](#triển-khai-trên-vps)
3. [Cấu hình nhiều môi trường](#cấu-hình-nhiều-môi-trường)
4. [Bảo mật và SSL](#bảo-mật-và-ssl)
5. [Xử lý sự cố thường gặp](#xử-lý-sự-cố-thường-gặp)
6. [Tài khoản mặc định](#tài-khoản-mặc-định)

---

# TRIỂN KHAI TRÊN REPLIT

Replit là nền tảng đơn giản nhất để triển khai ứng dụng ColorMedia Affiliate.

## 1. Thiết lập môi trường Replit

1. Đăng nhập vào Replit và import GitHub repository của dự án
2. Chọn template "Node.js" cho dự án
3. Đảm bảo `.replit` đã được cấu hình đúng với lệnh chạy

## 2. Thiết lập biến môi trường (Secrets)

Thêm các biến môi trường sau trong phần Secrets:

```
NODE_ENV=production
APP_ENV=production
PORT=5000
VITE_ENVIRONMENT=production
API_URL=https://your-api-repl.replit.app  # URL API nếu tách riêng
ALLOWED_ORIGINS=https://your-frontend-repl.replit.app
COOKIE_SECRET=your-random-secret-key-at-least-32-chars
API_TOKEN=your-api-token-for-services
```

## 3. Thiết lập cơ sở dữ liệu

Replit đã cung cấp cơ sở dữ liệu PostgreSQL. Đảm bảo biến môi trường `DATABASE_URL` đã được thiết lập tự động.

## 4. Build và triển khai

1. Trong terminal Replit, chạy:

```bash
npm install
npm run build
```

2. Khởi động ứng dụng:

```bash
npm start
```

3. Replit sẽ tự động khởi động lại ứng dụng khi có thay đổi.

## 5. Thiết lập Replit Domain & Deployment

1. Nhấn vào tab "Deployment" trên Replit
2. Chọn cấu hình Deployment:
   - Domain: Chọn domain Replit hoặc thiết lập custom domain
   - Environment: Production
3. Nhấn "Deploy" để triển khai ứng dụng

## 6. Kiểm tra triển khai

1. Truy cập vào domain Replit đã cấu hình
2. Đăng nhập với tài khoản quản trị để kiểm tra chức năng
3. Kiểm tra các tính năng chính (đăng nhập, quản lý affiliate, v.v.)

---

# TRIỂN KHAI TRÊN VPS

## 1. Yêu cầu hệ thống

- Node.js phiên bản 18 trở lên
- PostgreSQL 15+ 
- PM2 để quản lý quy trình Node.js
- Nginx làm proxy

## 2. Chuẩn bị môi trường VPS

```bash
# Cài đặt Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Cài đặt PM2
npm install -g pm2

# Cài đặt Nginx
sudo apt install -y nginx

# Cài đặt PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

## 3. Clone mã nguồn và cài đặt dependencies

```bash
# Clone mã nguồn
git clone https://github.com/your-username/colormedia-affiliate.git
cd colormedia-affiliate

# Cài đặt dependencies
npm install
```

## 4. Cấu hình môi trường

Tạo file `.env` trong thư mục gốc dựa trên `.env.sample`:

```bash
# Tạo và chỉnh sửa file .env
cp .env.sample .env
nano .env
```

Cấu hình các biến môi trường chính:

```
NODE_ENV=production
APP_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/colormedia-affiliate

# Các URL
API_URL=https://api.yourdomain.com
VITE_API_URL=
VITE_APP_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com

# Bảo mật
COOKIE_SECRET=random-secret-key-at-least-32-chars
API_TOKEN=your-api-token-for-services

# Cấu hình email
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# YesScale API cho OCR
YESCALE_API_KEY=your-api-key
```

## 5. Cài đặt và cấu hình cơ sở dữ liệu

```bash
# Tạo database và user
sudo -u postgres psql -c "CREATE DATABASE \"colormedia-affiliate\";"
sudo -u postgres psql -c "CREATE USER your_username WITH ENCRYPTED PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"colormedia-affiliate\" TO your_username;"

# Áp dụng schema cho database
npm run db:push
```

## 6. Biên dịch và xây dựng ứng dụng

```bash
# Build frontend và backend
npm run build
```

## 7. Khởi động ứng dụng với PM2

Tạo file `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: "colormedia-affiliate",
    script: "dist/index.js",
    env: {
      NODE_ENV: "production",
      APP_ENV: "production",
      PORT: 5000
    },
    instances: "max",
    exec_mode: "cluster",
    max_memory_restart: "1G",
    log_date_format: "YYYY-MM-DD HH:mm Z",
    combine_logs: true
  }]
}
```

Khởi động với PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 8. Cấu hình Nginx làm proxy

Tạo file `/etc/nginx/sites-available/colormedia-affiliate`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Chuyển hướng HTTP sang HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    # Cấu hình SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    
    # Các header bảo mật
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # Proxy cho ứng dụng
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Kích hoạt cấu hình:

```bash
sudo ln -s /etc/nginx/sites-available/colormedia-affiliate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 9. Cấu hình SSL với Certbot

```bash
# Cài đặt Certbot
sudo apt install -y certbot python3-certbot-nginx

# Lấy chứng chỉ SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 10. Cài đặt tài khoản mặc định và seed data

```bash
# Tạo tài khoản quản trị mặc định
node scripts/create-default-admin.js
```

## 11. Kiểm tra triển khai

1. Truy cập website qua HTTPS: `https://yourdomain.com`
2. Đăng nhập với tài khoản quản trị để kiểm tra
3. Kiểm tra các tính năng và các mô-đun quan trọng

---

# CẤU HÌNH NHIỀU MÔI TRƯỜNG

Hệ thống hỗ trợ ba môi trường chính: development, staging và production.

## 1. Môi trường Development

Dùng cho phát triển và thử nghiệm trên máy local.

```
NODE_ENV=development
APP_ENV=development
VITE_ENVIRONMENT=development
API_URL=http://localhost:5000
VITE_API_URL=
VITE_APP_URL=http://localhost:5000
```

## 2. Môi trường Staging

Dùng cho kiểm thử trước khi đưa vào sản phẩm chính thức.

```
NODE_ENV=production
APP_ENV=staging
VITE_ENVIRONMENT=staging
API_URL=https://api-staging.yourdomain.com
VITE_API_URL=https://api-staging.yourdomain.com
VITE_APP_URL=https://staging.yourdomain.com
ALLOWED_ORIGINS=https://staging.yourdomain.com
```

## 3. Môi trường Production

Dùng cho phiên bản chính thức, sử dụng bởi người dùng cuối.

```
NODE_ENV=production
APP_ENV=production
VITE_ENVIRONMENT=production
API_URL=https://api.yourdomain.com
VITE_API_URL=
VITE_APP_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
```

## 4. Triển khai theo pipeline

Để thiết lập pipeline triển khai tự động, bạn có thể sử dụng:

- GitHub Actions
- GitLab CI/CD
- Jenkins

Ví dụ cấu hình GitHub Actions đơn giản:

```yaml
name: Deploy ColorMedia Affiliate

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /path/to/colormedia-affiliate
            git pull
            npm ci
            npm run build
            pm2 restart colormedia-affiliate
```

---

# BẢO MẬT VÀ SSL

## 1. Bảo mật Cookie

Hệ thống đã được cấu hình để sử dụng cookie bảo mật với các tính năng:

- `HttpOnly`: Ngăn chặn JavaScript truy cập cookie
- `Secure`: Chỉ gửi cookie qua HTTPS
- `SameSite=Strict`: Ngăn chặn CSRF
- `__Host-` prefix: Bảo vệ khỏi tấn công subdomain

## 2. Headers bảo mật

Các headers bảo mật quan trọng đã được cấu hình:

- `Content-Security-Policy`: Ngăn chặn XSS
- `X-Content-Type-Options`: Ngăn chặn MIME sniffing
- `X-Frame-Options`: Ngăn chặn clickjacking
- `Strict-Transport-Security`: Bắt buộc HTTPS

## 3. Rate Limiting

API đã được bảo vệ khỏi tấn công brute force bằng rate limiting:

- 100 requests/15 phút cho các API thông thường
- 10 requests/60 phút cho API đăng nhập/đăng ký

## 4. SSL Configuration

Cấu hình SSL khuyến nghị cho Nginx:

```nginx
# Cấu hình SSL tăng cường
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

---

# XỬ LÝ SỰ CỐ THƯỜNG GẶP

## 1. Các lỗi phổ biến và cách khắc phục

| Lỗi | Nguyên nhân | Giải pháp |
|-----|------------|-----------|
| "Connection refused" | PostgreSQL không chạy | `sudo systemctl start postgresql` |
| "Cannot find module" | Node dependencies chưa cài đặt đúng | `npm ci` |
| 502 Bad Gateway | Nginx không kết nối được Node.js | Kiểm tra `pm2 status` |
| Lỗi CORS | Cấu hình origins không đúng | Kiểm tra `ALLOWED_ORIGINS` |
| "Unauthorized" | Token xác thực không hợp lệ | Xóa cookie, đăng nhập lại |

## 2. Kiểm tra logs

```bash
# Kiểm tra logs PM2
pm2 logs colormedia-affiliate

# Kiểm tra logs Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Kiểm tra logs hệ thống
sudo journalctl -u nginx
sudo journalctl -u postgresql
```

## 3. Khởi động lại các dịch vụ

```bash
# Khởi động lại Node.js
pm2 restart colormedia-affiliate

# Khởi động lại Nginx
sudo systemctl restart nginx

# Khởi động lại PostgreSQL
sudo systemctl restart postgresql
```

## 4. Sao lưu và khôi phục

```bash
# Sao lưu database
pg_dump -U username -d colormedia-affiliate > backup.sql

# Khôi phục database
psql -U username -d colormedia-affiliate < backup.sql

# Sao lưu thư mục dự án
tar -czvf colormedia-affiliate-backup.tar.gz /path/to/colormedia-affiliate
```

---

# TÀI KHOẢN MẶC ĐỊNH

Hệ thống đi kèm với các tài khoản mặc định để kiểm thử:

| Vai trò | Tài khoản | Mật khẩu |
|---------|-----------|----------|
| Admin | admin | admin123 |
| KOL Test | kol_test@colormedia.vn | color1234@ |
| Affiliate Test | test_affiliate@example.com | test123 |

**Lưu ý bảo mật**: Đối với môi trường sản xuất, nên thay đổi mật khẩu của các tài khoản mặc định ngay sau khi triển khai.

---

Để biết thêm chi tiết về các thiết lập URL và API endpoints, tham khảo tài liệu [URLs.md](./URLs.md).

Để biết thêm thông tin về cấu hình triển khai đa môi trường, tham khảo [DEPLOYMENT_CONFIG_GUIDE.md](./DEPLOYMENT_CONFIG_GUIDE.md).

Tài liệu về bảo mật cookie có thể tìm thấy tại [COOKIE_SECURITY_GUIDE.md](./COOKIE_SECURITY_GUIDE.md).