import { Router, Request, Response } from "express";
import { AddBonusSchema, AffiliateType, calculateCommission } from "@shared/schemas/commission";
import { db } from "../db";
import { authenticateUser } from "../routes";
import { eq } from "drizzle-orm";
import { affiliates, kolVipAffiliates } from "@shared/schema";

// Router cho các API liên quan đến hoa hồng
const commissionRouter = Router();

// Middleware xác thực người dùng
commissionRouter.use(authenticateUser);

/**
 * API thêm bonus/thưởng vào hoa hồng tích lũy
 * POST /api/commission/add-bonus
 */
commissionRouter.post("/add-bonus", async (req: Request, res: Response) => {
  try {
    const { user } = req;
    
    // Kiểm tra quyền admin
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({
        status: "error",
        error: {
          code: "PERMISSION_DENIED",
          message: "Bạn không có quyền thực hiện thao tác này"
        }
      });
    }
    
    // Validate dữ liệu đầu vào
    const parsedData = AddBonusSchema.parse(req.body);
    const { user_id, user_type, bonus_amount, description } = parsedData;
    
    let newAccumulatedCommission = 0;
    
    // Cập nhật hoa hồng tích lũy dựa trên loại người dùng
    if (user_type === "kol_vip") {
      // Tìm KOL/VIP theo user_id
      const [kolVip] = await db.select().from(kolVipAffiliates)
        .where(eq(kolVipAffiliates.user_id, user_id));
      
      if (!kolVip) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "USER_NOT_FOUND",
            message: "Không tìm thấy KOL/VIP với ID đã cung cấp"
          }
        });
      }
      
      // Cập nhật hoa hồng tích lũy và số dư khả dụng
      const newAccumulatedAmount = (kolVip.accumulated_commission || 0) + bonus_amount;
      const newRemainingBalance = (kolVip.remaining_balance || 0) + bonus_amount;
      
      await db.update(kolVipAffiliates)
        .set({
          accumulated_commission: newAccumulatedAmount,
          remaining_balance: newRemainingBalance
        })
        .where(eq(kolVipAffiliates.id, kolVip.id));
        
      newAccumulatedCommission = newAccumulatedAmount;
    } else {
      // Tìm affiliate thường theo user_id
      const [affiliate] = await db.select().from(affiliates)
        .where(eq(affiliates.user_id, user_id));
      
      if (!affiliate) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "USER_NOT_FOUND",
            message: "Không tìm thấy Affiliate với ID đã cung cấp"
          }
        });
      }
      
      // Cập nhật loại affiliate nếu cần
      if (affiliate.affiliate_type !== user_type) {
        await db.update(affiliates)
          .set({ affiliate_type: user_type as string })
          .where(eq(affiliates.id, affiliate.id));
      }
      
      // Cập nhật hoa hồng tích lũy và số dư khả dụng
      const newAccumulatedAmount = (affiliate.accumulated_commission || 0) + bonus_amount;
      const newRemainingBalance = (affiliate.remaining_balance || 0) + bonus_amount;
      
      await db.update(affiliates)
        .set({
          accumulated_commission: newAccumulatedAmount,
          remaining_balance: newRemainingBalance
        })
        .where(eq(affiliates.id, affiliate.id));
        
      newAccumulatedCommission = newAccumulatedAmount;
    }
    
    // Log hoạt động (có thể thêm vào bảng log riêng nếu cần)
    console.log(`[BONUS ADDED] User ID: ${user_id}, Type: ${user_type}, Amount: ${bonus_amount}, By: ${user.username}, Description: ${description || 'N/A'}`);
    
    // Trả về kết quả
    return res.json({
      status: "success",
      new_accumulated_commission: newAccumulatedCommission
    });
  } catch (error) {
    console.error("Error adding bonus:", error);
    return res.status(400).json({
      status: "error",
      error: {
        code: "INVALID_DATA",
        message: error instanceof Error ? error.message : "Dữ liệu không hợp lệ"
      }
    });
  }
});

/**
 * Tính lại hoa hồng cho một khách hàng dựa trên quy tắc mới
 * PATCH /api/commission/recalculate/:affiliate_id/:customer_id
 */
commissionRouter.patch("/recalculate/:affiliate_id/:customer_id", async (req: Request, res: Response) => {
  try {
    const { affiliate_id, customer_id } = req.params;
    
    // Kiểm tra affiliate
    const [affiliate] = await db.select().from(affiliates)
      .where(eq(affiliates.affiliate_id, affiliate_id));
    
    if (!affiliate) {
      return res.status(404).json({
        status: "error",
        error: {
          code: "AFFILIATE_NOT_FOUND",
          message: "Không tìm thấy affiliate"
        }
      });
    }
    
    // Lấy danh sách khách hàng
    const referredCustomers = affiliate.referred_customers || [];
    const customerIndex = referredCustomers.findIndex(c => c.id === parseInt(customer_id));
    
    if (customerIndex === -1) {
      return res.status(404).json({
        status: "error",
        error: {
          code: "CUSTOMER_NOT_FOUND",
          message: "Không tìm thấy khách hàng"
        }
      });
    }
    
    const customer = referredCustomers[customerIndex];
    
    // Chỉ tính lại hoa hồng cho khách hàng đã ký hợp đồng
    if (customer.status !== "Đã chốt hợp đồng" || !customer.contract_value) {
      return res.status(400).json({
        status: "error",
        error: {
          code: "INVALID_CUSTOMER_STATUS",
          message: "Khách hàng chưa ký hợp đồng hoặc không có giá trị hợp đồng"
        }
      });
    }
    
    // Tính lại hoa hồng dựa trên loại affiliate
    const affiliateType = affiliate.affiliate_type as "partner" | "sme";
    const newCommission = calculateCommission(affiliateType, customer.contract_value);
    
    // Cập nhật hoa hồng cho khách hàng
    referredCustomers[customerIndex].commission = newCommission;
    
    // Cập nhật tổng hoa hồng tích lũy
    const oldCommission = customer.commission || 0;
    const commissionDiff = newCommission - oldCommission;
    
    // Cập nhật lại các giá trị liên quan
    await db.update(affiliates)
      .set({
        referred_customers: referredCustomers,
        accumulated_commission: (affiliate.accumulated_commission || 0) + commissionDiff,
        remaining_balance: (affiliate.remaining_balance || 0) + commissionDiff
      })
      .where(eq(affiliates.id, affiliate.id));
    
    return res.json({
      status: "success",
      data: {
        customer_id: parseInt(customer_id),
        old_commission: oldCommission,
        new_commission: newCommission,
        difference: commissionDiff
      }
    });
  } catch (error) {
    console.error("Error recalculating commission:", error);
    return res.status(500).json({
      status: "error",
      error: {
        code: "SERVER_ERROR",
        message: "Có lỗi xảy ra khi tính lại hoa hồng"
      }
    });
  }
});

export default commissionRouter;