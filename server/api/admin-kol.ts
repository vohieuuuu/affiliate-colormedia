/**
 * API quản lý KOL/VIP dành cho admin
 */

import { Router, Request, Response } from "express";
import { IStorage } from "../storage";
import { CreateKolVipSchema, UserRoleType } from "@shared/schema";
import { createUserForAffiliate } from "../auth";
import { authenticateUser } from "../routes";

// Constants
const KOL_VIP_LEVEL_SALARY = {
  "LEVEL_1": 5000000,   // Fresher
  "LEVEL_2": 10000000,  // Advanced
  "LEVEL_3": 15000000,  // Elite
};

function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({
      status: "error",
      error: {
        code: "FORBIDDEN",
        message: "Bạn không có quyền truy cập tài nguyên này"
      }
    });
  }
  next();
}

export function setupAdminKolRoutes(router: Router, storage: IStorage) {
  /**
   * API tạo tài khoản KOL/VIP mới
   * POST /api/admin/kol/create
   */
  router.post("/kol/create", authenticateUser, requireAdmin, async (req: Request, res: Response) => {
    try {
      // Xác thực dữ liệu đầu vào
      const kolData = CreateKolVipSchema.parse(req.body);
      
      // Kiểm tra affiliate_id đã tồn tại chưa
      const existingKol = await storage.getKolVipAffiliateByAffiliateId(kolData.affiliate_id);
      if (existingKol) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "DUPLICATE_AFFILIATE_ID",
            message: `Affiliate ID '${kolData.affiliate_id}' đã tồn tại trong hệ thống`
          }
        });
      }
      
      // Kiểm tra email đã tồn tại chưa
      const existingKolByEmail = await storage.getKolVipAffiliateByEmail(kolData.email);
      if (existingKolByEmail) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "DUPLICATE_EMAIL",
            message: `Email '${kolData.email}' đã tồn tại trong hệ thống`
          }
        });
      }
      
      // Kiểm tra username (email) đã tồn tại dưới dạng user chưa
      const existingUser = await storage.getUserByUsername(kolData.email);
      if (existingUser) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "DUPLICATE_USERNAME",
            message: `Username '${kolData.email}' đã tồn tại trong hệ thống`
          }
        });
      }
      
      // Tạo user account với role KOL_VIP
      const { user, password } = await createUserForAffiliate(
        kolData.full_name,
        kolData.email,
        "KOL_VIP" as UserRoleType
      );
      
      // Xác định mức lương cơ bản dựa trên level
      const baseSalary = KOL_VIP_LEVEL_SALARY[kolData.level] || 5000000;
      
      // Tạo KOL/VIP affiliate record
      const newKolVip = await storage.createKolVipAffiliate({
        user_id: user.id,
        affiliate_id: kolData.affiliate_id,
        full_name: kolData.full_name,
        email: kolData.email,
        phone: kolData.phone,
        bank_account: kolData.bank_account,
        bank_name: kolData.bank_name,
        level: kolData.level,
        current_base_salary: baseSalary,
        join_date: new Date(),
        remaining_balance: 0,
        paid_balance: 0,
        received_balance: 0,
        accumulated_commission: 0,
        contract_value: 0,
        monthly_contract_value: 0,
        total_contacts: 0,
        potential_contacts: 0,
        total_contracts: 0,
        consecutive_failures: 0,
        kpi_history: [],
        referred_customers: [],
        withdrawal_history: []
      });
      
      // Trả về thông tin KOL/VIP mới tạo
      res.status(201).json({
        status: "success",
        data: {
          kol: {
            id: newKolVip.id,
            user_id: user.id,
            affiliate_id: newKolVip.affiliate_id,
            full_name: newKolVip.full_name,
            email: newKolVip.email,
            level: newKolVip.level,
            current_base_salary: newKolVip.current_base_salary,
            join_date: newKolVip.join_date
          },
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            is_first_login: user.is_first_login
          },
          default_password: password
        }
      });
    } catch (error) {
      console.error("Error creating KOL/VIP account:", error);
      
      // Xử lý lỗi validate từ Zod
      if (error.errors) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "VALIDATION_ERROR",
            message: "Dữ liệu không hợp lệ",
            details: error.errors
          }
        });
      }
      
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Có lỗi xảy ra khi tạo tài khoản KOL/VIP"
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
      // TODO: Implement get all KOL/VIPs
      res.status(200).json({
        status: "success",
        data: {
          kols: []
        }
      });
    } catch (error) {
      console.error("Error getting KOL/VIP list:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Có lỗi xảy ra khi lấy danh sách KOL/VIP"
        }
      });
    }
  });
  
  return router;
}