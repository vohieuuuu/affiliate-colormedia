/**
 * API quản lý KOL/VIP dành cho admin
 */
import { Router, Request, Response } from "express";
import { authenticateUser } from "../routes";
import {
  CreateKolVip,
  CreateKolVipSchema,
  KolVipAffiliate,
  KolVipLevel,
  User
} from "@shared/schema";
import { IStorage } from "../storage";
import { hashPassword } from "../auth";
import { z } from "zod";

/**
 * Middleware để kiểm tra quyền admin
 */
function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      status: "error",
      error: {
        code: "FORBIDDEN",
        message: "Bạn không có quyền truy cập."
      }
    });
  }
  next();
}

/**
 * Thiết lập routes cho admin quản lý KOL/VIP
 */
export function setupAdminKolRoutes(router: Router, storage: IStorage): Router {
  /**
   * API tạo tài khoản KOL/VIP mới
   * POST /api/admin/kol/create
   */
  router.post("/kol/create", authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
      console.log("Creating new KOL/VIP account with data:", JSON.stringify(req.body, null, 2));
      
      // Xác thực dữ liệu đầu vào
      const validationResult = CreateKolVipSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        return res.status(400).json({
          status: "error",
          error: {
            code: "VALIDATION_ERROR",
            message: "Dữ liệu không hợp lệ",
            details: errorMessages
          }
        });
      }
      
      const kolVipData = validationResult.data;
      
      // Kiểm tra xem email đã tồn tại chưa
      const existingUser = await storage.getUserByUsername(kolVipData.email);
      if (existingUser) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "EMAIL_EXISTS",
            message: "Email đã được sử dụng trong hệ thống"
          }
        });
      }
      
      // Kiểm tra xem affiliate_id đã tồn tại chưa
      const existingKol = await storage.getKolVipByAffiliateId(kolVipData.affiliate_id);
      if (existingKol) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "AFFILIATE_ID_EXISTS",
            message: "Affiliate ID đã được sử dụng trong hệ thống"
          }
        });
      }
      
      // Mật khẩu mặc định
      const defaultPassword = "color1234@";
      const hashedPassword = await hashPassword(defaultPassword);
      
      // Tạo tài khoản người dùng
      const user = await storage.createUser({
        username: kolVipData.email,
        password: hashedPassword,
        role: "KOL_VIP" as const,
        is_active: 1,
        is_first_login: 1, // Yêu cầu đổi mật khẩu khi đăng nhập lần đầu
        created_at: new Date()
      });
      
      // Xác định mức lương cơ bản dựa trên cấp độ
      let baseSalary: number;
      switch (kolVipData.level) {
        case "LEVEL_1":
          baseSalary = 5000000; // 5 triệu VND
          break;
        case "LEVEL_2":
          baseSalary = 10000000; // 10 triệu VND
          break;
        case "LEVEL_3":
          baseSalary = 15000000; // 15 triệu VND
          break;
        default:
          baseSalary = 5000000; // Mặc định level 1
      }
      
      // Tạo tài khoản KOL/VIP
      const kolVip = await storage.createKolVipAffiliate({
        user_id: user.id,
        affiliate_id: kolVipData.affiliate_id,
        full_name: kolVipData.full_name,
        email: kolVipData.email,
        phone: kolVipData.phone,
        level: kolVipData.level,
        current_base_salary: baseSalary,
        join_date: new Date(),
        bank_account: kolVipData.bank_account,
        bank_name: kolVipData.bank_name,
        total_contacts: 0,
        total_potential_contacts: 0,
        total_contracts: 0,
        total_commission: 0
      });
      
      // Ghi log
      console.log(`Created new KOL/VIP account: ${kolVipData.email} with role KOL_VIP and affiliate_id ${kolVipData.affiliate_id}`);
      
      // Trả về thông tin tài khoản đã tạo
      res.status(201).json({
        status: "success",
        data: {
          kol: kolVip,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            is_first_login: user.is_first_login
          },
          default_password: defaultPassword
        }
      });
    } catch (error) {
      console.error("Error creating KOL/VIP account:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Lỗi khi tạo tài khoản KOL/VIP",
          details: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }
  });
  
  /**
   * API lấy danh sách KOL/VIP
   * GET /api/admin/kol
   */
  router.get("/kol", authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
      // Lấy danh sách tất cả KOL/VIP
      const kolVips = await storage.getAllKolVips();
      
      res.status(200).json({
        status: "success",
        data: {
          kols: kolVips
        }
      });
    } catch (error) {
      console.error("Error fetching KOL/VIP list:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR", 
          message: "Lỗi khi lấy danh sách KOL/VIP",
          details: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }
  });
  
  return router;
}