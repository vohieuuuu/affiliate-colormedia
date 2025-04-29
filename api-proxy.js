const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { createHash } = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình API token bảo mật
// API token không còn được lưu trữ ở client, chỉ được lưu trữ an toàn trên server
const SERVER_API_TOKEN = process.env.API_TOKEN || "1ee19664de4bcbd354400cfe0000078cac0618835772f112858183e5ec9b94dc";

// Cấu hình giới hạn tốc độ truy cập API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // giới hạn mỗi IP chỉ được gọi 100 request trong khoảng thời gian
  message: {
    status: 'error',
    message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút'
  },
  standardHeaders: true, // trả về thông tin về giới hạn rate trong header `RateLimit-*`
  legacyHeaders: false, // vô hiệu hóa header `X-RateLimit-*`
});

// Giới hạn nghiêm ngặt hơn cho các API đăng nhập/đăng ký để ngăn tấn công bruteforce
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 10, // tối đa 10 yêu cầu từ một IP
  message: { 
    status: 'error', 
    message: 'Quá nhiều yêu cầu xác thực, vui lòng thử lại sau 1 giờ'
  }
});

// Cấu hình Content-Security-Policy và các Security Headers nâng cao
app.use((req, res, next) => {
  // Content-Security-Policy nghiêm ngặt để ngăn chặn XSS
  const cspDirectives = [
    "default-src 'self'",                                       // Chỉ cho phép tài nguyên từ origin hiện tại
    "script-src 'self' 'unsafe-inline'",                        // Script chỉ được phép từ origin hiện tại và inline
    "connect-src 'self'",                                       // Kết nối fetch/XHR chỉ đến origin hiện tại
    "img-src 'self' data:",                                     // Hình ảnh chỉ từ origin hiện tại và data URLs
    "style-src 'self' 'unsafe-inline'",                         // Style chỉ từ origin hiện tại và inline
    "font-src 'self' data:",                                    // Font chỉ từ origin hiện tại và data URLs
    "frame-ancestors 'none'",                                   // Không cho phép nhúng trang trong iframe
    "form-action 'self'",                                       // Form chỉ submit đến origin hiện tại
    "base-uri 'self'"                                           // Giới hạn <base> tag
  ].join('; ');
  
  // Thiết lập CSP
  res.setHeader('Content-Security-Policy', cspDirectives);
  
  // Headers bảo mật bổ sung
  res.setHeader('X-Content-Type-Options', 'nosniff');           // Ngăn chặn MIME-type sniffing
  res.setHeader('X-Frame-Options', 'DENY');                     // Ngăn chặn clickjacking
  res.setHeader('X-XSS-Protection', '1; mode=block');           // Kích hoạt XSS filter của trình duyệt
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); // Kiểm soát thông tin referrer
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()'); // Hạn chế quyền truy cập vào API nhạy cảm
  
  // Chỉ trong production: Strict-Transport-Security
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'); // 2 năm
  }
  
  next();
});

// Enable CORS với cấu hình phù hợp
app.use(cors({
  // Trong môi trường development, chấp nhận tất cả nguồn
  // Trong môi trường production, chỉ chấp nhận từ domain chính thức
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : ['https://affclm.replit.app'])
    : true,  // Chấp nhận tất cả các origin trong môi trường phát triển
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true  // Quan trọng: cho phép cookies trong cross-origin requests
}));

// Khởi tạo cookie-parser để đọc cookies 
// Sử dụng secret key phức tạp để tăng cường bảo mật cho cookies
// Trong production cần thiết lập biến môi trường COOKIE_SECRET
const cookieSecret = process.env.COOKIE_SECRET || 
                    (process.env.NODE_ENV === 'production' 
                    ? crypto.randomBytes(32).toString('hex')  // Tạo secret ngẫu nhiên trong production
                    : 'colormedia-affiliate-system-dev-secret');

// Thiết lập session và cookie bảo mật
app.use(cookieParser(cookieSecret));

// Bật tính năng Trust Proxy trong production để nhận dạng chính xác IP khi đứng sau load balancer
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(express.json());

