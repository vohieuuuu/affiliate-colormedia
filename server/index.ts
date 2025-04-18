import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

// Đọc biến môi trường từ file .env
dotenv.config();

const app = express();
// Cấu hình trust proxy - cần thiết cho rate limit khi chạy phía sau proxy
app.set('trust proxy', 1);
// Đảm bảo tất cả API response đều có Content-Type: application/json
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  // Thiết lập các routes xác thực nếu sử dụng database
  if (process.env.USE_DATABASE === "true" || process.env.NODE_ENV === "production") {
    try {
      // Import tĩnh thay vì dùng dynamic import để tránh lỗi khi build
      log("Skipping database auth routes in production for now");
      // Khi cần sử dụng db trong tương lai:
      // import { db } from "./db";
      // import { setupAuthRoutes } from "./auth";
      // setupAuthRoutes(app, db);
    } catch (error) {
      console.error("Failed to set up authentication routes:", error);
    }
  } else {
    log("Using in-memory storage, authentication is simulated");
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

    res.status(status).json({ message });
    throw err;
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
})();
