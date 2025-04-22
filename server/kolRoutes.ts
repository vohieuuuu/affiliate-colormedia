// Sao chép của file kolRoutes.ts với sửa đổi cho API kpi-stats
import { Express, Request, Response, NextFunction } from "express";
import { IStorage } from "./storage";
import { authenticateUser } from "./routes";
import { MonthlyKpi, KolVipLevelType, KolContact } from "@shared/schema";
import * as tesseract from "tesseract.js";
import path from "path";
import fs from "fs";

// Đường dẫn tới file dữ liệu đã train cho Tesseract
const TESSERACT_VIE_PATH = path.join(process.cwd(), "vie.traineddata");
const TESSERACT_ENG_PATH = path.join(process.cwd(), "eng.traineddata");

/**
 * Thiết lập routes quản lý KOL/VIP
 * @param app Express app
 * @param storage Storage instance
 */
export function setupKolVipRoutes(app: Express, storage: IStorage) {
  // Middleware để kiểm tra và thêm thông tin KOL/VIP vào request
  app.use("/api/kol/*", async (req: Request, res: Response, next: NextFunction) => {
    // Bỏ qua các yêu cầu không cần xác thực
    if (!req.user) {
      return next();
    }
    
    // Thêm thông tin KOL/VIP vào request nếu có
    try {
      const kolVip = await storage.getKolVipAffiliateByUserId(req.user.id);
      if (kolVip) {
        (req as any).kolVip = kolVip;
      }
    } catch (error) {
      console.error("Error getting KOL/VIP info for middleware:", error);
    }
    
    next();
  });

  // Middleware: Kiểm tra xem người dùng có phải là KOL/VIP không
  const requireKolVip = async (req: Request, res: Response, next: NextFunction) => {
    // Nếu đã xác thực, nhưng không có role KOL_VIP
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        status: "error",
        error: {
          code: "UNAUTHORIZED",
          message: "Bạn cần đăng nhập để thực hiện chức năng này"
        }
      });
    }
    
    const role = user.role;
    const normalizedRole = role === "KOL" || role === "VIP" ? "KOL_VIP" : role;
    const isKolVip = normalizedRole === "KOL_VIP";
    const isAdmin = role === "ADMIN";
    
    console.log("requireKolVip checking: ", { role, normalizedRole, isKolVip, isAdmin });
    
    if (!isKolVip && !isAdmin) {
      return res.status(403).json({
        status: "error",
        error: {
          code: "FORBIDDEN",
          message: "Bạn không có quyền truy cập chức năng này"
        }
      });
    }
    
    // Nếu là admin, không cần kiểm tra thêm
    if (isAdmin) {
      return next();
    }
    
    // Nếu là KOL/VIP, kiểm tra xem đã có thông tin KOL/VIP chưa
    if (!req.kolVip) {
      const kolVip = await storage.getKolVipAffiliateByUserId(user.id);
      
      if (!kolVip) {
        return res.status(404).json({
          status: "error", 
          error: {
            code: "KOL_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP của bạn"
          }
        });
      }
      
      (req as any).kolVip = kolVip;
    }
    
    next();
  };
  
  // Middleware: Đảm bảo KOL/VIP chỉ có thể truy cập dữ liệu của chính mình
  const ensureOwnKolVipData = (req: Request, res: Response, next: NextFunction) => {
    const { kolId } = req.params;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        status: "error",
        error: {
          code: "UNAUTHORIZED", 
          message: "Bạn cần đăng nhập để thực hiện chức năng này"
        }
      });
    }
    
    const role = user.role;
    const normalizedRole = role === "KOL" || role === "VIP" ? "KOL_VIP" : role;
    const isAdmin = role === "ADMIN";
    
    console.log("ensureOwnKolVipData checking: ", { role, normalizedRole, isAdmin });
    
    // Admin có thể truy cập mọi dữ liệu
    if (isAdmin) {
      return next();
    }
    
    // Nếu là KOL/VIP, kiểm tra xem kolId có phải của họ không
    if (!req.kolVip) {
      return res.status(403).json({
        status: "error",
        error: {
          code: "FORBIDDEN",
          message: "Bạn không có quyền truy cập dữ liệu này"
        }
      });
    }
    
    const kolVip = req.kolVip;
    
    if (kolVip.affiliate_id !== kolId && "KOL" + user.id !== kolId) {
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

  // GET /api/kol/me - Lấy thông tin KOL/VIP hiện tại
  app.get("/api/kol/me", authenticateUser, requireKolVip, async (req: Request, res: Response) => {
    try {
      // Sử dụng thông tin KOL/VIP đã được gắn vào request từ middleware
      // Đảm bảo các thông tin quan trọng luôn trả về
      const kolVip = req.kolVip;
      
      if (!kolVip) {
        return res.status(404).json({
          status: "error", 
          error: {
            code: "KOL_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP của bạn"
          }
        });
      }

      // Trả về thông tin KOL/VIP với định dạng nhất quán
      res.status(200).json({
        status: "success",
        data: kolVip
      });
    } catch (error) {
      console.error("Error getting KOL/VIP info:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi lấy thông tin KOL/VIP"
        }
      });
    }
  });

  // GET /api/kol/:kolId/contacts - Lấy danh sách liên hệ của KOL/VIP
  app.get("/api/kol/:kolId/contacts", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      
      console.log("Getting contacts for KOL/VIP", kolId);
      
      // Lấy danh sách contacts
      const contacts = await storage.getKolVipContacts(kolId);
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
          message: "Lỗi khi lấy danh sách liên hệ"
        }
      });
    }
  });

  // POST /api/kol/:kolId/contacts - Thêm liên hệ mới cho KOL/VIP
  app.post("/api/kol/:kolId/contacts", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      const { 
        contact_name, 
        company, 
        position, 
        phone, 
        email,
        status, 
        note 
      } = req.body;
      
      // Validate dữ liệu
      if (!contact_name || !phone) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_DATA",
            message: "Tên liên hệ và số điện thoại là bắt buộc"
          }
        });
      }
      
      // Tạo đối tượng contact mới
      const contactData = {
        kol_id: kolId,
        contact_name,
        company: company || "",
        position: position || "",
        phone,
        email: email || "",
        status: status || "Mới nhập",
        note: note || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const newContact = await storage.addKolVipContact(kolId, contactData);
      
      // Lấy thông tin KOL/VIP mới nhất sau khi thêm liên hệ
      const updatedKolVip = await storage.getKolVipAffiliateByAffiliateId(kolId);
      
      res.status(201).json({
        status: "success",
        data: {
          contact: newContact,
          kol: updatedKolVip
        }
      });
    } catch (error) {
      console.error("Error adding KOL/VIP contact:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi thêm liên hệ mới"
        }
      });
    }
  });

  // PUT /api/kol/:kolId/contacts/:contactId - Cập nhật thông tin liên hệ
  app.put("/api/kol/:kolId/contacts/:contactId", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId, contactId } = req.params;
      const {
        contact_name,
        company,
        position,
        phone,
        email,
        status,
        note,
        meeting_time
      } = req.body;
      
      // Kiểm tra trạng thái hợp lệ
      const validStatuses = ["Mới nhập", "Đang tư vấn", "Chờ phản hồi", "Đã chốt hợp đồng", "Không tiềm năng"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_STATUS",
            message: "Trạng thái không hợp lệ"
          }
        });
      }
      
      // Cập nhật thông tin liên hệ
      const updatedContact = await storage.updateKolVipContactStatus(
        kolId,
        parseInt(contactId),
        {
          contact_name,
          company,
          position,
          phone,
          email,
          status,
          note,
          meeting_time,
          updated_at: new Date().toISOString()
        }
      );
      
      if (!updatedContact) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "CONTACT_NOT_FOUND",
            message: "Không tìm thấy liên hệ"
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
      console.error("Error updating KOL/VIP contact:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi cập nhật thông tin liên hệ"
        }
      });
    }
  });

  // POST /api/kol/:kolId/contacts/:contactId/contract - Thêm thông tin hợp đồng cho liên hệ
  app.post("/api/kol/:kolId/contacts/:contactId/contract", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId, contactId } = req.params;
      const { contractValue, note } = req.body;
      
      // Validate dữ liệu
      if (!contractValue || isNaN(parseFloat(contractValue))) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_DATA",
            message: "Giá trị hợp đồng không hợp lệ"
          }
        });
      }
      
      // Tính hoa hồng 3%
      const contractValueNum = parseFloat(contractValue);
      const commission = contractValueNum * 0.03;
      
      // Cập nhật thông tin hợp đồng cho liên hệ
      const updatedContact = await storage.updateKolVipContactWithContract(
        kolId,
        parseInt(contactId),
        {
          status: "Đã chốt hợp đồng",
          contract_value: contractValueNum,
          commission,
          note: note || "",
          updated_at: new Date().toISOString()
        }
      );
      
      if (!updatedContact) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "CONTACT_NOT_FOUND",
            message: "Không tìm thấy liên hệ"
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

  // POST /api/kol/:kolId/scan-card - Quét và xử lý card visit 
  app.post("/api/kol/:kolId/scan-card", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      const { image_base64 } = req.body;
      
      if (!image_base64) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_DATA",
            message: "Dữ liệu ảnh không hợp lệ"
          }
        });
      }
      
      // Xử lý ảnh base64 để lấy dữ liệu bỏ phần header
      const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      
      console.log("Đang xử lý OCR cho ảnh card visit...");
      
      // Sử dụng Tesseract để nhận dạng văn bản
      const tesseractWorker = await tesseract.createWorker("vie+eng");
      
      // Cấu hình parameters
      await tesseractWorker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.@-:,/\\[]()& ',
      });
      
      // Nhận dạng văn bản từ ảnh
      const { data } = await tesseractWorker.recognize(buffer);
      const rawText = data.text;
      
      console.log("Kết quả OCR:", rawText);
      
      // Xử lý trích xuất thông tin liên hệ từ văn bản
      const contactData = extractContactInfo(rawText);
      
      // Giải phóng worker
      await tesseractWorker.terminate();
      
      // Trả về kết quả
      res.status(200).json({
        status: "success",
        data: {
          raw_text: rawText,
          contact_data: contactData
        }
      });
    } catch (error) {
      console.error("Error processing business card OCR:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "OCR_PROCESSING_ERROR",
          message: "Lỗi khi xử lý OCR cho card visit"
        }
      });
    }
  });
  
  // Hàm trích xuất thông tin liên hệ từ văn bản OCR
  function extractContactInfo(text: string) {
    // Chuẩn hóa văn bản
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\n+/g, '\n');
    const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Các pattern regex để tìm kiếm
    const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const phonePattern = /[(]?(?:(?:\+|00)84|0)(?:3[2-9]|5[6|8|9]|7[0|6-9]|8[0-6|8|9]|9[0-4|6-9])[0-9]{7,8}[)]?/g;
    const phonePatternAlt = /(?:\+|00)84[0-9]{9,10}|0[0-9]{9,10}/g;
    
    // Trích xuất email
    const emails: string[] = [];
    let email: string | null = null;
    const emailMatches = normalizedText.match(emailPattern);
    if (emailMatches && emailMatches.length > 0) {
      emailMatches.forEach(match => {
        emails.push(match.toLowerCase());
      });
      email = emails[0]; // Lấy email đầu tiên
    }
    
    // Trích xuất số điện thoại
    const phones: string[] = [];
    let phone: string | null = null;
    const phoneMatches = normalizedText.match(phonePattern) || normalizedText.match(phonePatternAlt);
    if (phoneMatches && phoneMatches.length > 0) {
      phoneMatches.forEach(match => {
        // Làm sạch số điện thoại
        const cleanedPhone = match.replace(/[()\s-]/g, '');
        phones.push(cleanedPhone);
      });
      phone = phones[0]; // Lấy số điện thoại đầu tiên
    }
    
    // Xác định tên và công ty
    let contactName = '';
    let company = '';
    let position = '';
    
    // Nếu có ít nhất 2 dòng, giả định dòng đầu tiên là tên, dòng thứ hai là vị trí
    if (lines.length >= 2) {
      // Dòng đầu tiên thường là tên
      contactName = lines[0];
      
      // Dòng 2 có thể là vị trí
      if (lines[1] && !lines[1].includes('@') && !phonePatternAlt.test(lines[1]) && !phonePattern.test(lines[1])) {
        position = lines[1];
      }
      
      // Tìm tên công ty - thường là chữ in hoa hoặc có Ltd, Co., Corp, etc.
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (
          (line.toUpperCase() === line && line.length > 4) || 
          line.includes("LTD") || 
          line.includes("CO") || 
          line.includes("CORP") ||
          line.includes("COMPANY") ||
          line.includes("CÔNG TY") ||
          line.includes("ENTERPRISE") ||
          line.includes("GROUP")
        ) {
          company = line;
          break;
        }
      }
    }
    
    return {
      contact_name: contactName,
      company: company,
      position: position,
      phone: phone,
      email: email
    };
  }
  
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
      
      // Lưu tổng số liên hệ - đây là phần cần sửa để đồng bộ với danh sách liên hệ
      const totalContactsCount = contacts.length;

      // Tính toán thống kê KPI cho tháng và năm được chỉ định
      const currentDate = new Date();
      const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
      const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;

      // Lọc contacts theo tháng và năm để tính các chỉ số KPI theo tháng
      const monthlyContacts = contacts.filter((contact: any) => {
        const createdDate = new Date(contact.created_at);
        return createdDate.getFullYear() === targetYear && createdDate.getMonth() + 1 === targetMonth;
      });

      // Lấy KPI trong lịch sử nếu có
      const kpiHistory = kolVip.kpi_history || [];
      const monthlyKpi = kpiHistory.find(kpi => kpi.year === targetYear && kpi.month === targetMonth);

      // Tính toán các chỉ số KPI trong tháng
      const monthlyContactsCount = monthlyContacts.length;
      const potentialContacts = monthlyContacts.filter((c: any) => 
        c.status !== "Mới nhập" && c.status !== "Không tiềm năng"
      ).length;
      const contractsCount = monthlyContacts.filter((c: any) => c.status === "Đã chốt hợp đồng").length;
      const contractValue = monthlyContacts
        .filter((c: any) => c.status === "Đã chốt hợp đồng")
        .reduce((sum: number, c: any) => sum + (c.contract_value || 0), 0);
      const commission = monthlyContacts
        .filter((c: any) => c.status === "Đã chốt hợp đồng")
        .reduce((sum: number, c: any) => sum + (c.commission || 0), 0);

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

      // Tính toán tiến độ KPI - sử dụng tổng số liên hệ (totalContactsCount)
      const kpiProgress = {
        contacts: {
          current: totalContactsCount, // Sử dụng tổng số liên hệ toàn thời gian
          target: kpiTargets.requiredContacts,
          percentage: Math.min(100, Math.round((totalContactsCount / kpiTargets.requiredContacts) * 100))
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
            totalContacts: totalContactsCount, // Sử dụng tổng số liên hệ
            potentialContacts,
            contractsCount,
            contractValue,
            commission,
            // Thêm lương cơ bản để tính tổng thu nhập
            baseSalary: kolVip.current_base_salary,
            totalIncome: kolVip.current_base_salary + commission
          },
          contacts: monthlyContacts.map((c: any) => ({
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
}