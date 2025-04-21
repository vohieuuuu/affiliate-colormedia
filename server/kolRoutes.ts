import type { Express, Request, Response, NextFunction } from "express";
import type { IStorage } from "./storage";
import { authenticateUser } from "./routes";
import { KolContact, KolVipAffiliate, KolVipLevelType, MonthlyKpi, kolContacts, kolVipAffiliates, WithdrawalStatusType } from "@shared/schema";
import { hashPassword, generateToken } from "./auth";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { rateLimit } from "express-rate-limit";
import { sendOtpVerificationEmail } from "./email";

/**
 * Thiết lập routes quản lý KOL/VIP
 * @param app Express app
 * @param storage Storage instance
 */
export function setupKolVipRoutes(app: Express, storage: IStorage) {
  // Middleware kiểm tra quyền KOL/VIP
  const requireKolVip = async (req: Request, res: Response, next: NextFunction) => {
    // Đảm bảo user đã đăng nhập
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        error: {
          code: "UNAUTHORIZED",
          message: "Bạn cần đăng nhập để truy cập"
        }
      });
    }

    // Kiểm tra role KOL_VIP hoặc KOL - sử dụng chuẩn hóa chữ hoa
    const normalizedRole = String(req.user.role).toUpperCase();
    console.log("requireKolVip checking: ", {
      role: req.user.role, 
      normalizedRole, 
      isKolVip: normalizedRole.includes("KOL"), 
      isAdmin: normalizedRole.includes("ADMIN")
    });
    
    // Sử dụng includes thay vì so sánh chính xác để linh hoạt hơn
    if (!normalizedRole.includes("KOL") && !normalizedRole.includes("ADMIN")) {
      return res.status(403).json({
        status: "error",
        error: {
          code: "FORBIDDEN",
          message: "Bạn không có quyền truy cập tài nguyên KOL/VIP"
        }
      });
    }

    // Tìm thông tin KOL/VIP
    let kolVip = await storage.getKolVipAffiliateByUserId(req.user.id);
    
    // Nếu không tìm thấy thông tin KOL/VIP và người dùng có role KOL hoặc KOL_VIP
    if (!kolVip && normalizedRole.includes("KOL")) {
      console.log(`No KOL/VIP data found for user ${req.user.id} (${req.user.username}) - creating default data`);
      
      // Tạo dữ liệu KOL/VIP mặc định cho user có role KOL_VIP
      try {
        const defaultKolVip = await storage.createKolVipAffiliate({
          affiliate_id: `KOL${req.user.id}`,
          user_id: req.user.id,
          full_name: req.user.username.split('@')[0] || `KOL User ${req.user.id}`,
          email: req.user.username,
          phone: "0987654321",
          bank_account: "0987654321",
          bank_name: "Ngân hàng VPBank",
          level: "LEVEL_1",
          current_base_salary: 5000000,
          total_contacts: 0,
          potential_contacts: 0,
          total_contracts: 0
        });
        
        kolVip = defaultKolVip;
        console.log(`Created default KOL/VIP data for user ${req.user.id}:`, kolVip);
      } catch (error) {
        console.error(`Error creating default KOL/VIP data:`, error);
        return res.status(404).json({
          status: "error",
          error: {
            code: "KOL_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP của bạn và không thể tạo mới"
          }
        });
      }
    }

    // Thêm thông tin KOL/VIP vào request để các middleware sau có thể sử dụng
    req.kolVip = kolVip;
    next();
  };

  // Đảm bảo KOL/VIP chỉ truy cập dữ liệu của chính mình
  const ensureOwnKolVipData = (req: Request, res: Response, next: NextFunction) => {
    const requestedKolId = req.params.kolId || req.body.kolId;
    
    // Admin có thể truy cập tất cả - sử dụng chuẩn hóa chữ hoa
    const normalizedRole = String(req.user?.role || '').toUpperCase();
    console.log("ensureOwnKolVipData checking: ", {
      role: req.user?.role, 
      normalizedRole,
      isAdmin: normalizedRole.includes("ADMIN")
    });
    
    if (normalizedRole.includes("ADMIN")) {
      return next();
    }
    
    // KOL/VIP chỉ có thể truy cập dữ liệu của chính mình
    if (req.kolVip && req.kolVip.affiliate_id !== requestedKolId) {
      return res.status(403).json({
        status: "error",
        error: {
          code: "FORBIDDEN",
          message: "Bạn chỉ có thể truy cập dữ liệu của chính mình"
        }
      });
    }
    
    next();
  };

  // API routes quản lý KOL/VIP
  
  // GET /api/kol/me - Lấy thông tin KOL/VIP hiện tại
  app.get("/api/kol/me", authenticateUser, requireKolVip, async (req: Request, res: Response) => {
    try {
      if (!req.kolVip) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "KOL_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP của bạn"
          }
        });
      }

      res.status(200).json({
        status: "success",
        data: req.kolVip
      });
    } catch (error) {
      console.error("Error getting KOL/VIP profile:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi lấy thông tin KOL/VIP"
        }
      });
    }
  });

  // GET /api/kol/:kolId/contacts - Lấy danh sách contacts của KOL/VIP
  app.get("/api/kol/:kolId/contacts", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      console.log(`Getting contacts for KOL/VIP ${kolId}`);
      
      // Truy vấn trực tiếp từ database
      const contacts = await db.select()
        .from(kolContacts)
        .where(eq(kolContacts.kol_id, kolId));
      
      console.log(`Found ${contacts.length} contacts for KOL/VIP ${kolId}`);
      
      res.status(200).json({
        status: "success",
        data: contacts
      });
    } catch (error) {
      console.error("Error getting KOL/VIP contacts:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi lấy danh sách contacts"
        }
      });
    }
  });

  // POST /api/kol/:kolId/contacts - Thêm contact mới cho KOL/VIP
  app.post("/api/kol/:kolId/contacts", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      const contactData = req.body;
      
      console.log(`Trực tiếp thêm contact mới cho KOL/VIP ${kolId} với dữ liệu:`, contactData);
      
      // 1. Kiểm tra xem KOL/VIP có tồn tại trong database không
      const [kolVip] = await db.select()
        .from(kolVipAffiliates)
        .where(eq(kolVipAffiliates.affiliate_id, kolId));
      
      if (!kolVip) {
        console.error(`KOL/VIP with ID ${kolId} not found in database`);
        return res.status(404).json({
          status: "error",
          error: {
            code: "KOL_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP"
          }
        });
      }
      
      // 2. Chuyển đổi dữ liệu contact từ request
      // Thay thế full_name bằng contact_name nếu có
      const contact_name = contactData.contact_name || contactData.full_name;
      
      // 3. Thêm contact mới trực tiếp vào database
      const [newContact] = await db.insert(kolContacts)
        .values({
          kol_id: kolId,
          contact_name: contact_name,
          email: contactData.email,
          phone: contactData.phone,
          company: contactData.company,
          position: contactData.position,
          source: contactData.source,
          status: contactData.status || "Mới nhập",
          note: contactData.note,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();
      
      console.log("New contact created successfully:", newContact);
      
      // 4. Cập nhật tổng số contacts của KOL/VIP
      await db.update(kolVipAffiliates)
        .set({ 
          total_contacts: kolVip.total_contacts + 1 
        })
        .where(eq(kolVipAffiliates.id, kolVip.id));
      
      res.status(201).json({
        status: "success",
        data: newContact
      });
    } catch (error) {
      console.error("Error adding KOL/VIP contact:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi thêm contact mới: " + (error instanceof Error ? error.message : String(error))
        }
      });
    }
  });

  // PUT /api/kol/:kolId/contacts/:contactId - Cập nhật trạng thái contact
  app.put("/api/kol/:kolId/contacts/:contactId", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId, contactId } = req.params;
      const { status, note } = req.body;

      // Validate status
      if (!status) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_STATUS",
            message: "Trạng thái không hợp lệ"
          }
        });
      }

      const updatedContact = await storage.updateKolVipContactStatus(
        kolId,
        parseInt(contactId),
        status,
        note || ""
      );

      if (!updatedContact) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "CONTACT_NOT_FOUND",
            message: "Không tìm thấy contact với ID đã cung cấp"
          }
        });
      }

      res.status(200).json({
        status: "success",
        data: updatedContact
      });
    } catch (error) {
      console.error("Error updating KOL/VIP contact status:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi cập nhật trạng thái contact"
        }
      });
    }
  });

  // POST /api/kol/:kolId/contacts/:contactId/contract - Cập nhật thông tin hợp đồng
  app.post("/api/kol/:kolId/contacts/:contactId/contract", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId, contactId } = req.params;
      const { contract_value, note } = req.body;

      // Validate contract value
      if (!contract_value || contract_value <= 0) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_CONTRACT_VALUE",
            message: "Giá trị hợp đồng không hợp lệ"
          }
        });
      }

      // Lấy thông tin contact hiện tại
      const contacts = await storage.getKolVipContacts(kolId);
      const contact = contacts.find(c => c.id === parseInt(contactId));

      if (!contact) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "CONTACT_NOT_FOUND",
            message: "Không tìm thấy contact với ID đã cung cấp"
          }
        });
      }

      // Tính hoa hồng (3% giá trị hợp đồng)
      const commission = Math.round(contract_value * 0.03);

      // Cập nhật contact
      const updatedContact = await storage.updateKolVipContactWithContract(
        parseInt(contactId),
        {
          ...contact,
          status: "Đã chốt hợp đồng",
          contract_value,
          commission,
          contract_date: new Date().toISOString(),
          note: note || contact.note
        },
        {
          contract_value,
          commission,
          remaining_balance: commission // Số dư khả dụng tăng thêm bằng hoa hồng
        }
      );

      if (!updatedContact) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "UPDATE_FAILED",
            message: "Không thể cập nhật thông tin hợp đồng"
          }
        });
      }

      // Lấy thông tin KOL/VIP mới nhất sau khi cập nhật
      const updatedKolVip = await storage.getKolVipAffiliateByAffiliateId(kolId);

      res.status(200).json({
        status: "success",
        data: {
          contact: updatedContact,
          kol: updatedKolVip
        }
      });
    } catch (error) {
      console.error("Error updating contract information:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi cập nhật thông tin hợp đồng"
        }
      });
    }
  });

  // GET /api/kol/:kolId/kpi-stats - Lấy thống kê KPI của KOL/VIP
  app.get("/api/kol/:kolId/kpi-stats", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      const { month, year } = req.query;

      // Lấy thông tin KOL/VIP
      const kolVip = await storage.getKolVipAffiliateByAffiliateId(kolId);
      if (!kolVip) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "KOL_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP"
          }
        });
      }

      // Lấy danh sách contacts
      const contacts = await storage.getKolVipContacts(kolId);

      // Tính toán thống kê KPI cho tháng và năm được chỉ định
      const currentDate = new Date();
      const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
      const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;

      // Lọc contacts theo tháng và năm
      const monthlyContacts = contacts.filter(contact => {
        const createdDate = new Date(contact.created_at);
        return createdDate.getFullYear() === targetYear && createdDate.getMonth() + 1 === targetMonth;
      });

      // Lấy KPI trong lịch sử nếu có
      const kpiHistory = kolVip.kpi_history || [];
      const monthlyKpi = kpiHistory.find(kpi => kpi.year === targetYear && kpi.month === targetMonth);

      // Tính toán các chỉ số KPI
      const totalContacts = monthlyContacts.length;
      const potentialContacts = monthlyContacts.filter(c => 
        c.status !== "Mới nhập" && c.status !== "Không tiềm năng"
      ).length;
      const contractsCount = monthlyContacts.filter(c => c.status === "Đã chốt hợp đồng").length;
      const contractValue = monthlyContacts
        .filter(c => c.status === "Đã chốt hợp đồng")
        .reduce((sum, c) => sum + (c.contract_value || 0), 0);
      const commission = monthlyContacts
        .filter(c => c.status === "Đã chốt hợp đồng")
        .reduce((sum, c) => sum + (c.commission || 0), 0);

      // Xác định mục tiêu KPI dựa trên level của KOL/VIP
      let kpiTargets = {
        requiredContacts: 10,
        requiredPotentialContacts: 5,
        requiredContracts: 0
      };

      if (kolVip.level === "LEVEL_2") {
        kpiTargets = {
          requiredContacts: 20,
          requiredPotentialContacts: 10,
          requiredContracts: 1
        };
      } else if (kolVip.level === "LEVEL_3") {
        kpiTargets = {
          requiredContacts: 30,
          requiredPotentialContacts: 15,
          requiredContracts: 2
        };
      }

      // Tính toán tiến độ KPI
      const kpiProgress = {
        contacts: {
          current: totalContacts,
          target: kpiTargets.requiredContacts,
          percentage: Math.min(100, Math.round((totalContacts / kpiTargets.requiredContacts) * 100))
        },
        potentialContacts: {
          current: potentialContacts,
          target: kpiTargets.requiredPotentialContacts,
          percentage: Math.min(100, Math.round((potentialContacts / kpiTargets.requiredPotentialContacts) * 100))
        },
        contracts: {
          current: contractsCount,
          target: kpiTargets.requiredContracts,
          percentage: kpiTargets.requiredContracts === 0 ? 100 : Math.min(100, Math.round((contractsCount / kpiTargets.requiredContracts) * 100))
        },
        overall: {
          achieved: false,
          performance: monthlyKpi?.performance || "PENDING",
          lastEvaluated: monthlyKpi?.evaluation_date
        }
      };

      // Tự động xác định KPI đạt được hay chưa
      kpiProgress.overall.achieved = 
        kpiProgress.contacts.percentage >= 100 && 
        kpiProgress.potentialContacts.percentage >= 100 && 
        kpiProgress.contracts.percentage >= 100;

      res.status(200).json({
        status: "success",
        data: {
          kolVip: {
            id: kolVip.id,
            affiliate_id: kolVip.affiliate_id,
            full_name: kolVip.full_name,
            level: kolVip.level,
            current_base_salary: kolVip.current_base_salary
          },
          period: {
            year: targetYear,
            month: targetMonth
          },
          kpi: kpiProgress,
          stats: {
            totalContacts,
            potentialContacts,
            contractsCount,
            contractValue,
            commission,
            // Thêm lương cơ bản để tính tổng thu nhập
            baseSalary: kolVip.current_base_salary,
            totalIncome: kolVip.current_base_salary + commission
          },
          contacts: monthlyContacts.map(c => ({
            id: c.id,
            contact_name: c.contact_name,
            company: c.company,
            phone: c.phone,
            email: c.email,
            status: c.status,
            created_at: c.created_at,
            contract_value: c.contract_value,
            commission: c.commission
          }))
        }
      });
    } catch (error) {
      console.error("Error getting KOL/VIP KPI stats:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi lấy thống kê KPI"
        }
      });
    }
  });

  // POST /api/kol/:kolId/kpi - Thêm/Cập nhật KPI hàng tháng
  app.post("/api/kol/:kolId/kpi", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      const { year, month } = req.body;

      // Validate year và month
      if (!year || !month) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_PERIOD",
            message: "Năm và tháng là bắt buộc"
          }
        });
      }

      // Lấy thông tin KOL/VIP
      const kolVip = await storage.getKolVipAffiliateByAffiliateId(kolId);
      if (!kolVip) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "KOL_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP"
          }
        });
      }

      // Lấy danh sách contacts
      const contacts = await storage.getKolVipContacts(kolId);

      // Lọc contacts theo tháng và năm
      const monthlyContacts = contacts.filter(contact => {
        const createdDate = new Date(contact.created_at);
        return createdDate.getFullYear() === year && createdDate.getMonth() + 1 === month;
      });

      // Tính toán các chỉ số KPI
      const totalContacts = monthlyContacts.length;
      const potentialContacts = monthlyContacts.filter(c => 
        c.status !== "Mới nhập" && c.status !== "Không tiềm năng"
      ).length;
      const contractsCount = monthlyContacts.filter(c => c.status === "Đã chốt hợp đồng").length;
      const contractValue = monthlyContacts
        .filter(c => c.status === "Đã chốt hợp đồng")
        .reduce((sum, c) => sum + (c.contract_value || 0), 0);
      const commission = monthlyContacts
        .filter(c => c.status === "Đã chốt hợp đồng")
        .reduce((sum, c) => sum + (c.commission || 0), 0);

      // Xác định mục tiêu KPI dựa trên level của KOL/VIP
      let kpiTargets = {
        requiredContacts: 10,
        requiredPotentialContacts: 5,
        requiredContracts: 0
      };

      if (kolVip.level === "LEVEL_2") {
        kpiTargets = {
          requiredContacts: 20,
          requiredPotentialContacts: 10,
          requiredContracts: 1
        };
      } else if (kolVip.level === "LEVEL_3") {
        kpiTargets = {
          requiredContacts: 30,
          requiredPotentialContacts: 15,
          requiredContracts: 2
        };
      }

      // Tự động xác định performance
      let performance = "PENDING" as "ACHIEVED" | "NOT_ACHIEVED" | "PENDING";
      if (totalContacts >= kpiTargets.requiredContacts && 
          potentialContacts >= kpiTargets.requiredPotentialContacts && 
          contractsCount >= kpiTargets.requiredContracts) {
        performance = "ACHIEVED";
      } else {
        // Chỉ đánh dấu là không đạt nếu đã hết tháng
        const currentDate = new Date();
        const isCurrentMonth = currentDate.getFullYear() === year && currentDate.getMonth() + 1 === month;
        
        if (!isCurrentMonth) {
          performance = "NOT_ACHIEVED";
        }
      }

      // Tạo hoặc cập nhật KPI
      const kpiData: MonthlyKpi = {
        year,
        month,
        total_contacts: totalContacts,
        potential_contacts: potentialContacts,
        contracts: contractsCount,
        performance,
        base_salary: kolVip.current_base_salary,
        commission,
        evaluation_date: new Date().toISOString()
      };

      const updatedKpi = await storage.addKolVipMonthlyKpi(kolId, kpiData);

      // Nếu KPI đã kết thúc và có kết quả đánh giá, cập nhật level
      if (performance !== "PENDING") {
        const evaluationResult = await storage.evaluateKolVipMonthlyKpi(
          kolId,
          year,
          month,
          performance
        );

        // Lấy thông tin KOL/VIP mới nhất sau khi cập nhật
        const updatedKolVip = await storage.getKolVipAffiliateByAffiliateId(kolId);

        res.status(200).json({
          status: "success",
          data: {
            kpi: updatedKpi,
            evaluation: evaluationResult,
            kolVip: updatedKolVip
          }
        });
      } else {
        res.status(200).json({
          status: "success",
          data: {
            kpi: updatedKpi
          }
        });
      }
    } catch (error) {
      console.error("Error updating KOL/VIP KPI:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi cập nhật KPI"
        }
      });
    }
  });

  // POST /api/admin/kol/create - Tạo mới KOL/VIP (Admin only)
  app.post("/api/admin/kol/create", authenticateUser, (req: Request, res: Response, next: NextFunction) => {
    // Kiểm tra quyền admin
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({
        status: "error",
        error: {
          code: "FORBIDDEN",
          message: "Chỉ admin mới có quyền tạo KOL/VIP"
        }
      });
    }
    next();
  }, async (req: Request, res: Response) => {
    try {
      // Kiểm tra quyền admin được thực hiện ở middleware trước đó,
      // không cần kiểm tra lại ở đây

      // Hỗ trợ cả hai định dạng body - format cũ và format mới giống affiliate thường
      let username, affiliateData;

      if (req.body.username) {
        // Format cũ: { username, affiliate_data }
        username = req.body.username;
        affiliateData = req.body.affiliate_data || {};
      } else {
        // Format mới: giống affiliate thường, chỉ gửi thông tin affiliate
        username = req.body.email; // Sử dụng email làm username 
        affiliateData = { ...req.body };
      }

      // Validate dữ liệu
      if (!username || !affiliateData) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_DATA",
            message: "Thiếu thông tin cần thiết (email/username)"
          }
        });
      }

      if (!affiliateData.full_name || !affiliateData.email) {
        return res.status(400).json({
          status: "error", 
          error: {
            code: "INVALID_DATA",
            message: "Thiếu thông tin họ tên hoặc email"
          }
        });
      }

      // Tạo user mới với role KOL_VIP và mật khẩu mặc định đã băm
      const defaultPassword = "color1234@";
      // Băm mật khẩu mặc định trước khi lưu
      const hashedPassword = await hashPassword(defaultPassword);
      
      // Log để debug
      console.log("Creating KOL/VIP user with:", {
        username,
        role: "KOL_VIP",
        is_first_login: true
      });
      
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role: "KOL_VIP", // Đảm bảo role được đặt đúng
        is_first_login: true
      });

      // Tạo KOL/VIP affiliate
      // Cho phép người dùng chỉ định rõ affiliate_id giống như ở affiliate thường
      const kolVipData = {
        user_id: user.id,
        ...affiliateData,
        // Đảm bảo có affiliate_id, nếu không tạo mới với format "KOLxxx" (3 chữ số)
        affiliate_id: affiliateData.affiliate_id || `KOL${String(user.id).padStart(3, '0')}`,
        level: affiliateData.level || "LEVEL_1",
        current_base_salary: 
          affiliateData.level === "LEVEL_3" ? 15000000 : 
          affiliateData.level === "LEVEL_2" ? 10000000 : 5000000
      };
      
      console.log(`Tạo KOL/VIP với affiliate_id: ${kolVipData.affiliate_id}, cấp độ: ${kolVipData.level}`);

      // Đảm bảo email được lưu
      if (!kolVipData.email && req.body.email) {
        kolVipData.email = req.body.email;
      }

      console.log("Creating KOL/VIP with data:", kolVipData);
      const kolVip = await storage.createKolVipAffiliate(kolVipData);

      res.status(201).json({
        status: "success",
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          },
          kolVip
        }
      });
    } catch (error) {
      console.error("Error creating KOL/VIP:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi tạo KOL/VIP"
        }
      });
    }
  });

  // GET /api/admin/kol - Lấy danh sách KOL/VIP (Admin only)
  app.get("/api/admin/kol", authenticateUser, (req: Request, res: Response, next: NextFunction) => {
    // Kiểm tra quyền admin
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({
        status: "error",
        error: {
          code: "FORBIDDEN",
          message: "Chỉ admin mới có quyền xem danh sách KOL/VIP"
        }
      });
    }
    next();
  }, async (req: Request, res: Response) => {
    try {
      // Kiểm tra quyền admin đã được thực hiện ở middleware trước đó

      // TODO: Thêm phương thức getAllKolVipAffiliates vào IStorage

      // Fake data
      const kolVips: KolVipAffiliate[] = [];

      res.status(200).json({
        status: "success",
        data: kolVips
      });
    } catch (error) {
      console.error("Error getting KOL/VIP list:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi lấy danh sách KOL/VIP"
        }
      });
    }
  });

  // POST /api/admin/kol/:kolId/update-level - Cập nhật level của KOL/VIP (Admin only)
  app.post("/api/admin/kol/:kolId/update-level", authenticateUser, (req: Request, res: Response, next: NextFunction) => {
    // Kiểm tra quyền admin
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({
        status: "error",
        error: {
          code: "FORBIDDEN",
          message: "Chỉ admin mới có quyền cập nhật level KOL/VIP"
        }
      });
    }
    next();
  }, async (req: Request, res: Response) => {
    try {
      // Kiểm tra quyền admin đã được thực hiện ở middleware trước đó

      const { kolId } = req.params;
      const { level } = req.body;

      // Validate level
      if (!level || !["LEVEL_1", "LEVEL_2", "LEVEL_3"].includes(level)) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_LEVEL",
            message: "Level không hợp lệ"
          }
        });
      }

      // Cập nhật level
      const updatedKolVip = await storage.updateKolVipAffiliateLevel(kolId, level as KolVipLevelType);

      if (!updatedKolVip) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "KOL_NOT_FOUND",
            message: "Không tìm thấy KOL/VIP với ID đã cung cấp"
          }
        });
      }

      res.status(200).json({
        status: "success",
        data: updatedKolVip
      });
    } catch (error) {
      console.error("Error updating KOL/VIP level:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi cập nhật level KOL/VIP"
        }
      });
    }
  });

  // Middleware để phát hiện giao dịch rút tiền đáng ngờ cho KOL/VIP
  const detectSuspiciousKolVipWithdrawal = (req: Request, res: Response, next: NextFunction) => {
    const { amount } = req.body;
    const userIP = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Kiểm tra xem có kolVip trong request không (phải được xác thực trước)
    if (!req.kolVip) {
      return next();
    }
    
    const kolVip = req.kolVip;
    
    // Tính toán các yếu tố rủi ro
    const amountValue = parseFloat(amount);
    const isUnusualAmount = amountValue > 10000000; // 10 triệu VND
    const isHighRatio = amountValue > kolVip.remaining_balance * 0.7; // Rút hơn 70% số dư
    
    // Lưu trữ thông tin kiểm tra
    req.withdrawalRiskFactors = {
      isUnusualAmount,
      isHighRatio,
      requireStrictVerification: isUnusualAmount || isHighRatio
    };
    
    console.log(`KOL/VIP Withdrawal risk analysis for ${kolVip.affiliate_id}:`, req.withdrawalRiskFactors);
    next();
  };

  // API endpoint để kiểm tra giới hạn rút tiền cho KOL/VIP
  app.post("/api/kol/withdrawal-request/check-limit", authenticateUser, requireKolVip, async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_AMOUNT",
            message: "Số tiền không hợp lệ"
          }
        });
      }
      
      // Lấy thông tin KOL/VIP
      const kolVip = await storage.getKolVipAffiliateByUserId(req.user.id);
      if (!kolVip) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "KOL_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP"
          }
        });
      }
      
      // Kiểm tra số dư
      if (kolVip.remaining_balance < amount) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: `Số dư không đủ. Số dư hiện tại: ${kolVip.remaining_balance.toLocaleString()} VND`
          }
        });
      }
      
      // Kiểm tra giới hạn rút tiền theo ngày
      const limitCheck = await storage.checkKolVipDailyWithdrawalLimit(kolVip.affiliate_id, amount);
      
      return res.status(200).json(limitCheck);
      
    } catch (error) {
      console.error("Error checking KOL/VIP withdrawal limit:", error);
      return res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Lỗi kiểm tra giới hạn rút tiền"
        }
      });
    }
  });

  // API endpoint to request withdrawal OTP for KOL/VIP
  app.post("/api/kol/withdrawal-request/send-otp", authenticateUser, requireKolVip, detectSuspiciousKolVipWithdrawal, async (req: Request, res: Response) => {
    try {
      const { amount, note, tax_id } = req.body;
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ 
          status: "error",
          error: {
            code: "INVALID_AMOUNT",
            message: "Số tiền không hợp lệ"
          }
        });
      }
      
      // Sử dụng kolVip từ middleware requireKolVip
      if (!req.kolVip) {
        return res.status(404).json({ 
          status: "error",
          error: {
            code: "KOL_VIP_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP"
          }
        });
      }
      
      // Tạo biến kolVip từ req.kolVip để tránh lỗi TypeScript
      const kolVip = req.kolVip;
      
      if (parseFloat(amount) > kolVip.remaining_balance) {
        return res.status(400).json({ 
          status: "error",
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: `Số tiền rút vượt quá số dư hiện có: ${kolVip.remaining_balance.toLocaleString()} VND`
          }
        });
      }
      
      // Kiểm tra giới hạn rút tiền trong ngày (được đặt lại vào 9:00 sáng mỗi ngày)
      const amountValue = parseFloat(amount);
      const dailyLimitCheck = await storage.checkDailyWithdrawalLimit(kolVip.affiliate_id, amountValue);
      
      if (dailyLimitCheck.exceeds) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "DAILY_LIMIT_EXCEEDED",
            message: `Vượt quá giới hạn rút tiền trong ngày. Bạn đã rút ${dailyLimitCheck.totalWithdrawn.toLocaleString()} VND từ 9:00 sáng hôm nay. Số tiền còn có thể rút: ${dailyLimitCheck.remainingLimit.toLocaleString()} VND. Giới hạn sẽ được đặt lại vào 9:00 sáng ngày mai.`
          }
        });
      }
      
      // Tính thuế TNCN 10% cho các khoản rút tiền trên 2 triệu VND
      const originalAmount = parseFloat(amount);
      let taxAmount = 0;
      let netAmount = originalAmount;
      let hasTax = false;
      
      const INCOME_TAX_THRESHOLD = 2000000; // 2 triệu VND
      const INCOME_TAX_RATE = 0.1; // 10%
      
      if (originalAmount > INCOME_TAX_THRESHOLD) {
        taxAmount = originalAmount * INCOME_TAX_RATE;
        netAmount = originalAmount - taxAmount;
        hasTax = true;
      }
      
      // Lưu thông tin request tạm thời vào session hoặc cache
      const withdrawalData = {
        user_id: kolVip.affiliate_id,
        full_name: kolVip.full_name,
        email: kolVip.email,
        phone: kolVip.phone,
        bank_account: kolVip.bank_account,
        bank_name: kolVip.bank_name,
        tax_id: tax_id || "", // Thêm MST cá nhân (nếu có)
        amount_requested: originalAmount,
        amount_after_tax: netAmount,
        tax_amount: taxAmount,
        has_tax: hasTax,
        tax_rate: INCOME_TAX_RATE,
        note: note || "",
        request_time: new Date().toISOString()
      };
      
      // Khởi tạo OTP
      if (!req.user) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "UNAUTHORIZED",
            message: "Phiên đăng nhập của bạn đã hết hạn"
          }
        });
      }
      
      // Tạo OTP cho user
      const otpCode = await storage.createOtp(req.user.id, "withdrawal");
      
      // Gửi email OTP
      try {
        await sendOtpVerificationEmail(kolVip.email, kolVip.full_name, otpCode, req.user.id);
        console.log(`OTP sent to ${kolVip.email} for withdrawal verification`);
      } catch (emailError) {
        console.error("Failed to send OTP email:", emailError);
        return res.status(500).json({
          status: "error",
          error: {
            code: "EMAIL_SEND_FAILED",
            message: "Không thể gửi email xác thực OTP"
          }
        });
      }
      
      // Lưu thông tin withdrawal_data vào cache hoặc session
      // (ở đây ta giả định dữ liệu được lưu giữ ở server qua OTP)
      
      res.status(200).json({
        status: "success",
        data: {
          message: "Mã OTP đã được gửi đến email của bạn",
          withdrawal_info: {
            amount: originalAmount,
            tax_amount: taxAmount,
            amount_after_tax: netAmount,
            has_tax: hasTax,
            bank_account: kolVip.bank_account,
            bank_name: kolVip.bank_name
          },
          expires_in: "5 minutes" // OTP hết hạn sau 5 phút
        }
      });
    } catch (error) {
      console.error("Error requesting withdrawal OTP for KOL/VIP:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi xử lý yêu cầu rút tiền"
        }
      });
    }
  });
  
  // API endpoint to verify OTP and process withdrawal for KOL/VIP
  app.post("/api/kol/withdrawal-request/verify", authenticateUser, requireKolVip, async (req: Request, res: Response) => {
    try {
      const { otp, amount, note, tax_id } = req.body;
      
      if (!otp || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_INPUT",
            message: "Mã OTP và số tiền rút là bắt buộc"
          }
        });
      }
      
      // Kiểm tra KOL/VIP
      if (!req.kolVip) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "KOL_VIP_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP"
          }
        });
      }
      
      const kolVip = req.kolVip;
      
      // Xác thực OTP
      if (!req.user) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "UNAUTHORIZED",
            message: "Phiên đăng nhập của bạn đã hết hạn"
          }
        });
      }
      
      const otpValid = await storage.verifyOtp(req.user.id, otp, "withdrawal");
      
      if (!otpValid) {
        // Tăng số lần thử OTP
        const attempts = await storage.increaseOtpAttempt(req.user.id, otp);
        
        // Nếu sai quá 5 lần, vô hiệu hóa OTP
        if (attempts >= 5) {
          await storage.invalidateOtp(req.user.id, otp);
          return res.status(400).json({
            status: "error",
            error: {
              code: "OTP_ATTEMPTS_EXCEEDED",
              message: "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã OTP mới."
            }
          });
        }
        
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_OTP",
            message: `Mã OTP không hợp lệ. Bạn còn ${5 - attempts} lần thử.`
          }
        });
      }
      
      // Tính thuế TNCN 10% cho các khoản rút tiền trên 2 triệu VND
      const originalAmount = parseFloat(amount);
      let taxAmount = 0;
      let netAmount = originalAmount;
      let hasTax = false;
      
      const INCOME_TAX_THRESHOLD = 2000000; // 2 triệu VND
      const INCOME_TAX_RATE = 0.1; // 10%
      
      if (originalAmount > INCOME_TAX_THRESHOLD) {
        taxAmount = originalAmount * INCOME_TAX_RATE;
        netAmount = originalAmount - taxAmount;
        hasTax = true;
      }
      
      // Tạo dữ liệu yêu cầu rút tiền
      const withdrawalRequest = {
        user_id: kolVip.affiliate_id,
        full_name: kolVip.full_name,
        email: kolVip.email,
        phone: kolVip.phone,
        bank_account: kolVip.bank_account,
        bank_name: kolVip.bank_name,
        tax_id: tax_id || "", // Thêm MST cá nhân (nếu có)
        amount_requested: originalAmount,
        amount_after_tax: netAmount,
        tax_amount: taxAmount,
        has_tax: hasTax,
        tax_rate: INCOME_TAX_RATE,
        note: note || "",
        request_time: new Date().toISOString()
      };
      
      // Xử lý yêu cầu rút tiền trong database cho KOL/VIP
      await storage.addKolVipWithdrawalRequest({
        ...withdrawalRequest
      });
      
      // Vô hiệu hóa OTP đã sử dụng
      await storage.invalidateOtp(req.user.id, otp);
      
      // Lấy thông tin KOL/VIP mới nhất sau khi xử lý
      const updatedKolVip = await storage.getKolVipAffiliateByAffiliateId(kolVip.affiliate_id);
      
      if (!updatedKolVip) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "KOL_VIP_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP sau khi xử lý"
          }
        });
      }
      
      // Webhook gửi thông báo rút tiền (nếu cần)
      try {
        const webhookUrls = [
          "https://auto.autogptvn.com/webhook-test/yeu-cau-thanh-toan-affilate",
          "https://auto.autogptvn.com/webhook/yeu-cau-thanh-toan-affilate"
        ];
        
        // Chuẩn bị payload webhook
        const webhookPayload = {
          affiliate_id: kolVip.affiliate_id,
          full_name: kolVip.full_name,
          email: kolVip.email,
          phone: kolVip.phone,
          bank_account: kolVip.bank_account,
          bank_name: kolVip.bank_name,
          tax_id: tax_id || "",
          amount_requested: originalAmount,
          amount_after_tax: netAmount,
          tax_amount: taxAmount,
          has_tax: hasTax,
          note: note || "",
          request_time: withdrawalRequest.request_time,
          type: "KOL_VIP"
        };
        
        // Gửi webhook không đồng bộ
        Promise.all(webhookUrls.map(url => 
          fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(webhookPayload),
          })
          .then(response => {
            console.log(`Webhook sent to ${url}, status: ${response.status}`);
            return response;
          })
          .catch(error => {
            console.error(`Error sending webhook to ${url}:`, error);
            return null;
          })
        )).then(results => {
          const successCount = results.filter(res => res && res.ok).length;
          console.log(`Successfully sent webhooks to ${successCount}/${webhookUrls.length} endpoints`);
        });
      } catch (webhookError) {
        console.error("Failed to send withdrawal webhook:", webhookError);
      }
      
      // Trả về kết quả thành công
      res.status(200).json({
        status: "success",
        data: {
          message: "Yêu cầu rút tiền đã được xử lý thành công",
          withdrawal_request: {
            affiliate_id: kolVip.affiliate_id,
            amount: originalAmount,
            tax_amount: taxAmount,
            amount_after_tax: netAmount,
            has_tax: hasTax,
            request_time: withdrawalRequest.request_time,
            status: "Pending"
          },
          kolVip: updatedKolVip
        }
      });
    } catch (error) {
      console.error("Error processing KOL/VIP withdrawal:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Lỗi khi xử lý yêu cầu rút tiền"
        }
      });
    }
  });
  
  // API endpoint to update withdrawal status (Admin only)
  app.post("/api/admin/kol/:affiliateId/withdrawal/:requestTime/status", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Kiểm tra quyền admin
      if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({
          status: "error",
          error: {
            code: "FORBIDDEN",
            message: "Bạn không có quyền cập nhật trạng thái yêu cầu rút tiền"
          }
        });
      }
      
      const { affiliateId, requestTime } = req.params;
      const { status, note } = req.body;
      
      if (!affiliateId || !requestTime || !status) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_INPUT",
            message: "Thiếu thông tin cần thiết để cập nhật trạng thái"
          }
        });
      }
      
      // Xác thực trạng thái hợp lệ
      const validStatuses: WithdrawalStatusType[] = ["Pending", "Processing", "Completed", "Rejected", "Cancelled"];
      if (!validStatuses.includes(status as WithdrawalStatusType)) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_STATUS",
            message: "Trạng thái không hợp lệ"
          }
        });
      }
      
      // Cập nhật trạng thái yêu cầu rút tiền cho KOL/VIP
      const updatedWithdrawal = await storage.updateKolVipWithdrawalStatus(
        affiliateId,
        requestTime,
        status as WithdrawalStatusType
      );
      
      if (!updatedWithdrawal) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "WITHDRAWAL_NOT_FOUND",
            message: "Không tìm thấy yêu cầu rút tiền"
          }
        });
      }
      
      // Gửi webhook khi cập nhật trạng thái (nếu cần)
      try {
        const webhookUrls = [
          "https://auto.autogptvn.com/webhook-test/cap-nhat-trang-thai-rut-tien",
          "https://auto.autogptvn.com/webhook/cap-nhat-trang-thai-rut-tien"
        ];
        
        // Tìm KOL/VIP để lấy thông tin đầy đủ
        const kolVipData = await storage.getKolVipAffiliateByAffiliateId(affiliateId);
        
        const webhookPayload = {
          affiliate_id: affiliateId,
          full_name: kolVipData?.full_name || "Unknown",
          email: kolVipData?.email || "Unknown",
          amount_requested: updatedWithdrawal.amount,
          request_time: requestTime,
          previous_status: req.body.previous_status || "Pending",
          new_status: status,
          updated_by: req.user?.username || "admin",
          updated_at: new Date().toISOString(),
          note: note || "",
          type: "KOL_VIP"
        };
        
        // Gửi webhook không đồng bộ tới tất cả các URL
        Promise.all(webhookUrls.map(url => 
          fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(webhookPayload),
          })
          .then(webhookRes => {
            console.log(`Status update webhook sent to ${url}, status:`, webhookRes.status);
            return webhookRes;
          })
          .catch(webhookErr => {
            console.error(`Error sending status update webhook to ${url}:`, webhookErr);
            return null;
          })
        )).then(results => {
          const successCount = results.filter(res => res && res.ok).length;
          console.log(`Successfully sent status update webhooks to ${successCount}/${webhookUrls.length} endpoints`);
        });
      } catch (webhookError) {
        console.error("Failed to send status update webhook for KOL/VIP:", webhookError);
      }
      
      // Lấy thông tin KOL/VIP mới nhất sau khi cập nhật
      const kolVipData = await storage.getKolVipAffiliateByAffiliateId(affiliateId);
      
      res.status(200).json({
        status: "success",
        data: {
          message: `Trạng thái yêu cầu rút tiền đã được cập nhật thành ${status}`,
          withdrawal: {
            affiliate_id: affiliateId,
            full_name: kolVipData?.full_name || "Unknown",
            amount: updatedWithdrawal.amount,
            request_time: requestTime,
            status: updatedWithdrawal.status,
            updated_at: new Date().toISOString()
          },
          // Thêm thông tin cập nhật về số dư để frontend biết
          balance_update: {
            remaining_balance: kolVipData?.remaining_balance || 0,
            received_balance: kolVipData?.received_balance || 0,
            paid_balance: kolVipData?.paid_balance || 0
          },
          // Thêm trạng thái mới của KOL/VIP để frontend có thể cập nhật toàn bộ dữ liệu nếu cần
          kolVip: kolVipData
        }
      });
    } catch (error) {
      console.error("Error updating KOL/VIP withdrawal status:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi cập nhật trạng thái yêu cầu rút tiền",
          details: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }
  });

  // POST /api/kol/:kolId/scan-card - API cho chức năng quét card visit
  app.post("/api/kol/:kolId/scan-card", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      const { 
        image_base64, 
        contact_name, 
        company, 
        position, 
        phone, 
        email, 
        note,
        confirm_scan // Thêm tham số confirm_scan để biết người dùng đã xác nhận
      } = req.body;

      // Validate dữ liệu
      if (!image_base64) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_IMAGE",
            message: "Không tìm thấy hình ảnh"
          }
        });
      }

      // Nếu người dùng đã xác nhận dữ liệu quét và cung cấp contact_name và phone
      if (confirm_scan && contact_name && phone) {
        // Tạo một liên hệ mới từ dữ liệu người dùng xác nhận
        const contactData = {
          kol_id: kolId,
          contact_name,
          company: company || null,
          position: position || null,
          phone,
          email: email || null,
          status: "Mới nhập" as CustomerStatusType,
          note: note || null,
          // Lưu ảnh card visit
          image_url: `data:image/jpeg;base64,${image_base64}`
        };

        // Thêm liên hệ mới vào cơ sở dữ liệu
        const newContact = await storage.addKolVipContact(kolId, contactData);
        console.log("Thêm contact mới từ card visit đã xác nhận cho KOL/VIP", kolId);

        return res.status(201).json({
          status: "success",
          data: {
            message: "Đã thêm liên hệ mới thành công",
            contact: newContact
          }
        });
      }

      // Sử dụng OCR để trích xuất thông tin từ card visit
      try {
        console.log("Bắt đầu xử lý ảnh card visit với OCR...");
        
        // Sử dụng API Tesseract.js v6.0.1
        console.log("Chuẩn bị thực hiện OCR...");
        const { recognize } = await import('tesseract.js');
        
        // Sử dụng hàm recognize trực tiếp (API mới của v6.0.1)
        console.log("Đang thực hiện OCR với recognize...");
        const { data } = await recognize(
          `data:image/jpeg;base64,${image_base64}`,
          'eng+vie'
        );
        console.log("OCR hoàn thành");
        
        // Phân tích văn bản trích xuất
        const extractedText = data.text;
        console.log("Văn bản trích xuất: ", extractedText.substring(0, 100) + "...");
        
        // Trích xuất thông tin liên hệ
        const nameExtracted = extractNameFromText(extractedText);
        const phoneExtracted = extractPhoneFromText(extractedText);
        const emailExtracted = extractEmailFromText(extractedText);
        const companyExtracted = extractCompanyFromText(extractedText);
        const positionExtracted = extractPositionFromText(extractedText);
        
        // Trả về kết quả
        res.status(200).json({
          status: "success",
          data: {
            contact_data: {
              contact_name: nameExtracted || "",
              phone: phoneExtracted || "",
              email: emailExtracted || "",
              company: companyExtracted || "",
              position: positionExtracted || "",
              note: ""
            },
            raw_text: extractedText,
            image_preview: `data:image/jpeg;base64,${image_base64}`,
            message: "Đã trích xuất thông tin từ card visit. Vui lòng xác nhận và chỉnh sửa nếu cần."
          }
        });
      } catch (ocrError) {
        console.error("Lỗi OCR:", ocrError);
        
        // Nếu OCR lỗi, trả về form trống để người dùng nhập thủ công
        const emptyContactData = {
          contact_name: "",
          company: "",
          position: "",
          phone: "",
          email: "",
          note: ""
        };

        res.status(200).json({
          status: "success",
          data: {
            contact_data: emptyContactData,
            image_preview: `data:image/jpeg;base64,${image_base64}`,
            raw_text: "Không thể trích xuất văn bản. Lỗi OCR.",
            message: "Không thể trích xuất thông tin tự động. Vui lòng nhập thủ công."
          }
        });
      }
    } catch (error) {
      console.error("Error processing business card:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi xử lý card visit"
        }
      });
    }
  });

