import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from 'cookie-parser';

// Thiết lập xử lý lỗi toàn cục để ngăn không cho ứng dụng tắt đột ngột
process.on('uncaughtException', (error) => {
  console.error('UNHANDLED EXCEPTION! 💥');
  console.error(error.name, error.message, error.stack);
  // Không tắt server ngay lập tức, ghi log và tiếp tục chạy
});

process.on('unhandledRejection', (error) => {
  console.error('UNHANDLED REJECTION! 💥');
  console.error(error);
  // Không tắt server ngay lập tức, ghi log và tiếp tục chạy
});

// Đọc biến môi trường từ file .env
dotenv.config();

const app = express();
// Cấu hình trust proxy - cần thiết cho rate limit khi chạy phía sau proxy
app.set('trust proxy', 1);
// Đảm bảo tất cả API response đều có Content-Type: application/json
// Cấu hình CORS để cho phép chia sẻ cookie giữa các domain
app.use(cors({
  origin: true, // Cho phép tất cả các origin (có thể thay bằng danh sách domain cụ thể cho môi trường production)
  credentials: true, // Quan trọng: cho phép trình duyệt gửi cookie trong các yêu cầu CORS
  exposedHeaders: ['Set-Cookie', 'Authorization'] // Cho phép client đọc các header này
}));
app.use(express.json({ limit: '50mb' })); // Tăng giới hạn lên 50MB để hỗ trợ hình ảnh base64 lớn
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
// Sử dụng cookie-parser với cookie secret để hỗ trợ cookie có chữ ký
app.use(cookieParser(process.env.COOKIE_SECRET || 'colormedia-affiliate-system-secret'));

// Thiết lập rate limiter để hạn chế số lượng request đến API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  limit: 100, // giới hạn mỗi IP tối đa 100 request trong 15 phút
  standardHeaders: 'draft-7', // Trả về RateLimit headers
  legacyHeaders: false, // Không sử dụng X-RateLimit headers
  message: {
    status: 'error',
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Quá nhiều yêu cầu, vui lòng thử lại sau'
    }
  }
});

// Áp dụng rate limiter cho tất cả các route API
app.use('/api/', apiLimiter);

// Rate limiter riêng cho các API xác thực để tránh brute force attack
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  limit: 10, // giới hạn mỗi IP tối đa 10 request đến endpoint login/auth trong 1 giờ
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    status: 'error',
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 1 giờ'
    }
  }
});

// Áp dụng auth limiter cho các route đăng nhập/đăng ký
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log cookies và header quan trọng cho auth API
  if (path.includes("/api/auth")) {
    log(`AUTH API REQUEST: ${req.method} ${path}`);
    log(`Cookies: ${JSON.stringify(req.cookies || {})}`);
    log(`Headers: authorization=${!!req.headers.authorization}, cookie=${!!req.headers.cookie}`);
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Luôn sử dụng xác thực database
    try {
      // Import các module cần thiết cho xác thực với database
      const authModule = await import("./auth");
      const dbModule = await import("./db");
      log("Using database authentication in production mode");
      authModule.setupAuthRoutes(app, dbModule.db);
    } catch (error) {
      console.error("Failed to set up database authentication routes:", error);
      // Chỉ fallback tới dev auth nếu được yêu cầu rõ ràng
      if (process.env.USE_DEV_AUTH === "true") {
        log("Using dev authentication as requested by USE_DEV_AUTH");
        const devAuthModule = await import("./devAuth");
        const storageModule = await import("./storage");
        devAuthModule.setupDevAuthRoutes(app, storageModule.storage);
      } else {
        throw new Error("Failed to set up authentication routes: " + error.message);
      }
    }

    const server = await registerRoutes(app);
  
  // Thêm middleware để xử lý các API không xác định
  app.use('/api/*', (req: Request, res: Response) => {
    // Nếu response chưa được gửi, trả về 404 JSON thay vì HTML
    if (!res.headersSent) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `API endpoint not found: ${req.originalUrl}`
        }
      });
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const errorCode = err.code || "SERVER_ERROR";
    
    console.error("Uncaught exception:", err);
    
    // Trả về lỗi nhưng không ném lại exception để tránh tắt ứng dụng
    if (!res.headersSent) {
      res.status(status).json({ 
        status: "error", 
        error: {
          code: errorCode,
          message: message,
          details: process.env.NODE_ENV === "production" ? undefined : err.stack
        }
      });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
  
  // Thêm xử lý sự kiện uncaughtException và unhandledRejection
  process.on('uncaughtException', (error) => {
    console.error('UNHANDLED EXCEPTION! 💥 Shutting down gracefully...');
    console.error(error.name, error.message, error.stack);
    // Không tắt server ngay lập tức, ghi log và tiếp tục chạy
  });

  process.on('unhandledRejection', (error) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down gracefully...');
    console.error(error);
    // Không tắt server ngay lập tức, ghi log và tiếp tục chạy
  });
  
  } catch (error) {
    console.error('FATAL APPLICATION ERROR:', error);
    // Ghi log lỗi nhưng không tắt ứng dụng
    log('Application encountered a fatal error but will continue running in degraded mode');
  }
})();
