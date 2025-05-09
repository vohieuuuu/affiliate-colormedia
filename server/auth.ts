/**
 * Mô-đun xác thực người dùng
 */

import { Request, Response, NextFunction } from "express";
import * as bcrypt from 'bcrypt';
import { randomBytes } from "crypto";
import type { User } from "@shared/schema";
import { users, affiliates, kolVipAffiliates } from "@shared/schema";
import { sendAccountActivationEmail } from "./email";

// Số lượng round cho bcrypt (tăng từ 10 lên 12 để tăng độ khó giải mã)
const SALT_ROUNDS = 12;

// Thêm pepper để tăng cường bảo mật (một khóa bí mật thêm vào trước khi băm)
// Pepper khác với salt: salt được lưu cùng hash, pepper là bí mật của server
const PEPPER = process.env.HASH_PEPPER || "co1or-m3d1a-aff1l1at3-s3cur1ty-p3pp3r";

// Mật khẩu mặc định cho người dùng mới
const DEFAULT_PASSWORD = "color1234@";

/**
 * Mã hóa mật khẩu sử dụng bcrypt kết hợp với pepper
 * Phương pháp này kết hợp cả pepper (bí mật của server) và salt (được tạo ngẫu nhiên)
 * để tăng cường bảo mật cho mật khẩu
 */
export async function hashPassword(password: string): Promise<string> {
  // Thêm pepper vào password trước khi băm
  const pepperedPassword = `${password}${PEPPER}`;
  return bcrypt.hash(pepperedPassword, SALT_ROUNDS);
}

