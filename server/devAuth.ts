/**
 * Mô-đun xác thực người dùng cho môi trường phát triển
 */

import { Request, Response } from "express";
import { LoginSchema, RegisterSchema, UserRoleType, User } from "@shared/schema";
import { generateToken, comparePasswords, hashPassword } from "./auth";
import { IStorage } from "./storage";

/**
 * Thiết lập routes xác thực cho môi trường phát triển sử dụng MemStorage
 */
export function setupDevAuthRoutes(app: any, storage: IStorage) {
  console.log("DEV MODE: Setting up dev auth routes for in-memory storage");
  
  // API đăng nhập
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Validate dữ liệu đầu vào
      const loginData = LoginSchema.parse(req.body);
      
      // Tìm người dùng theo username
      const user = await storage.getUserByUsername(loginData.username);
      
      if (!user) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Tên đăng nhập hoặc mật khẩu không đúng"
          }
        });
      }
      
      // Kiểm tra mật khẩu
      const passwordValid = await comparePasswords(loginData.password, user.password);
      
      if (!passwordValid) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Tên đăng nhập hoặc mật khẩu không đúng"
          }
        });
      }
      
      // Tạo token mới
      const token = generateToken();
      
      // Lưu thông tin đăng nhập (trong thực tế, sẽ cập nhật trong database)
      user.token = token;
      user.last_login = new Date();
      
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
      const existingUser = await storage.getUserByUsername(registerData.username);
      
      if (existingUser) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "USER_EXISTS",
            message: "Tên đăng nhập đã tồn tại"
          }
        });
      }
      
      // Mã hóa mật khẩu
      const hashedPassword = await hashPassword(registerData.password);
      
      // Tạo người dùng mới
      const newUser = await storage.createUser({
        username: registerData.username,
        password: hashedPassword,
        role: registerData.role as UserRoleType || "AFFILIATE",
        is_first_login: true
      });
      
      // Tạo token mới cho người dùng
      const token = generateToken();
      (newUser as any).token = token;
      
      // Trả về thông tin người dùng đã đăng ký
      res.status(201).json({
        status: "success",
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role
          },
          token: token,
          development_mode: true
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
      
      // Tìm người dùng có token này (trong thực tế đây sẽ là một truy vấn database)
      const user = (storage as any).users.find((u: any) => u.token === token);
      
      if (!user) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "INVALID_TOKEN",
            message: "Token không hợp lệ hoặc đã hết hạn"
          }
        });
      }
      
      const { old_password, new_password } = req.body;
      
      if (!old_password || !new_password) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "VALIDATION_ERROR",
            message: "Thiếu dữ liệu bắt buộc"
          }
        });
      }
      
      // Kiểm tra mật khẩu cũ
      const passwordValid = await comparePasswords(old_password, user.password);
      
      if (!passwordValid) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_PASSWORD",
            message: "Mật khẩu cũ không đúng"
          }
        });
      }
      
      // Mã hóa mật khẩu mới
      const hashedPassword = await hashPassword(new_password);
      
      // Cập nhật mật khẩu và đánh dấu đã đổi mật khẩu lần đầu
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.markFirstLoginComplete(user.id);
      
      res.json({
        status: "success",
        data: {
          message: "Đổi mật khẩu thành công",
          development_mode: true
        }
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Lỗi khi đổi mật khẩu"
        }
      });
    }
  });
  
  // API đăng xuất
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      
      if (token) {
        // Xóa token của người dùng
        const userIndex = (storage as any).users.findIndex((u: any) => u.token === token);
        if (userIndex !== -1) {
          (storage as any).users[userIndex].token = null;
        }
      }
      
      res.json({
        status: "success",
        data: {
          message: "Đăng xuất thành công",
          development_mode: true
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
    console.log("DEV MODE: Checking user auth with token");
    
    // Phục vụ phát triển: bỏ qua xác thực nếu cần
    if (process.env.DISABLE_AUTH === "true") {
      console.log("TEST MODE: Authentication disabled for testing");
      return res.json({
        status: "success",
        data: {
          user: {
            id: 999,
            username: "test_user",
            role: "AFFILIATE",
            is_first_login: false
          },
          development_mode: true,
          auth_disabled: true
        }
      });
    }
    
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
      
      // Tìm người dùng có token này
      const user = (storage as any).users.find((u: any) => u.token === token);
      
      if (!user) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "INVALID_TOKEN",
            message: "Token không hợp lệ hoặc đã hết hạn"
          }
        });
      }
      
      // Trả về thông tin người dùng
      res.json({
        status: "success",
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            is_first_login: user.is_first_login === 1
          },
          development_mode: true
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

  // Tạo tài khoản admin mặc định cho môi trường dev
  createDefaultDevAccount(storage);
}

/**
 * Tạo tài khoản admin mặc định cho môi trường phát triển
 */
async function createDefaultDevAccount(storage: IStorage) {
  try {
    // Kiểm tra xem đã có tài khoản admin chưa
    const adminUser = await storage.getUserByUsername("admin@colormedia.vn");
    
    if (!adminUser) {
      console.log("DEV MODE: Creating default admin account");
      
      // Mã hóa mật khẩu mặc định
      const hashedPassword = await hashPassword("admin123");
      
      // Tạo tài khoản admin
      const newUser = await storage.createUser({
        username: "admin@colormedia.vn",
        password: hashedPassword,
        role: "ADMIN",
        is_first_login: false
      });
      
      console.log(`DEV MODE: Created default admin account (ID: ${newUser.id})`);
    } else {
      console.log("DEV MODE: Default admin account already exists");
    }
  } catch (error) {
    console.error("Error creating default dev account:", error);
  }
}