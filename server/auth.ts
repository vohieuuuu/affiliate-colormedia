/**
 * Mô-đun xác thực người dùng
 */

import { Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { User } from "@shared/schema";
import { sendAccountActivationEmail } from "./email";

// Promisify scrypt để sử dụng với async/await
const scryptAsync = promisify(scrypt);

// Mật khẩu mặc định cho người dùng mới
const DEFAULT_PASSWORD = "color1234@";

/**
 * Mã hóa mật khẩu sử dụng scrypt và salt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * So sánh mật khẩu nhập vào với mật khẩu đã lưu trong DB
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Tạo mã token ngẫu nhiên để xác thực API
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Xử lý đăng nhập lần đầu và kiểm tra yêu cầu đổi mật khẩu
 */
export function requirePasswordChange(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  
  // Nếu không có user (không xác thực) hoặc là API call, cho phép đi tiếp
  if (!user || req.path.startsWith('/api/')) {
    return next();
  }
  
  // Kiểm tra xem user có cần đổi mật khẩu không
  if (user.is_first_login === 1) {
    // Nếu đang truy cập vào trang đổi mật khẩu, cho phép
    if (req.path === '/change-password') {
      return next();
    }
    
    // Nếu không, chuyển hướng đến trang đổi mật khẩu
    return res.redirect('/change-password');
  }
  
  // Người dùng không cần đổi mật khẩu, cho phép truy cập
  next();
}

/**
 * Tạo người dùng mới cho affiliate
 */
export async function createUserForAffiliate(
  db: any,
  email: string,
  fullName: string,
  role = "AFFILIATE"
): Promise<{ user: User; password: string }> {
  // Mã hóa mật khẩu mặc định
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  
  // Tạo token xác thực ngẫu nhiên
  const token = generateToken();
  
  // Thêm người dùng mới vào cơ sở dữ liệu
  const { insertUserSchema, users } = await import("@shared/schema");
  
  const userData = insertUserSchema.parse({
    username: email,
    password: hashedPassword,
    role: role,
    is_active: 1,
    is_first_login: 1, // Đánh dấu cần đổi mật khẩu
    token: token,
  });
  
  const [newUser] = await db.insert(users).values(userData).returning();
  
  // Gửi email kích hoạt tài khoản
  try {
    await sendAccountActivationEmail(fullName, email, DEFAULT_PASSWORD);
  } catch (error) {
    console.error("Failed to send activation email:", error);
  }
  
  return {
    user: newUser,
    password: DEFAULT_PASSWORD
  };
}

/**
 * Thiết lập routes xác thực (đăng nhập, đăng ký, đăng xuất)
 */
export function setupAuthRoutes(app: any, db: any) {
  // Import các schema và models
  const { LoginSchema, RegisterSchema, users, insertUserSchema } = require("@shared/schema");
  const { eq } = require("drizzle-orm");
  
  // API đăng nhập
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Xác thực dữ liệu đầu vào
      const loginData = LoginSchema.parse(req.body);
      
      // Tìm người dùng theo username
      const [user] = await db.select().from(users).where(eq(users.username, loginData.username));
      
      if (!user) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Tài khoản hoặc mật khẩu không chính xác"
          }
        });
      }
      
      // Kiểm tra mật khẩu
      const passwordValid = await comparePasswords(loginData.password, user.password);
      
      if (!passwordValid) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Tài khoản hoặc mật khẩu không chính xác"
          }
        });
      }
      
      // Cập nhật thời gian đăng nhập và token mới
      const token = generateToken();
      await db
        .update(users)
        .set({
          last_login: new Date(),
          token: token
        })
        .where(eq(users.id, user.id));
      
      // Trả về thông tin người dùng đã xác thực
      res.json({
        status: "success",
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            is_first_login: user.is_first_login === 1
          },
          token: token,
          requires_password_change: user.is_first_login === 1
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({
        status: "error",
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Invalid login data"
        }
      });
    }
  });
  
  // API đăng ký
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      // Xác thực dữ liệu đầu vào
      const registerData = RegisterSchema.parse(req.body);
      
      // Kiểm tra xem username đã tồn tại chưa
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, registerData.username));
      
      if (existingUser) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "USERNAME_EXISTS",
            message: "Tên đăng nhập đã tồn tại"
          }
        });
      }
      
      // Mã hóa mật khẩu
      const hashedPassword = await hashPassword(registerData.password);
      
      // Tạo token xác thực
      const token = generateToken();
      
      // Tạo người dùng mới
      const userData = insertUserSchema.parse({
        username: registerData.username,
        password: hashedPassword,
        role: registerData.role || "AFFILIATE",
        is_active: 1,
        is_first_login: 0, // Không yêu cầu đổi mật khẩu vì người dùng đã tự tạo
        token: token
      });
      
      const [newUser] = await db.insert(users).values(userData).returning();
      
      // Nếu có thông tin affiliate, tạo affiliate liên kết với user
      if (registerData.affiliate_data) {
        const { affiliates, insertAffiliateSchema } = await import("@shared/schema");
        
        const affiliateData = insertAffiliateSchema.parse({
          user_id: newUser.id,
          affiliate_id: registerData.affiliate_data.affiliate_id,
          full_name: registerData.affiliate_data.full_name,
          email: registerData.affiliate_data.email,
          phone: registerData.affiliate_data.phone,
          bank_name: registerData.affiliate_data.bank_name,
          bank_account: registerData.affiliate_data.bank_account
        });
        
        await db.insert(affiliates).values(affiliateData);
      }
      
      // Trả về thông tin người dùng mới
      res.status(201).json({
        status: "success",
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role
          },
          token: token
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({
        status: "error",
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Invalid registration data"
        }
      });
    }
  });
  
  // API đổi mật khẩu
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    try {
      const { current_password, new_password } = req.body;
      const token = req.headers.authorization?.split(" ")[1];
      
      if (!token) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "UNAUTHORIZED",
            message: "Bạn cần đăng nhập để thực hiện thao tác này"
          }
        });
      }
      
      // Tìm người dùng theo token
      const [user] = await db.select().from(users).where(eq(users.token, token));
      
      if (!user) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "INVALID_TOKEN",
            message: "Token không hợp lệ hoặc đã hết hạn"
          }
        });
      }
      
      // Kiểm tra mật khẩu hiện tại
      const passwordValid = await comparePasswords(current_password, user.password);
      
      if (!passwordValid) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_PASSWORD",
            message: "Mật khẩu hiện tại không chính xác"
          }
        });
      }
      
      // Mã hóa mật khẩu mới
      const hashedPassword = await hashPassword(new_password);
      
      // Cập nhật mật khẩu và đánh dấu đã đổi mật khẩu
      await db
        .update(users)
        .set({
          password: hashedPassword,
          is_first_login: 0 // Đã đổi mật khẩu
        })
        .where(eq(users.id, user.id));
      
      res.json({
        status: "success",
        data: {
          message: "Đổi mật khẩu thành công"
        }
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Lỗi khi thay đổi mật khẩu"
        }
      });
    }
  });
  
  // API đăng xuất
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      
      if (token) {
        // Tìm người dùng theo token và xóa token
        await db.update(users).set({ token: null }).where(eq(users.token, token));
      }
      
      res.json({
        status: "success",
        data: {
          message: "Đăng xuất thành công"
        }
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Lỗi khi đăng xuất"
        }
      });
    }
  });
  
  // API lấy thông tin người dùng hiện tại
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      
      if (!token) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "UNAUTHORIZED",
            message: "Bạn cần đăng nhập để thực hiện thao tác này"
          }
        });
      }
      
      // Tìm người dùng theo token
      const [user] = await db.select().from(users).where(eq(users.token, token));
      
      if (!user) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "INVALID_TOKEN",
            message: "Token không hợp lệ hoặc đã hết hạn"
          }
        });
      }
      
      res.json({
        status: "success",
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            is_first_login: user.is_first_login === 1
          }
        }
      });
    } catch (error) {
      console.error("Get user info error:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Lỗi khi lấy thông tin người dùng"
        }
      });
    }
  });
}