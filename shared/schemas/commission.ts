import { z } from "zod";

// Định nghĩa các loại affiliate và điều kiện hoa hồng tương ứng
export const AffiliateType = z.enum([
  "partner",  // Hoa hồng 3% cho hợp đồng > 30 triệu VND
  "kol_vip",  // 3 cấp độ với lương cố định + hoa hồng 3%
  "sme"       // Hoa hồng cố định 500K cho hợp đồng 1-29,99 triệu VND
]);

export type AffiliateTypeValue = z.infer<typeof AffiliateType>;

// Quy tắc tính hoa hồng
export const CommissionRules = {
  partner: {
    threshold: 30000000, // 30 triệu VND
    rate: 0.03, // 3%
  },
  sme: {
    min_threshold: 1000000, // 1 triệu VND
    max_threshold: 29999000, // 29,99 triệu VND
    fixed_amount: 500000, // 500 nghìn VND
  },
  kol_vip: {
    commission_rate: 0.03, // 3%
    levels: {
      LEVEL_1: {
        base_salary: 5000000, // 5 triệu VND
        kpi: {
          contacts: 10,
          leads: 5,
          contracts: 0
        },
        upgrade_threshold: 200000000 // 200 triệu VND
      },
      LEVEL_2: {
        base_salary: 10000000, // 10 triệu VND
        kpi: {
          contacts: 20,
          leads: 10,
          contracts: 1
        },
        upgrade_threshold: 500000000 // 500 triệu VND
      },
      LEVEL_3: {
        base_salary: 15000000, // 15 triệu VND
        kpi: {
          contacts: 30,
          leads: 15,
          contracts: 2
        }
      }
    }
  }
};

// Schema cho API thêm bonus vào hoa hồng
export const AddBonusSchema = z.object({
  user_id: z.number(),
  user_type: z.enum(["partner", "kol_vip", "sme"]),
  bonus_amount: z.number().positive(),
  description: z.string().optional()
});

export type AddBonusPayload = z.infer<typeof AddBonusSchema>;

// Schema cho response
export const AddBonusResponseSchema = z.object({
  status: z.string(),
  new_accumulated_commission: z.number()
});

export type AddBonusResponse = z.infer<typeof AddBonusResponseSchema>;

// Hàm tính toán hoa hồng dựa trên loại affiliate và giá trị hợp đồng
export function calculateCommission(
  affiliateType: AffiliateTypeValue,
  contractValue: number
): number {
  switch (affiliateType) {
    case "partner":
      // Partner: 3% cho hợp đồng > 30 triệu VND
      if (contractValue > CommissionRules.partner.threshold) {
        return contractValue * CommissionRules.partner.rate;
      }
      return 0;
    
    case "sme":
      // SME: 500K cố định cho hợp đồng từ 1 triệu - 29,99 triệu VND
      if (
        contractValue >= CommissionRules.sme.min_threshold &&
        contractValue <= CommissionRules.sme.max_threshold
      ) {
        return CommissionRules.sme.fixed_amount;
      }
      return 0;
    
    case "kol_vip":
      // KOL/VIP: Luôn 3% cho mọi hợp đồng (không có ngưỡng tối thiểu)
      return contractValue * CommissionRules.kol_vip.commission_rate;
    
    default:
      return 0;
  }
}