import { Router, Request, Response, NextFunction } from "express";
import type { IStorage } from "./storage";
import { authenticateUser } from "./routes";
import { KolContact, KolVipAffiliate, KolVipLevelType, MonthlyKpi } from "@shared/schema";
import { hashPassword } from "./auth";

/**
 * Thiết lập routes quản lý KOL/VIP
 * @param app Express app
 * @param storage Storage instance
 */
export function setupKolVipRoutes(app: Router, storage: IStorage) {
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

    // Kiểm tra role KOL_VIP
    if (req.user.role !== "KOL_VIP" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        status: "error",
        error: {
          code: "FORBIDDEN",
          message: "Bạn không có quyền truy cập tài nguyên KOL/VIP"
        }
      });
    }

    // Tìm thông tin KOL/VIP
    const kolVip = await storage.getKolVipAffiliateByUserId(req.user.id);
    if (!kolVip && req.user.role === "KOL_VIP") {
      return res.status(404).json({
        status: "error",
        error: {
          code: "KOL_NOT_FOUND",
          message: "Không tìm thấy thông tin KOL/VIP của bạn"
        }
      });
    }

    // Thêm thông tin KOL/VIP vào request để các middleware sau có thể sử dụng
    req.kolVip = kolVip;
    next();
  };

  // Đảm bảo KOL/VIP chỉ truy cập dữ liệu của chính mình
  const ensureOwnKolVipData = (req: Request, res: Response, next: NextFunction) => {
    const requestedKolId = req.params.kolId || req.body.kolId;
    
    // Admin có thể truy cập tất cả
    if (req.user?.role === "ADMIN") {
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
      const contacts = await storage.getKolVipContacts(kolId);

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
      const contactData: KolContact = req.body;

      // Đảm bảo kolId trong contact khớp với kolId trong params
      contactData.kol_id = kolId;

      // Đảm bảo trường ngày tháng
      contactData.created_at = contactData.created_at || new Date().toISOString();
      contactData.updated_at = new Date().toISOString();

      // Đảm bảo trạng thái mặc định
      contactData.status = contactData.status || "Mới nhập";

      const newContact = await storage.addKolVipContact(kolId, contactData);

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
          message: "Lỗi khi thêm contact mới"
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
  app.post("/api/admin/kol/create", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Kiểm tra quyền admin
      if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
          status: "error",
          error: {
            code: "FORBIDDEN",
            message: "Chỉ admin mới có quyền tạo KOL/VIP"
          }
        });
      }

      const { username, affiliate_data } = req.body;

      // Validate dữ liệu
      if (!username || !affiliate_data) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_DATA",
            message: "Thiếu thông tin cần thiết"
          }
        });
      }

      // Tạo user mới với role KOL_VIP và mật khẩu mặc định đã băm
      const defaultPassword = "color1234@";
      // Băm mật khẩu mặc định trước khi lưu
      const hashedPassword = await hashPassword(defaultPassword);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role: "KOL_VIP",
        is_first_login: true
      });

      // Tạo KOL/VIP affiliate
      // Tạo mã affiliate_id nếu chưa có
      const kolVipData = {
        user_id: user.id,
        ...affiliate_data,
        // Đảm bảo có affiliate_id, nếu không tạo mới với format "KOL" + user.id
        affiliate_id: affiliate_data.affiliate_id || `KOL${user.id}`,
        level: affiliate_data.level || "LEVEL_1",
        current_base_salary: affiliate_data.level === "LEVEL_3" ? 15000000 : 
                            affiliate_data.level === "LEVEL_2" ? 10000000 : 5000000
      };

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
  app.get("/api/admin/kol", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Kiểm tra quyền admin
      if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
          status: "error",
          error: {
            code: "FORBIDDEN",
            message: "Chỉ admin mới có quyền xem danh sách KOL/VIP"
          }
        });
      }

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
  app.post("/api/admin/kol/:kolId/update-level", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Kiểm tra quyền admin
      if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
          status: "error",
          error: {
            code: "FORBIDDEN",
            message: "Chỉ admin mới có quyền cập nhật level KOL/VIP"
          }
        });
      }

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

  // POST /api/kol/:kolId/scan-card - API cho chức năng quét card visit
  app.post("/api/kol/:kolId/scan-card", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      const { image_base64 } = req.body;

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

      // TODO: Tích hợp với OpenAI Vision API để nhận dạng thông tin từ card visit
      
      // Trả về kết quả giả lập trước mắt
      const scannedData = {
        contact_name: "Tên từ card visit",
        company: "Tên công ty",
        position: "Chức vụ",
        phone: "0123456789",
        email: "email@example.com"
      };

      res.status(200).json({
        status: "success",
        data: scannedData
      });
    } catch (error) {
      console.error("Error scanning business card:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi quét card visit"
        }
      });
    }
  });
}