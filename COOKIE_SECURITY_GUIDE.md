# Hướng dẫn bảo mật Cookie cho ColorMedia Affiliate System

## Tổng quan

Cookie là một phần quan trọng trong hệ thống xác thực, tuy nhiên chúng cũng có thể là mục tiêu của các cuộc tấn công bảo mật như XSS (Cross-Site Scripting), CSRF (Cross-Site Request Forgery), và Session Hijacking. Tài liệu này cung cấp hướng dẫn chi tiết về cách tăng cường bảo mật cho cookie trong dự án ColorMedia Affiliate System.

## Các biện pháp bảo mật cookie đã triển khai

### 1. HttpOnly Flag

Tất cả cookie xác thực được thiết lập với cờ `HttpOnly`, ngăn JavaScript truy cập vào cookie, bảo vệ khỏi tấn công XSS.

```javascript
// Thiết lập cookie với HttpOnly flag
res.cookie('auth_token', token, {
  httpOnly: true,
  // các tùy chọn khác
});
```

### 2. Secure Flag

Trong môi trường production, cookie chỉ được gửi qua kết nối HTTPS bằng cách sử dụng cờ `Secure`.

```javascript
// Thiết lập cookie với Secure flag trong môi trường production
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', 
  // các tùy chọn khác
});
```

### 3. SameSite Attribute

Thuộc tính `SameSite` được thiết lập để bảo vệ khỏi tấn công CSRF:

- `Strict` trong môi trường production: cookie chỉ được gửi trong cùng một site
- `Lax` trong môi trường development: cho phép gửi cookie khi người dùng điều hướng đến site

```javascript
// Thiết lập SameSite attribute
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  // các tùy chọn khác
});
```

### 4. Thời gian sống giới hạn

Cookie có thời gian sống giới hạn (maxAge) để giảm thiểu rủi ro nếu cookie bị đánh cắp.

```javascript
// Thiết lập thời gian sống là 8 giờ
res.cookie('auth_token', token, {
  httpOnly: true,
  maxAge: 8 * 60 * 60 * 1000, // 8 giờ
  // các tùy chọn khác
});
```

### 5. __Host- Prefix

Trong môi trường production, sử dụng tiền tố `__Host-` cho cookie để đảm bảo cookie chỉ được gửi cho host gốc, bảo vệ khỏi tấn công subdomain.

```javascript
// Thiết lập cookie với __Host- prefix
res.cookie('__Host-auth_token', token, {
  httpOnly: true,
  secure: true, // Bắt buộc cho __Host- prefix
  path: '/',    // Bắt buộc cho __Host- prefix
  // các tùy chọn khác
});
```

### 6. Partitioned Cookies (CHIPS)

Sử dụng Partitioned Cookies (CHIPS - Cookies Having Independent Partitioned State) để bảo vệ khỏi theo dõi giữa các trang.

```javascript
// Thiết lập Partitioned cookie
res.cookie('auth_token', token, {
  httpOnly: true,
  partitioned: process.env.NODE_ENV === 'production',
  // các tùy chọn khác
});
```

### 7. Signed Cookies

Trong môi trường production, sử dụng cookie đã ký để bảo vệ tính toàn vẹn của dữ liệu cookie.

```javascript
// Thiết lập cookie đã ký
res.cookie('auth_token', token, {
  httpOnly: true,
  signed: process.env.NODE_ENV === 'production',
  // các tùy chọn khác
});
```

## Triển khai trong server/index.ts

Để áp dụng các biện pháp bảo mật cookie, cần cập nhật file `server/index.ts`:

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

// Tạo secret key ngẫu nhiên hoặc sử dụng từ biến môi trường
const cookieSecret = process.env.COOKIE_SECRET || 
                    (process.env.NODE_ENV === 'production' 
                    ? crypto.randomBytes(32).toString('hex')
                    : 'colormedia-affiliate-dev-secret');

// Khởi tạo Express app
const app = express();

// Bật tính năng Trust Proxy trong production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Thiết lập cookie-parser với secret
app.use(cookieParser(cookieSecret));

// Các Security Headers
app.use((req, res, next) => {
  // Content-Security-Policy để ngăn XSS
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none'; form-action 'self'; base-uri 'self'"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  
  next();
});

// ... (code hiện tại)
```

## Xử lý JWT token trong cookie

Khi sử dụng JWT token trong cookie, cần đảm bảo:

1. Token luôn được lưu trữ trong HttpOnly cookie
2. Không gửi token trong response JSON về client
3. Xóa hoàn toàn cookie khi đăng xuất

```typescript
// Ví dụ về login route
app.post('/api/auth/login', async (req, res) => {
  // ... xác thực và tạo token
  
  // Thiết lập cookie bảo mật
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    signed: process.env.NODE_ENV === 'production',
    domain: process.env.COOKIE_DOMAIN || undefined,
    partitioned: process.env.NODE_ENV === 'production'
  };
  
  // Thiết lập cookie thông thường
  res.cookie('auth_token', token, cookieOptions);
  
  // Thiết lập cookie __Host- trong production
  if (process.env.NODE_ENV === 'production') {
    res.cookie('__Host-auth_token', token, {
      ...cookieOptions,
      path: '/',
      secure: true
    });
  }
  
  // Gửi response mà không bao gồm token
  res.json({ 
    status: 'success',
    data: {
      user: {
        // thông tin người dùng (không bao gồm token)
      }
    } 
  });
});

// Ví dụ về logout route
app.post('/api/auth/logout', async (req, res) => {
  // Tùy chọn cookie để xóa
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  };
  
  // Xóa tất cả các phiên bản của cookie
  res.cookie('auth_token', '', clearOptions);
  res.cookie('auth_token.sig', '', clearOptions);
  
  if (process.env.NODE_ENV === 'production') {
    res.cookie('__Host-auth_token', '', {
      ...clearOptions,
      path: '/',
      secure: true
    });
  }
  
  // Gửi response
  res.json({ status: 'success', message: 'Đăng xuất thành công' });
});
```

## Bảo vệ khỏi các lỗ hổng bảo mật phổ biến

### 1. Tấn công XSS (Cross-Site Scripting)

- Sử dụng `httpOnly: true` cho tất cả cookie chứa dữ liệu nhạy cảm
- Triển khai Content-Security-Policy nghiêm ngặt
- Sanitize tất cả dữ liệu đầu vào từ người dùng

### 2. Tấn công CSRF (Cross-Site Request Forgery)

- Sử dụng `sameSite: 'strict'` cho cookie trong môi trường production
- Triển khai CSRF token cho các form và API mutations

### 3. Session Hijacking

- Sử dụng `secure: true` cho cookie trong môi trường production
- Thiết lập thời gian sống hợp lý cho cookie
- Đổi mới token khi người dùng thay đổi quyền hoặc thực hiện thao tác nhạy cảm

### 4. Man-in-the-Middle Attacks

- Triển khai HTTPS trên toàn bộ ứng dụng
- Sử dụng header HSTS (Strict-Transport-Security)

## Kết luận

Bảo mật cookie là một phần quan trọng trong việc bảo vệ hệ thống xác thực. Bằng cách áp dụng các biện pháp nêu trên, ColorMedia Affiliate System có thể giảm thiểu đáng kể các rủi ro bảo mật liên quan đến cookie. Đảm bảo luôn cập nhật các biện pháp bảo mật khi có công nghệ mới hoặc khi phát hiện lỗ hổng mới.