// Serve static files with caching
app.use(express.static(path.join(__dirname, 'dist/public'), {
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.css')) {
      // Cache JavaScript/CSS files for 1 week
      res.setHeader('Cache-Control', 'public, max-age=604800');
    } else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif')) {
      // Cache images for 1 day
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Simple health check endpoint
app.get('/api/check', (req, res) => {
  res.json({ status: 'ok', message: 'API proxy is working' });
});

// Middleware để xử lý Cookie và token
const extractToken = (req, res, next) => {
  // Lấy token từ cookie (ưu tiên) hoặc Authorization header
  let token = null;
  
  // 1. Kiểm tra cookies (Ưu tiên sử dụng cookies đầu tiên)
  if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
    
    if (process.env.NODE_ENV === 'development') {
      console.log("Authenticating with token from cookie");
    }
  } else if (req.signedCookies && req.signedCookies.auth_token) {
    // Nếu sử dụng signed cookies
    token = req.signedCookies.auth_token;
    
    if (process.env.NODE_ENV === 'development') {
      console.log("Authenticating with token from signed cookie");
    }
  }
  
  // Debug cookies
  if (process.env.NODE_ENV === 'development' && req.url.includes('/api/auth')) {
    console.log(`DEBUG REQUEST: ${req.method} ${req.url}`);
    console.log("Available cookies:", Object.keys(req.cookies || {}));
    console.log("Available signed cookies:", Object.keys(req.signedCookies || {}));
    
    if (req.headers.cookie) {
      console.log("Raw cookie header:", req.headers.cookie);
    } else {
      console.log("No cookie header present");
    }
    
    console.log("Headers:", Object.keys(req.headers));
  }
  
  // 2. Nếu không có cookie, kiểm tra header Authorization (legacy)
  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
    
    if (process.env.NODE_ENV === 'development') {
      console.log("Authenticating with token from Authorization header");
    }
  }
  
  // Debug log
  if (process.env.NODE_ENV === 'development' && req.url.includes('/api/auth') && !req.url.includes('/login')) {
    console.log(`Request to ${req.url}: token ${token ? 'present' : 'not present'}`);
  }
  
  // Thêm token vào request object (không lộ token trong logs)
  req.authToken = token || SERVER_API_TOKEN;
  
  next();
};

// Áp dụng rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/*', apiLimiter);
app.use('/api/*', extractToken);

