import { Express, Request, Response, NextFunction } from "express";
import { IStorage } from "./storage";
import tesseract from "tesseract.js";
import fs from "fs";

// Middleware xác thực người dùng
const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      status: "error",
      error: {
        code: "UNAUTHORIZED",
        message: "Bạn cần đăng nhập để thực hiện chức năng này"
      }
    });
  }
  next();
};

// Hàm lấy phân tích ảnh từ YesScale API
const fetchYesScaleAnalysis = async (imageData: string) => {
  if (!process.env.YESCALE_API_KEY) {
    throw new Error("YESCALE_API_KEY không được cấu hình");
  }
  
  try {
    // Giả lập kết quả phân tích cho mục đích thử nghiệm
    return {
      name: "Nguyễn Văn A",
      company: "ColorMedia",
      title: "Marketing Manager",
      phone: "0987654321",
      email: "nguyenvana@colormedia.vn",
      address: "123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh"
    };
  } catch (error) {
    console.error("Error calling YesScale API:", error);
    throw error;
  }
};

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

  // POST /api/kol/:kolId/transactions - Thêm mới giao dịch tài chính
  app.post("/api/kol/:kolId/transactions", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      const { transaction_type, amount, description, reference_id } = req.body;
      
      // Xác thực đầu vào
      if (!transaction_type || !amount) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_INPUT",
            message: "Thiếu thông tin giao dịch: loại giao dịch và số tiền là bắt buộc"
          }
        });
      }
      
      // Lấy thông tin số dư hiện tại
      const kolVip = await storage.getKolVipByAffiliateId(kolId);
      if (!kolVip) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "KOL_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP"
          }
        });
      }
      
      // Tạo giao dịch mới
      const newTransaction = await storage.addKolVipTransaction({
        kol_id: kolId,
        transaction_type,
        amount: Number(amount),
        description: description || "",
        reference_id,
        created_at: new Date().toISOString(),
        balance_after: (kolVip.remaining_balance || 0) + (transaction_type !== "WITHDRAWAL" && transaction_type !== "TAX" ? Number(amount) : 0)
      });
      
      // Trả về kết quả
      res.status(201).json({
        status: "success",
        data: newTransaction
      });
    } catch (error) {
      console.error("Error adding transaction:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi thêm giao dịch tài chính"
        }
      });
    }
  });
  
  // GET /api/kol/:kolId/transactions - Lấy danh sách giao dịch tài chính
  app.get("/api/kol/:kolId/transactions", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      const { from, to, type } = req.query;
      
      // Xử lý các tham số lọc
      let startDate: Date | undefined = undefined;
      let endDate: Date | undefined = undefined;
      
      if (from) {
        startDate = new Date(from as string);
      }
      
      if (to) {
        endDate = new Date(to as string);
      }
      
      // Lấy danh sách giao dịch
      const transactions = await storage.getKolVipTransactionHistory(kolId, startDate, endDate);
      
      // Lọc theo loại giao dịch nếu có
      const filteredTransactions = type 
        ? transactions.filter(t => t.transaction_type === type)
        : transactions;
      
      // Trả về kết quả
      res.status(200).json({
        status: "success",
        data: filteredTransactions
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi lấy danh sách giao dịch tài chính"
        }
      });
    }
  });

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
      const updatedKolVip = await storage.getKolVipByAffiliateId(kolId);
      
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
      if (status && !["Mới nhập", "Đang tư vấn", "Chờ phản hồi", "Đã chốt hợp đồng", "Không tiềm năng"].includes(status)) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_STATUS",
            message: "Trạng thái không hợp lệ"
          }
        });
      }
      
      // Tạo đối tượng cập nhật
      const updateData: any = {
        status: status,
        note: note,
        updated_at: new Date().toISOString()
      };
      
      if (contact_name !== undefined) updateData.contact_name = contact_name;
      if (company !== undefined) updateData.company = company;
      if (position !== undefined) updateData.position = position;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (meeting_time !== undefined) updateData.meeting_time = meeting_time;
      
      // Cập nhật liên hệ
      await storage.updateKolVipContactStatus(kolId, parseInt(contactId), updateData);
      
      // Lấy danh sách liên hệ mới nhất
      const updatedContacts = await storage.getKolVipContacts(kolId);
      
      // Tìm liên hệ vừa cập nhật trong danh sách
      const updatedContact = updatedContacts.find(c => c.id === parseInt(contactId));
      
      if (!updatedContact) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "CONTACT_NOT_FOUND",
            message: "Không tìm thấy liên hệ sau khi cập nhật"
          }
        });
      }
      
      res.status(200).json({
        status: "success",
        data: updatedContact
      });
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi cập nhật liên hệ"
        }
      });
    }
  });

  // POST /api/kol/:kolId/contacts/:contactId/contract - Thêm hợp đồng cho liên hệ
  const handleContractUpdate = async (req: Request, res: Response) => {
    try {
      const { kolId, contactId } = req.params;
      const { contractValue, note } = req.body;
      
      // Validate dữ liệu
      if (!contractValue || typeof contractValue !== 'number' || contractValue <= 0) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_CONTRACT_VALUE",
            message: "Giá trị hợp đồng không hợp lệ"
          }
        });
      }
      
      // Tính hoa hồng (3%)
      const commissionRate = 0.03; // 3%
      const commission = contractValue * commissionRate;
      
      // Cập nhật trạng thái và thêm thông tin hợp đồng
      const contactData = {
        status: "Đã chốt hợp đồng",
        contract_value: contractValue,
        commission: commission,
        contract_date: new Date().toISOString(),
        contract_note: note || "",
        updated_at: new Date().toISOString()
      };
      
      // Cập nhật liên hệ với thông tin hợp đồng
      await storage.updateKolVipContactWithContract(kolId, parseInt(contactId), contactData);
      
      // Lấy danh sách liên hệ mới nhất
      const updatedContacts = await storage.getKolVipContacts(kolId);
      
      // Tìm liên hệ vừa cập nhật trong danh sách
      const updatedContact = updatedContacts.find(c => c.id === parseInt(contactId));
      
      if (!updatedContact) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "CONTACT_NOT_FOUND",
            message: "Không tìm thấy liên hệ sau khi cập nhật"
          }
        });
      }
      
      // Thêm giao dịch hoa hồng
      if (commission > 0) {
        try {
          await storage.addKolVipTransaction({
            kol_id: kolId,
            transaction_type: "COMMISSION",
            amount: commission,
            description: `Hoa hồng từ hợp đồng với ${updatedContact.contact_name}`,
            reference_id: `contract_${contactId}`,
            created_at: new Date().toISOString(),
            balance_after: 0 // Sẽ được tính toán trong addKolVipTransaction
          });
        } catch (transactionError) {
          console.error("Error adding commission transaction:", transactionError);
          // Vẫn tiếp tục xử lý, không return để không ảnh hưởng đến việc cập nhật hợp đồng
        }
      }
      
      // Lấy thông tin KOL/VIP mới nhất sau khi cập nhật
      const updatedKolVip = await storage.getKolVipByAffiliateId(kolId);
      
      res.status(200).json({
        status: "success",
        data: {
          contact: updatedContact,
          kol: updatedKolVip,
          commission: commission
        }
      });
    } catch (error) {
      console.error("Error updating contract:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi cập nhật hợp đồng"
        }
      });
    }
  };

  app.post("/api/kol/:kolId/contacts/:contactId/contract", authenticateUser, requireKolVip, ensureOwnKolVipData, handleContractUpdate);

  // POST /api/kol/:kolId/scan-card - Quét và xử lý ảnh card visit
  app.post("/api/kol/:kolId/scan-card", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      const { image_data, create_contact } = req.body;
      
      // Validate dữ liệu
      if (!image_data) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_INPUT",
            message: "Dữ liệu ảnh là bắt buộc"
          }
        });
      }
      
      console.log("Processing business card image...");
      
      // Xử lý dữ liệu ảnh
      let processedText = "";
      let extractedData = {};
      
      try {
        // Sử dụng YesScale API nếu có thể
        if (process.env.YESCALE_API_KEY) {
          try {
            console.log("Using YesScale API for card analysis");
            const yesScaleResult = await fetchYesScaleAnalysis(image_data);
            
            if (yesScaleResult) {
              extractedData = {
                contact_name: yesScaleResult.name || "",
                company: yesScaleResult.company || "",
                position: yesScaleResult.title || "",
                phone: yesScaleResult.phone || "",
                email: yesScaleResult.email || "",
                note: yesScaleResult.address || ""
              };
              
              // Chuyển đổi dữ liệu thành văn bản để lưu trữ
              processedText = `Name: ${yesScaleResult.name || ''}\n` +
                             `Company: ${yesScaleResult.company || ''}\n` +
                             `Title: ${yesScaleResult.title || ''}\n` +
                             `Phone: ${yesScaleResult.phone || ''}\n` +
                             `Email: ${yesScaleResult.email || ''}\n` +
                             `Address: ${yesScaleResult.address || ''}`;
            }
          } catch (yesScaleError) {
            console.error("Error using YesScale API, falling back to Tesseract:", yesScaleError);
          }
        }
        
        // Fallback sang Tesseract nếu YesScale không có sẵn hoặc có lỗi
        if (!processedText) {
          console.log("Using Tesseract for OCR processing");
          
          // Cắt chuỗi Base64 nếu cần
          let base64Data = image_data;
          if (base64Data.includes("base64,")) {
            base64Data = base64Data.split("base64,")[1];
          }
          
          // Tạo file tạm thời
          const tempFilePath = `./temp_card_${Date.now()}.jpg`;
          fs.writeFileSync(tempFilePath, Buffer.from(base64Data, 'base64'));
          
          try {
            // Thực hiện OCR với tiếng Việt
            const worker = await tesseract.createWorker('vie');
            const result = await worker.recognize(tempFilePath);
            processedText = result.data.text;
            await worker.terminate();
            
            // Xóa file tạm
            fs.unlinkSync(tempFilePath);
            
            // Trích xuất thông tin từ văn bản
            extractedData = extractContactInfo(processedText);
          } catch (ocrError) {
            console.error("Error performing OCR with Tesseract:", ocrError);
            
            // Xóa file tạm nếu còn tồn tại
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
            
            throw ocrError;
          }
        }
      } catch (processingError) {
        console.error("Error processing image:", processingError);
        return res.status(500).json({
          status: "error",
          error: {
            code: "IMAGE_PROCESSING_ERROR",
            message: "Lỗi khi xử lý ảnh"
          }
        });
      }
      
      // Nếu yêu cầu tạo liên hệ ngay lập tức
      if (create_contact && Object.keys(extractedData).length > 0) {
        try {
          // Đảm bảo có tên và số điện thoại
          if ((extractedData as any).contact_name && (extractedData as any).phone) {
            // Tạo đối tượng contact mới
            const contactData = {
              kol_id: kolId,
              ...(extractedData as any),
              status: "Mới nhập",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const newContact = await storage.addKolVipContact(kolId, contactData);
            
            // Lấy thông tin KOL/VIP mới nhất sau khi thêm liên hệ
            const updatedKolVip = await storage.getKolVipByAffiliateId(kolId);
            
            return res.status(201).json({
              status: "success",
              data: {
                contact: newContact,
                kol: updatedKolVip,
                processed_text: processedText
              }
            });
          }
        } catch (contactCreationError) {
          console.error("Error creating contact from card data:", contactCreationError);
        }
      }
      
      // Trả về dữ liệu đã xử lý để người dùng xác nhận
      res.status(200).json({
        status: "success",
        data: {
          processed_text: processedText,
          contact_data: extractedData
        }
      });
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

  // Hàm trích xuất thông tin liên hệ từ văn bản OCR
  function extractContactInfo(text: string) {
    // Mã tìm kiếm cơ bản
    const nameMatch = text.match(/(?:[Tt]ên|[Nn]ame)[:\s]+([^\n\r]+)/i) || 
                    text.match(/^([A-ZĐÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸ ]+)(?:\s|\n)/);
    const companyMatch = text.match(/(?:[Cc]ông\s*ty|[Cc]ompany)[:\s]+([^\n\r]+)/i);
    const positionMatch = text.match(/(?:[Cc]hức\s*vụ|[Pp]osition|[Tt]itle)[:\s]+([^\n\r]+)/i);
    const phoneMatch = text.match(/(?:[ĐđTt]iện\s*thoại|[Pp]hone|[Mm]obile|[Tt]el)[:\s]+([0-9+\s-–—]+)/i) || 
                      text.match(/(?:[0-9]{3,4}[- .]?[0-9]{3,4}[- .]?[0-9]{3,4})/);
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
    
    return {
      contact_name: nameMatch ? nameMatch[1].trim() : "",
      company: companyMatch ? companyMatch[1].trim() : "",
      position: positionMatch ? positionMatch[1].trim() : "",
      phone: phoneMatch ? phoneMatch[1].replace(/[-–—\s]/g, "").trim() : "",
      email: emailMatch ? emailMatch[0].trim() : "",
      note: "Thông tin trích xuất từ card visit"
    };
  }

  // GET /api/kol/:kolId/financial-stats - Lấy thống kê tài chính của KOL/VIP
  app.get("/api/kol/:kolId/financial-stats", authenticateUser, requireKolVip, ensureOwnKolVipData, async (req: Request, res: Response) => {
    try {
      const { kolId } = req.params;
      const { period } = req.query;
      
      // Lấy thông tin KOL/VIP
      const kolVip = await storage.getKolVipByAffiliateId(kolId);
      if (!kolVip) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "KOL_NOT_FOUND",
            message: "Không tìm thấy thông tin KOL/VIP"
          }
        });
      }
      
      // Xác định khoảng thời gian
      let start: Date;
      let end: Date = new Date();
      
      if (period === "week") {
        // 7 ngày gần nhất
        start = new Date();
        start.setDate(end.getDate() - 7);
      } else if (period === "month") {
        // 30 ngày gần nhất 
        start = new Date();
        start.setDate(end.getDate() - 30);
      } else if (period === "year") {
        // 365 ngày gần nhất
        start = new Date();
        start.setDate(end.getDate() - 365);
      } else {
        // Mặc định: tất cả dữ liệu
        start = new Date(0); // Từ đầu thời gian
      }
      
      // Lấy danh sách liên hệ
      const contacts = await storage.getKolVipContacts(kolId);
      
      // Lọc các liên hệ đã chốt hợp đồng trong khoảng thời gian
      const contractsInPeriod = contacts.filter((contact: any) => {
        return contact.status === "Đã chốt hợp đồng" && 
              contact.contract_date && 
              new Date(contact.contract_date) >= start && 
              new Date(contact.contract_date) <= end;
      });
      
      // Tính tổng giá trị hợp đồng và hoa hồng trong khoảng thời gian
      const totalContractValue = contractsInPeriod.reduce((sum, c) => sum + (c.contract_value || 0), 0);
      const totalCommission = contractsInPeriod.reduce((sum, c) => sum + (c.commission || 0), 0);
      
      // Tính lương cơ bản dựa trên cấp độ
      const baseSalary = (() => {
        switch(kolVip.level) {
          case "LEVEL_1": return 5000000; // Fresher - 5M
          case "LEVEL_2": return 10000000; // Advanced - 10M
          case "LEVEL_3": return 15000000; // Elite - 15M
          default: return 0;
        }
      })();
      
      // Lấy lịch sử giao dịch
      const transactionHistory = await storage.getKolVipTransactionHistory(kolId, start, end);
      
      res.status(200).json({
        status: "success",
        data: {
          kolVip,
          period: {
            start: start.toISOString(),
            end: end.toISOString()
          },
          financial: {
            currentBalance: kolVip.remaining_balance || 0,
            baseSalary,
            totalContractValue,
            totalCommission,
            transactions: transactionHistory
          },
          contracts: contractsInPeriod
        }
      });
    } catch (error) {
      console.error("Error fetching financial stats:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi lấy thông tin tài chính"
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
      const kolVip = await storage.getKolVipByAffiliateId(kolId);
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
      
      // Tính số liên hệ tiềm năng - bao gồm "Đang tư vấn", "Chờ phản hồi" và "Đã chốt hợp đồng"
      const potentialContacts = monthlyContacts.filter((c: any) => 
        c.status === "Đang tư vấn" || c.status === "Chờ phản hồi" || c.status === "Đã chốt hợp đồng"
      ).length;
      
      console.log(`Tính KPI cho KOL ${kolId} - tháng ${targetMonth}/${targetYear}:`);
      console.log(`- Tổng số liên hệ: ${monthlyContactsCount}`);
      console.log(`- Số liên hệ tiềm năng: ${potentialContacts}`);
      console.log(`- Trong đó, số liên hệ "Chờ phản hồi": ${monthlyContacts.filter(c => c.status === "Chờ phản hồi").length}`);
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