/**
 * So sánh mật khẩu nhập vào với mật khẩu đã lưu trong DB
 * Thêm pepper vào mật khẩu nhập vào trước khi so sánh
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  // Thêm pepper vào supplied password trước khi so sánh
  const pepperedPassword = `${supplied}${PEPPER}`;
  return bcrypt.compare(pepperedPassword, stored);
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
  // Thêm người dùng mới vào cơ sở dữ liệu
  const { insertUserSchema, users } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");

  // Kiểm tra xem email đã tồn tại chưa
  const [existingUser] = await db.select().from(users).where(eq(users.username, email));
  
  if (existingUser) {
    throw new Error(`User with email ${email} already exists`);
  }
  
  // Mã hóa mật khẩu mặc định
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

  // Tạo token xác thực ngẫu nhiên
  const token = generateToken();

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
import { LoginSchema, RegisterSchema, insertUserSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

export function setupAuthRoutes(app: any, db: any) {
  // Sử dụng các schema và models đã import

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

      // Chuẩn bị thông tin người dùng cơ bản
      const userResponse = {
        id: user.id,
        username: user.username,
        role: user.role,
        is_first_login: user.is_first_login === 1
      };
      
      // Nếu user là affiliate, thêm thông tin full_name
      if (user.role === "AFFILIATE") {
        // Tìm affiliate theo user_id
        const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.user_id, user.id));
        
        if (affiliate) {
          console.log(`Found affiliate data for user ${user.id}: ${affiliate.full_name}`);
          Object.assign(userResponse, {
            full_name: affiliate.full_name,
            affiliate_id: affiliate.affiliate_id
          });
        } else {
          // Thử tìm affiliate theo email (username)
          const [affiliateByEmail] = await db.select().from(affiliates).where(eq(affiliates.email, user.username));
          
          if (affiliateByEmail) {
            console.log(`Found affiliate by email ${user.username} instead of user_id ${user.id}`);
            Object.assign(userResponse, {
              full_name: affiliateByEmail.full_name,
              affiliate_id: affiliateByEmail.affiliate_id
            });
          }
        }
      }
      
      // Nếu user là KOL/VIP, thêm thông tin full_name
      if (user.role === "KOL_VIP") {
        // Tìm KOL/VIP theo user_id
        const [kolVip] = await db.select().from(kolVipAffiliates).where(eq(kolVipAffiliates.user_id, user.id));
        
        if (kolVip) {
          console.log(`Found KOL/VIP data for user ${user.id}: ${kolVip.full_name}`);
          Object.assign(userResponse, {
            full_name: kolVip.full_name,
            affiliate_id: kolVip.affiliate_id
          });
        } else {
          // Thử tìm KOL/VIP theo email (username)
          const [kolVipByEmail] = await db.select().from(kolVipAffiliates).where(eq(kolVipAffiliates.email, user.username));
          
          if (kolVipByEmail) {
            console.log(`Found KOL/VIP by email ${user.username} instead of user_id ${user.id}`);
            Object.assign(userResponse, {
              full_name: kolVipByEmail.full_name,
              affiliate_id: kolVipByEmail.affiliate_id
            });
          }
        }
      }
      
      // Thiết lập token vào HTTP-only cookie để tăng bảo mật
      console.log("API Login: Setting auth_token cookie");
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        path: '/', // Đảm bảo cookie có sẵn cho tất cả các đường dẫn
        sameSite: 'lax'
      });
      
      // Trả về thông tin người dùng đã xác thực
      res.json({
        status: "success",
        data: {
          user: userResponse,
          token: token, // Vẫn trả về token trong response để tương thích với client cũ
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

      // Thiết lập token vào HTTP-only cookie để tăng bảo mật
      console.log("API Register: Setting auth_token cookie");
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        path: '/', // Đảm bảo cookie có sẵn cho tất cả các đường dẫn
        sameSite: 'lax'
      });
      
      // Trả về thông tin người dùng mới
      res.status(201).json({
        status: "success",
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role
          },
          token: token // Vẫn trả về token trong response để tương thích với client cũ
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
      
      // Lấy token từ nhiều nguồn
      let token = null;
      
      // 1. Kiểm tra cookie trực tiếp
      if (req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
      }
      // 2. Kiểm tra header Authorization
      else if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }
      // 3. Kiểm tra body
      else if (!token && req.body && req.body.token) {
        token = req.body.token;
      }

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

      // Kiểm tra xem đây có phải là đăng nhập lần đầu không
      const isFirstLogin = user.is_first_login === 1;
      
      // Nếu không phải đăng nhập lần đầu, kiểm tra mật khẩu hiện tại
      if (!isFirstLogin) {
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
      }

      // Mã hóa mật khẩu mới
      const hashedPassword = await hashPassword(new_password);

      // Tạo token mới cho người dùng
      const newToken = generateToken();

      // Cập nhật mật khẩu, token và đánh dấu đã đổi mật khẩu
      await db
        .update(users)
        .set({
          password: hashedPassword,
          is_first_login: 0, // Đã đổi mật khẩu
          token: newToken
        })
        .where(eq(users.id, user.id));
        
      // Thiết lập token mới vào HTTP-only cookie
      res.cookie('auth_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        path: '/', // Thêm đường dẫn để đảm bảo cookie hoạt động trên toàn bộ ứng dụng
        sameSite: 'lax'
      });

      // Kiểm tra và cập nhật liên kết với affiliate nếu cần
      const { affiliates } = await import("@shared/schema");
      const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.user_id, user.id));

      if (!affiliate && user.username) {
        // Nếu không tìm thấy affiliate qua user_id, thử tìm qua email
        const [affiliateByEmail] = await db.select().from(affiliates).where(eq(affiliates.email, user.username));
        if (affiliateByEmail) {
          console.log(`Found affiliate by email ${user.username} instead of user_id ${user.id}`);
          // Cập nhật user_id của affiliate để khớp với user hiện tại
          await db
            .update(affiliates)
            .set({ user_id: user.id })
            .where(eq(affiliates.id, affiliateByEmail.id));
        }
      }

      res.json({
        status: "success",
        data: {
          message: "Đổi mật khẩu thành công",
          token: newToken
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
      // Lấy token từ các nguồn khác nhau theo thứ tự ưu tiên
      let token = null;
      
      // 1. Kiểm tra cookie trực tiếp
      if (req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
      }
      // 2. Kiểm tra header Authorization
      else if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }
      
      if (token) {
        // Tìm người dùng theo token và xóa token
        await db.update(users).set({ token: null }).where(eq(users.token, token));
      }
      
      // Xóa cookie auth_token
      res.clearCookie('auth_token');

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
      // Lấy token từ các nguồn khác nhau theo thứ tự ưu tiên
      let token = null;
      
      // 1. Kiểm tra cookie trực tiếp
      if (req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
        console.log("API: Found token in cookies object");
      }
      
      // 2. Kiểm tra ký hiệu cookie thủ công
      else if (!token && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        
        if (cookies.auth_token) {
          token = cookies.auth_token;
          console.log("API: Found token in cookie header");
        }
      }
      
      // 3. Kiểm tra token trong header Authorization
      else if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
        console.log("API: Found token in Authorization header");
      }
      
      // 4. Nếu request có token từ proxy
      else if (!token && (req as any).authToken) {
        token = (req as any).authToken;
        console.log("API: Using token from proxy request object");
      }
      
      // 5. Kiểm tra token trong body request
      else if (!token && req.body && req.body.token) {
        token = req.body.token;
        console.log("API: Found token in request body");
      }

      if (!token) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "UNAUTHORIZED",
            message: "Bạn cần đăng nhập để thực hiện thao tác này"
          }
        });
      }

      // Log debug
      console.log("Checking token (auth header, cookies, or request object)");
      
      // Kiểm tra admin API token (chỉ khớp 8 ký tự đầu)
      const adminApiToken = process.env.API_TOKEN || "1ee19664de4bcbd354400cfe0000078cac0618835772f112858183e5ec9b94dc";
      if (token.startsWith(adminApiToken.substring(0, 8))) {
        // Trong trường hợp token là API token, trả về admin user cho internal API
        const [adminUser] = await db.select().from(users).where(eq(users.role, "ADMIN"));
        if (adminUser) {
          return res.json({
            status: "success",
            data: {
              user: {
                id: adminUser.id,
                username: adminUser.username,
                role: adminUser.role,
                is_first_login: adminUser.is_first_login === 1
              }
            }
          });
        }
      }
      
      // Tìm người dùng theo token
      const [user] = await db.select().from(users).where(eq(users.token, token));

      if (!user) {
        console.log("Invalid token: [SECURED]");
        return res.status(401).json({
          status: "error",
          error: {
            code: "INVALID_TOKEN",
            message: "Token không hợp lệ hoặc đã hết hạn"
          }
        });
      }
      
      // Tạo response cơ bản
      const userResponse = {
        id: user.id,
        username: user.username,
        role: user.role,
        is_first_login: user.is_first_login === 1
      };
      
      // Nếu user là affiliate, thêm thông tin full_name
      if (user.role === "AFFILIATE") {
        // Tìm affiliate theo user_id
        const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.user_id, user.id));
        
        if (affiliate) {
          console.log(`Found affiliate data for user ${user.id}: ${affiliate.full_name}`);
          Object.assign(userResponse, {
            full_name: affiliate.full_name,
            affiliate_id: affiliate.affiliate_id
          });
        } else {
          // Thử tìm affiliate theo email (username)
          const [affiliateByEmail] = await db.select().from(affiliates).where(eq(affiliates.email, user.username));
          
          if (affiliateByEmail) {
            console.log(`Found affiliate by email ${user.username} instead of user_id ${user.id}`);
            Object.assign(userResponse, {
              full_name: affiliateByEmail.full_name,
              affiliate_id: affiliateByEmail.affiliate_id
            });
          }
        }
      }
      
      // Nếu user là KOL/VIP, thêm thông tin full_name
      if (user.role === "KOL_VIP") {
        // Tìm KOL/VIP theo user_id
        const [kolVip] = await db.select().from(kolVipAffiliates).where(eq(kolVipAffiliates.user_id, user.id));
        
        if (kolVip) {
          console.log(`Found KOL/VIP data for user ${user.id}: ${kolVip.full_name}`);
          Object.assign(userResponse, {
            full_name: kolVip.full_name,
            affiliate_id: kolVip.affiliate_id
          });
        } else {
          // Thử tìm KOL/VIP theo email (username)
          const [kolVipByEmail] = await db.select().from(kolVipAffiliates).where(eq(kolVipAffiliates.email, user.username));
          
          if (kolVipByEmail) {
            console.log(`Found KOL/VIP by email ${user.username} instead of user_id ${user.id}`);
            Object.assign(userResponse, {
              full_name: kolVipByEmail.full_name,
              affiliate_id: kolVipByEmail.affiliate_id
            });
          }
        }
      }

      res.json({
        status: "success",
        data: {
          user: userResponse
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