// Hàm phụ trợ để trích xuất thông tin từ văn bản OCR
function extractNameFromText(text: string): string | null {
  // Tìm kiếm dòng có thể là tên người (thường là dòng ngắn ở đầu card)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Ưu tiên 2-3 dòng đầu tiên và tìm dòng có thể là tên người
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i].trim();
    
    // Tên người thường ngắn gọn và không chứa ký tự đặc biệt
    if (line.length > 2 && line.length < 30 && 
        !line.includes('@') && 
        !line.match(/\d{5,}/) && // Không chứa nhiều số liền nhau
        !line.includes('http') &&
        !line.toLowerCase().includes('company')) {
      return line;
    }
  }
  
  return null;
}

function extractPhoneFromText(text: string): string | null {
  // Tìm kiếm số điện thoại
  const phoneRegex = /(\+?84|0)[-\s.]?(\d{2,3})[-\s.]?(\d{3,4})[-\s.]?(\d{3,4})/g;
  const phoneMatches = text.match(phoneRegex);
  
  return phoneMatches ? phoneMatches[0].replace(/[-\s.]/g, '') : null;
}

function extractEmailFromText(text: string): string | null {
  // Tìm kiếm địa chỉ email
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const emailMatches = text.match(emailRegex);
  
  return emailMatches ? emailMatches[0] : null;
}

function extractCompanyFromText(text: string): string | null {
  // Tìm kiếm tên công ty
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Tìm dòng có thể chứa tên công ty
  for (const line of lines) {
    const lowercaseLine = line.toLowerCase();
    if (
      (lowercaseLine.includes('company') || 
       lowercaseLine.includes('co.') || 
       lowercaseLine.includes('ltd') || 
       lowercaseLine.includes('inc') || 
       lowercaseLine.includes('corporation') ||
       lowercaseLine.includes('jsc') ||
       lowercaseLine.includes('group') ||
       lowercaseLine.includes('cty') ||
       lowercaseLine.includes('công ty')) && 
      line.length > 5
    ) {
      return line;
    }
  }
  
  return null;
}

function extractPositionFromText(text: string): string | null {
  // Tìm kiếm vị trí công việc
  const positionKeywords = [
    'ceo', 'director', 'manager', 'giám đốc', 'trưởng phòng', 
    'phó phòng', 'leader', 'chuyên viên', 'staff', 'nhân viên'
  ];
  
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    const lowercaseLine = line.toLowerCase();
    for (const keyword of positionKeywords) {
      if (lowercaseLine.includes(keyword) && line.length < 50) {
        return line;
      }
    }
  }
  
  return null;
}
}