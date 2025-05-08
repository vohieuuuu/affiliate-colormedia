# Hướng dẫn cấu hình triển khai hệ thống

Tài liệu này cung cấp thông tin về cách cấu hình hệ thống ColorMedia Affiliate trong các môi trường triển khai khác nhau.

## Cấu trúc biến môi trường

Hệ thống sử dụng các biến môi trường để cấu hình các tham số khác nhau tùy theo môi trường triển khai. Bạn có thể tham khảo file `.env.sample` để biết danh sách đầy đủ các biến môi trường cần thiết.

### Các biến môi trường chính

| Biến | Mô tả | Giá trị mặc định |
| ---- | ----- | ---------------- |
| `NODE_ENV` | Môi trường Node.js | `development` |
| `APP_ENV` | Môi trường ứng dụng | `development` |
| `API_URL` | URL của API backend | `http://localhost:5000` |
| `VITE_API_URL` | URL của API (cho frontend) | `` |
| `VITE_APP_URL` | URL của ứng dụng (cho frontend) | `http://localhost:5000` |
| `ALLOWED_ORIGINS` | Danh sách các domain được phép qua CORS, phân cách bằng dấu phẩy | `https://affclm.replit.app` |

## Các môi trường triển khai

Hệ thống hỗ trợ 3 môi trường chính:

1. **Development (Phát triển)**: Môi trường cho các nhà phát triển, thường chạy trên localhost.
2. **Staging (Dàn dựng)**: Môi trường kiểm thử trước khi đưa vào sản xuất.
3. **Production (Sản xuất)**: Môi trường thực tế cho người dùng cuối.

### Cấu hình cho từng môi trường

#### Môi trường Development (Phát triển)

```dotenv
NODE_ENV=development
APP_ENV=development
VITE_ENVIRONMENT=development
API_URL=http://localhost:5000
VITE_API_URL=
VITE_APP_URL=http://localhost:5000
```

#### Môi trường Staging (Dàn dựng)

```dotenv
NODE_ENV=production
APP_ENV=staging
VITE_ENVIRONMENT=staging
API_URL=https://api-staging.yourdomain.com
VITE_API_URL=https://api-staging.yourdomain.com
VITE_APP_URL=https://staging.yourdomain.com
ALLOWED_ORIGINS=https://staging.yourdomain.com
```

#### Môi trường Production (Sản xuất)

```dotenv
NODE_ENV=production
APP_ENV=production
VITE_ENVIRONMENT=production
API_URL=https://api.yourdomain.com
VITE_API_URL=
VITE_APP_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
```

## Cấu hình URL API cho Frontend

Frontend sử dụng các biến môi trường Vite để cấu hình URL API. Khi triển khai, các biến này được nhúng vào mã nguồn trong quá trình build:

1. Nếu `VITE_API_URL` được thiết lập, frontend sẽ sử dụng URL này để gọi API.
2. Nếu không, frontend sẽ sử dụng URL tương đối, nghĩa là API được gọi từ cùng domain với ứng dụng.

## Cấu hình CORS và Cookie

Khi triển khai trên nhiều domain khác nhau, cần cấu hình:

1. `ALLOWED_ORIGINS`: Danh sách các domain được phép truy cập API.
2. `COOKIE_DOMAIN`: Domain cho cookie (ví dụ: `.yourdomain.com`).

## Cấu hình trên Replit

Khi triển khai trên Replit, hãy đảm bảo thiết lập các biến môi trường sau trong phần Secrets:

```
API_URL: https://affclm-api.replit.app (URL API backend)
VITE_API_URL: (Để trống để sử dụng URL tương đối)
VITE_APP_URL: https://affclm.replit.app (URL ứng dụng)
ALLOWED_ORIGINS: https://affclm.replit.app
COOKIE_SECRET: (Chuỗi ngẫu nhiên ít nhất 32 ký tự)
API_TOKEN: (Token API để xác thực giữa các dịch vụ)
APP_ENV: production
```

## Cấu hình trên VPS

Khi triển khai trên VPS, hãy tạo file `.env` dựa trên `.env.sample` và cấu hình các biến môi trường phù hợp.

### Ví dụ cấu hình Nginx cho VPS

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

## Kiểm tra cấu hình

Bạn có thể kiểm tra cấu hình hiện tại của hệ thống bằng cách truy cập endpoint `/api/check`:

```
GET /api/check
```

Endpoint này sẽ trả về thông tin về môi trường hiện tại và các cấu hình quan trọng (không bao gồm thông tin nhạy cảm).