// Proxy mọi request API tới server API thực sự
app.all('/api/*', async (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    // Sử dụng biến môi trường API_URL để cấu hình endpoint API
    // Với thứ tự ưu tiên: biến môi trường API_URL -> biến môi trường APP_ENV -> giá trị mặc định
    const appEnv = process.env.APP_ENV || (isProd ? 'production' : 'development');
    
    // Cấu hình theo môi trường triển khai
    const apiEndpoints = {
      production: process.env.API_URL || 'https://affclm-api.replit.app',
      staging: process.env.STAGING_API_URL || 'https://affclm-api-staging.replit.app',
      development: process.env.DEV_API_URL || 'http://localhost:3000',
      // Có thể thêm các môi trường khác ở đây
    };
    
    // Lấy URL backend dựa trên môi trường
    const backendUrl = apiEndpoints[appEnv] || apiEndpoints.production;
    const method = req.method.toLowerCase();
    const url = `${backendUrl}${req.url}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Proxying ${method.toUpperCase()} request to: ${url}`);
    }
    
    // Xóa thông tin nhạy cảm từ logs
    const sanitizedHeaders = { ...req.headers };
    delete sanitizedHeaders.authorization;
    delete sanitizedHeaders.cookie;
    
    // Forward request đến backend với token bảo mật
    const response = await axios({
      method,
      url,
      data: req.body,
      headers: {
        ...sanitizedHeaders,
        host: new URL(backendUrl).host,
        Authorization: `Bearer ${req.authToken}`,
        'X-Forwarded-For': req.ip,
        'X-Real-IP': req.ip
      },
      validateStatus: () => true, // Accept any status code
    });
    
    // Thiết lập Cookie HttpOnly cho token nếu là response đăng nhập thành công
    if (req.url.includes('/api/auth/login') && response.status === 200) {
      // Lưu trữ token trong HttpOnly cookie
      let token = null;
      
      // Kiểm tra và lấy token từ response (dựa vào cấu trúc data của API)
      if (process.env.NODE_ENV === 'development') {
        console.log('Login response structure:', JSON.stringify(response.data, null, 2));
      }
      
      if (response.data?.data?.token) {
        token = response.data.data.token;
        // Xóa token khỏi response data để không gửi về client
        delete response.data.data.token;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Found token in response.data.data.token');
        }
      } else if (response.data?.token) {
        token = response.data.token;
        // Xóa token khỏi response data để không gửi về client
        delete response.data.token;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Found token in response.data.token');
        }
      } else if (typeof response.data === 'object' && response.data !== null) {
        // Tìm kiếm token trong response object ở bất kỳ cấp độ nào
        const findAndRemoveToken = (obj) => {
          if (!obj || typeof obj !== 'object') return null;
          
          if (obj.token) {
            const token = obj.token;
            delete obj.token;
            return token;
          }
          
          for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
              const found = findAndRemoveToken(obj[key]);
              if (found) return found;
            }
          }
          
          return null;
        };
        
        token = findAndRemoveToken(response.data);
        
        if (token && process.env.NODE_ENV === 'development') {
          console.log('Found token in nested object');
        }
      }
      
      if (token) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Setting auth_token cookie after successful login');
          console.log('Token:', token.substring(0, 5) + '...');
        }
        
        // Thiết lập cookie với các tùy chọn phù hợp cho môi trường
        const cookieOptions = {
          httpOnly: true,                                           // Bảo mật: JavaScript không thể đọc cookie
          secure: process.env.NODE_ENV === 'production',            // Yêu cầu HTTPS trong production
          maxAge: 8 * 60 * 60 * 1000,                               // Giảm xuống còn 8 giờ để tăng bảo mật
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Strict trong production
          path: '/',                                                // Cookie sẽ được gửi cho mọi request
          signed: process.env.NODE_ENV === 'production',            // Ký cookie trong production
          domain: process.env.COOKIE_DOMAIN || undefined,           // Giới hạn domain (nếu có)
          partitioned: process.env.NODE_ENV === 'production'        // Sử dụng Partitioned Cookies trong production (CHIPS)
        };
        
        // Debug bao nhiêu cookies hiện có trong response
        if (process.env.NODE_ENV === 'development') {
          console.log('Cookies in response before setting:', res.getHeader('Set-Cookie'));
        }
        
        // Thiết lập cookie cho token
        res.cookie('auth_token', token, cookieOptions);
        
        // Đảm bảo browser lưu cookie bằng cách set header trực tiếp
        let cookieStr = `auth_token=${token}; Path=/; Max-Age=${8 * 60 * 60}; HttpOnly`;
        
        // Thêm cờ Secure trong môi trường production
        if (process.env.NODE_ENV === 'production') {
          cookieStr += '; Secure; SameSite=Strict';
          
          // Thêm thuộc tính __Host- prefix để đảm bảo cookie chỉ được gửi cho host gốc
          // Điều này bảo vệ khỏi tấn công subdomain
          res.cookie('__Host-auth_token', token, {
            ...cookieOptions,
            path: '/'  // __Host- prefix yêu cầu Path=/
          });
        }
        
        // Thêm header Set-Cookie
        if (!res.getHeader('Set-Cookie')) {
          res.setHeader('Set-Cookie', [cookieStr]);
        } else {
          const existing = res.getHeader('Set-Cookie');
          const cookies = Array.isArray(existing) ? existing : [existing];
          cookies.push(cookieStr);
          res.setHeader('Set-Cookie', cookies);
        }
        
        // Debug
        if (process.env.NODE_ENV === 'development') {
          console.log('Set-Cookie header after:', res.getHeader('Set-Cookie'));
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Cookie options:', cookieOptions);
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.warn('Login response success but no token found in the response');
        console.warn('Response structure:', JSON.stringify(response.data, null, 2));
      }
    }
    
    // Xử lý đăng xuất: xóa cookie auth_token khi đăng xuất thành công
    if (req.url.includes('/api/auth/logout') && response.status === 200) {
      // Xóa tất cả các phiên bản của cookie auth_token
      const logoutCookieOptions = {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0, // Xóa cookie ngay lập tức
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/'
      };
      
      // Xóa cookie thông thường
      res.cookie('auth_token', '', logoutCookieOptions);
      
      // Xóa cookie đã ký (nếu có)
      res.cookie('auth_token.sig', '', logoutCookieOptions);
      
      // Xóa cookie __Host- prefix (nếu có)
      if (process.env.NODE_ENV === 'production') {
        res.cookie('__Host-auth_token', '', {
          ...logoutCookieOptions,
          path: '/' // Bắt buộc cho __Host- prefix
        });
      }
      
      // Xóa cookie trong header trực tiếp
      const clearCookieHeader = [
        'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly',
        'auth_token.sig=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly'
      ];
      
      if (process.env.NODE_ENV === 'production') {
        clearCookieHeader.push('__Host-auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict');
      }
      
      // Thêm header Set-Cookie
      res.setHeader('Set-Cookie', clearCookieHeader);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Logout successful: All auth cookies removed');
      }
    }
    
    // Set các header từ response gốc
    Object.entries(response.headers).forEach(([key, value]) => {
      // Bỏ qua các header liên quan đến CORS vì chúng ta tự xử lý
      if (!['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers'].includes(key.toLowerCase())) {
        res.set(key, value);
      }
    });
    
    // Gửi response về client
    res.status(response.status).send(response.data);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Proxy error:', error.message);
    }
    
    res.status(502).json({
      error: 'Bad Gateway',
      message: 'Không thể kết nối đến máy chủ',
      details: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
});

// SPA support - phục vụ index.html cho tất cả các route không tìm thấy
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

// Lắng nghe kết nối
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API proxy server running on port ${PORT}`);
});