import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { 
  withdrawalRequestPayloadSchema, 
  insertAffiliateSchema, 
  ReferredCustomerSchema, 
  CustomerStatus,
  UserRoleType,
  User,
  Affiliate
} from "@shared/schema";
import { setupDevAuthRoutes } from "./devAuth";

// Extend Express.Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
      affiliate?: Affiliate; // Thêm thuộc tính affiliate
    }
  }
}

// API Token mặc định (sẽ dùng cho xác thực quản trị viên)
const API_TOKEN = "vzzvc36lTcb7Pcean8QwndSX";

// Middleware xác thực Bearer token đơn giản
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({
      status: "error",
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication token is required"
      }
    });
  }

  if (token !== API_TOKEN) {
    return res.status(403).json({
      status: "error",
      error: {
        code: "FORBIDDEN",
        message: "Invalid authentication token"
      }
    });
  }

  next();
}

// Middleware xác thực người dùng dựa trên token
async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({
      status: "error",
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication token is required"
      }
    });
  }

  try {
    // Import cần thiết đối với các môi trường sử dụng database
    if (process.env.USE_DATABASE === "true" || process.env.NODE_ENV === "production") {
      const { db } = await import("./db");
      const { eq } = await import("drizzle-orm");
      const { users } = await import("@shared/schema");

      // Tìm người dùng có token tương ứng
      const [user] = await db.select().from(users).where(eq(users.token, token));
      
      if (!user) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired token"
          }
        });
      }

      // Lưu thông tin người dùng vào request để sử dụng ở các route tiếp theo
      req.user = user;
      next();
    } else {
      // Kiểm tra token trong môi trường phát triển
      // 1. Kiểm tra nếu token là token mặc định (API_TOKEN)
      if (token === API_TOKEN) {
        console.log("DEV MODE: Using default API token");
        return next();
      }
      
      // 2. Kiểm tra token trong danh sách người dùng MemStorage
      console.log("DEV MODE: Checking user auth with token");
      const user = (storage as any).users.find((u: any) => u.token === token);
      
      if (user) {
        console.log(`DEV MODE: User authenticated: ${user.username}`);
        req.user = user;
        return next();
      }
      
      return res.status(401).json({
        status: "error",
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired token"
        }
      });
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      status: "error",
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Authentication service error"
      }
    });
  }
}

// Middleware kiểm tra quyền admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Nếu không có user (môi trường dev) hoặc user có role ADMIN, cho phép truy cập
  if (!req.user || req.user.role === "ADMIN") {
    return next();
  }

  return res.status(403).json({
    status: "error",
    error: {
      code: "FORBIDDEN",
      message: "Administrator privileges required"
    }
  });
}

// Middleware kiểm tra quyền truy cập affiliate
// Đảm bảo affiliate chỉ truy cập dữ liệu của họ
function affiliateAccessControl(req: Request, res: Response, next: NextFunction) {
  // Nếu là admin hoặc không có user (môi trường dev), cho phép truy cập
  if (!req.user || req.user.role === "ADMIN") {
    return next();
  }
  
  // Lấy ID affiliate từ tham số URL (nếu có)
  const affiliateIdParam = req.params.affiliateId || req.params.id;
  
  // Nếu không có ID trong URL params, kiểm tra trong request body
  const affiliateIdBody = req.body.affiliate_id || req.body.affiliateId;
  
  // Lấy affiliate hiện tại
  const getCurrentAffiliate = async () => {
    const affiliate = await storage.getCurrentAffiliate();
    return affiliate;
  };
  
  // Nếu đang truy cập thông tin affiliate cụ thể qua ID
  if (affiliateIdParam || affiliateIdBody) {
    // Nếu không phải ID của chính họ, từ chối truy cập
    return getCurrentAffiliate().then(currentAffiliate => {
      if (!currentAffiliate) {
        return res.status(403).json({
          status: "error",
          error: {
            code: "FORBIDDEN",
            message: "Cannot access affiliate information"
          }
        });
      }
      
      // Kiểm tra xem ID có khớp với affiliate hiện tại không
      const hasAccess = (
        (affiliateIdParam && affiliateIdParam === currentAffiliate.affiliate_id) ||
        (affiliateIdBody && affiliateIdBody === currentAffiliate.affiliate_id)
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          status: "error",
          error: {
            code: "FORBIDDEN",
            message: "You can only access your own data"
          }
        });
      }
      
      next();
    }).catch(error => {
      console.error("Error in affiliate access control:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error checking affiliate access"
        }
      });
    });
  }
  
  // Nếu truy cập vào API chung, tiếp tục
  next();
}

// Middleware kiểm tra xem API request có phải từ affiliate tương ứng với user không
// Dùng cho các API endpoint lấy dữ liệu affiliate
function ensureAffiliateMatchesUser(req: Request, res: Response, next: NextFunction) {
  // Nếu không có user, không thể xác định affiliate
  if (!req.user) {
    return res.status(401).json({
      status: "error",
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required"
      }
    });
  }
  
  // Nếu user là admin, luôn tạo dữ liệu mẫu cho xác thực OTP
  if (req.user.role === "ADMIN") {
    console.log("DEV MODE: Using default affiliate data for admin in OTP middleware");
    req.affiliate = {
      id: 1,
      user_id: req.user.id,
      affiliate_id: "ADMIN-AFF",
      full_name: "ColorMedia Admin",
      email: req.user.username, // Sử dụng email của admin để nhận OTP
      phone: "0909123456",
      bank_account: "9876543210",
      bank_name: "VietcomBank",
      total_contacts: 30,
      total_contracts: 12,
      contract_value: 240000000,
      received_balance: 48000000,
      paid_balance: 20000000,
      remaining_balance: 95000000,
      referred_customers: [],
      withdrawal_history: []
    };
    return next();
  }
  
  // Tìm affiliate liên kết với user hiện tại
  return storage.getAffiliateByUserId(req.user.id)
    .then(affiliate => {
      if (!affiliate) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "AFFILIATE_NOT_FOUND",
            message: "Không tìm thấy thông tin affiliate"
          }
        });
      }
      
      // Lưu thông tin affiliate vào request để tái sử dụng
      req.affiliate = affiliate;
      next();
    })
    .catch(error => {
      console.error("Error in affiliate user matching:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Error checking affiliate-user relationship"
        }
      });
    });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Thiết lập xác thực cho môi trường phát triển
  if (!(process.env.USE_DATABASE === "true" || process.env.NODE_ENV === "production")) {
    // Trong môi trường phát triển, sử dụng các route xác thực đơn giản
    setupDevAuthRoutes(app, storage);
  } else {
    // Trong môi trường production, sử dụng routes xác thực với database
    const { setupAuthRoutes } = await import("./auth");
    const { db } = await import("./db");
    setupAuthRoutes(app, db);
  }

  // Áp dụng middleware xác thực cho các API endpoints
  const secureApiEndpoints = [
    // API public hoặc được bảo vệ bằng token cơ bản
    "/api/affiliate",
    "/api/affiliates/top",
    "/api/withdrawal-request",
    
    // API admin cần xác thực chính thức
    "/api/admin/affiliates", 
    "/api/admin/customers",
    "/api/admin/customers/:id/status",
    "/api/admin/seed-data"
  ];
  
  // Áp dụng middleware xác thực cho các endpoints cần bảo vệ
  if (process.env.USE_DATABASE === "true" || process.env.NODE_ENV === "production") {
    // Trong môi trường production hoặc sử dụng DB, áp dụng xác thực người dùng
    secureApiEndpoints.forEach(endpoint => {
      if (endpoint.startsWith("/api/admin")) {
        // API admin cần token và quyền admin
        app.use(endpoint, authenticateUser, requireAdmin);
      } else {
        // API khác cần token người dùng
        app.use(endpoint, authenticateUser);
      }
    });
  } else {
    // Trong môi trường development, bỏ qua xác thực để test API
    console.log("TEST MODE: Authentication disabled for testing");
    // Bỏ comment dòng dưới đây nếu muốn bật lại xác thực
    // secureApiEndpoints.forEach(endpoint => {
    //  app.use(endpoint, authenticateToken);
    // });
  }
  
  // API endpoint to get affiliate data
  app.get("/api/affiliate", authenticateUser, async (req, res) => {
    try {
      let userId = 0;
      
      // Kiểm tra user đã được xác thực từ middleware
      if (req.user) {
        userId = req.user.id;
        console.log(`Getting affiliate data for user ID: ${userId}`);
      } else if (process.env.NODE_ENV === "development") {
        // Trong môi trường dev, có thể sử dụng default user
        console.log("Using default user for development");
        userId = 1; // Admin user
      }
      
      // Tìm affiliate liên kết với user
      const affiliate = await storage.getAffiliateByUserId(userId);
      
      if (!affiliate) {
        return res.status(404).json({ 
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Affiliate not found"
          }
        });
      }
      
      // Trả về dữ liệu affiliate
      res.json({
        status: "success",
        data: affiliate
      });
    } catch (error) {
      console.error("Error getting affiliate data:", error);
      res.status(500).json({ 
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve affiliate data"
        }
      });
    }
  });

  // API endpoint to get top affiliates
  app.get("/api/affiliates/top", async (req, res) => {
    try {
      const topAffiliates = await storage.getTopAffiliates();
      res.json(topAffiliates);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve top affiliates" });
    }
  });
  
  // API lấy thống kê khách hàng theo khoảng thời gian
  app.get("/api/affiliate/customer-statistics", authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: "error", 
          error: {
            code: "UNAUTHORIZED",
            message: "Bạn phải đăng nhập để sử dụng tính năng này"
          }
        });
      }
      
      // Lấy tham số từ URL
      const periodType = (req.query.period as string) || "all";
      const status = req.query.status as string | undefined;
      
      // Lấy thông tin affiliate
      const affiliate = await storage.getAffiliateByUserId(req.user.id);
      if (!affiliate) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "AFFILIATE_NOT_FOUND",
            message: "Không tìm thấy thông tin affiliate"
          }
        });
      }
      
      // Chuẩn bị kết quả thống kê
      let customers = [...(affiliate.referred_customers || [])];
      let periodStart = new Date();
      let periodEnd = new Date();
      
      // Xác định khoảng thời gian
      switch (periodType) {
        case "week":
          // Lấy ngày đầu tuần hiện tại (Thứ Hai)
          periodStart = new Date();
          periodStart.setDate(periodStart.getDate() - periodStart.getDay() + (periodStart.getDay() === 0 ? -6 : 1));
          periodStart.setHours(0, 0, 0, 0);
          
          // Ngày cuối tuần là chủ nhật
          periodEnd = new Date(periodStart);
          periodEnd.setDate(periodEnd.getDate() + 6);
          periodEnd.setHours(23, 59, 59, 999);
          break;
          
        case "month":
          // Ngày đầu tiên trong tháng
          periodStart = new Date();
          periodStart.setDate(1);
          periodStart.setHours(0, 0, 0, 0);
          
          // Ngày cuối cùng trong tháng
          periodEnd = new Date(periodStart);
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          periodEnd.setDate(0);
          periodEnd.setHours(23, 59, 59, 999);
          break;
          
        case "year":
          // Ngày đầu tiên trong năm
          periodStart = new Date();
          periodStart.setMonth(0, 1);
          periodStart.setHours(0, 0, 0, 0);
          
          // Ngày cuối cùng trong năm
          periodEnd = new Date(periodStart);
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          periodEnd.setDate(0);
          periodEnd.setHours(23, 59, 59, 999);
          break;
          
        default: // all - Tất cả thời gian
          periodStart = new Date(0); // Từ thời điểm đầu tiên
          periodEnd = new Date(); // Đến hiện tại
      }
      
      // Lọc khách hàng theo khoảng thời gian
      if (periodType !== "all") {
        customers = customers.filter(customer => {
          const createdDate = new Date(customer.created_at);
          return createdDate >= periodStart && createdDate <= periodEnd;
        });
      }
      
      // Lọc khách hàng theo trạng thái (nếu có)
      if (status) {
        customers = customers.filter(customer => customer.status === status);
      }
      
      // Tính toán các giá trị thống kê
      const totalCustomers = customers.length;
      const contractSignedCustomers = customers.filter(c => c.status === "Contract signed");
      const totalContracts = contractSignedCustomers.length;
      const totalContractValue = contractSignedCustomers.reduce((sum, c) => sum + (c.contract_value || 0), 0);
      const totalCommission = contractSignedCustomers.reduce((sum, c) => sum + (c.commission || 0), 0);
      
      // Trả về kết quả
      return res.json({
        status: "success",
        data: {
          totalCustomers,
          totalContracts,
          totalContractValue,
          totalCommission,
          periodType,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          customers
        }
      });
    } catch (error: any) {
      console.error("Error in /api/affiliate/customer-statistics:", error);
      return res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Đã xảy ra lỗi khi lấy thống kê khách hàng"
        }
      });
    }
  });
  
  // API lấy dữ liệu theo chuỗi thời gian cho biểu đồ
  app.get("/api/affiliate/time-series", authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: "error", 
          error: {
            code: "UNAUTHORIZED",
            message: "Bạn phải đăng nhập để sử dụng tính năng này"
          }
        });
      }
      
      // Lấy tham số từ URL
      const periodType = (req.query.period as string) || "month";
      
      // Lấy thông tin affiliate
      const affiliate = await storage.getAffiliateByUserId(req.user.id);
      if (!affiliate) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "AFFILIATE_NOT_FOUND",
            message: "Không tìm thấy thông tin affiliate"
          }
        });
      }
      
      // Lấy tất cả khách hàng có trạng thái "Contract signed"
      const contractCustomers = (affiliate.referred_customers || [])
        .filter(c => c.status === "Contract signed")
        .map(c => ({
          ...c,
          contractDate: c.contract_date ? new Date(c.contract_date) : new Date(c.created_at)
        }));
      
      // Định dạng thời gian dựa vào periodType
      let formatFunc: (date: Date) => string;
      let periodData: { [key: string]: { period: string, contractValue: number, commission: number, contractCount: number } } = {};
      
      switch (periodType) {
        case "week": {
          // Format theo ngày trong tuần
          formatFunc = (date: Date) => {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          };
          
          // Lấy dữ liệu 7 ngày gần nhất
          const today = new Date();
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const key = formatFunc(date);
            periodData[key] = {
              period: key,
              contractValue: 0,
              commission: 0,
              contractCount: 0
            };
          }
          break;
        }
        
        case "month": {
          // Format theo ngày trong tháng
          formatFunc = (date: Date) => {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          };
          
          // Lấy dữ liệu 30 ngày gần nhất
          const today = new Date();
          for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const key = formatFunc(date);
            periodData[key] = {
              period: key,
              contractValue: 0,
              commission: 0,
              contractCount: 0
            };
          }
          break;
        }
        
        case "year": {
          // Format theo tháng trong năm
          formatFunc = (date: Date) => {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            return `${year}-${month.toString().padStart(2, '0')}`;
          };
          
          // Lấy dữ liệu 12 tháng gần nhất
          const today = new Date();
          for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(today.getMonth() - i);
            const key = formatFunc(date);
            periodData[key] = {
              period: key,
              contractValue: 0,
              commission: 0,
              contractCount: 0
            };
          }
          break;
        }
        
        default: {
          // Format theo tháng trong năm
          formatFunc = (date: Date) => {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            return `${year}-${month.toString().padStart(2, '0')}`;
          };
          
          // Lấy dữ liệu 12 tháng gần nhất
          const today = new Date();
          for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(today.getMonth() - i);
            const key = formatFunc(date);
            periodData[key] = {
              period: key,
              contractValue: 0,
              commission: 0,
              contractCount: 0
            };
          }
        }
      }
      
      // Tổng hợp dữ liệu
      contractCustomers.forEach(customer => {
        const periodKey = formatFunc(customer.contractDate);
        if (periodData[periodKey]) {
          periodData[periodKey].contractCount += 1;
          periodData[periodKey].contractValue += customer.contract_value || 0;
          periodData[periodKey].commission += customer.commission || 0;
        }
      });
      
      // Chuyển đổi từ object sang array
      const data = Object.values(periodData);
      
      // Trả về kết quả
      return res.json({
        status: "success",
        data: {
          periodType,
          data
        }
      });
    } catch (error: any) {
      console.error("Error in /api/affiliate/time-series:", error);
      return res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Đã xảy ra lỗi khi lấy dữ liệu chuỗi thời gian"
        }
      });
    }
  });

  // API endpoint to request withdrawal OTP
  app.post("/api/withdrawal-request/send-otp", authenticateUser, ensureAffiliateMatchesUser, async (req, res) => {
    try {
      const { amount, note } = req.body;
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ 
          status: "error",
          error: {
            code: "INVALID_AMOUNT",
            message: "Số tiền không hợp lệ"
          }
        });
      }
      
      // Sử dụng affiliate từ middleware ensureAffiliateMatchesUser
      if (!req.affiliate) {
        return res.status(404).json({ 
          status: "error",
          error: {
            code: "AFFILIATE_NOT_FOUND",
            message: "Không tìm thấy thông tin affiliate"
          }
        });
      }
      
      // Tạo biến affiliate từ req.affiliate để tránh lỗi TypeScript
      const affiliate = req.affiliate;
      
      if (parseFloat(amount) > affiliate.remaining_balance) {
        return res.status(400).json({ 
          status: "error",
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: `Số tiền rút vượt quá số dư hiện có: ${affiliate.remaining_balance.toLocaleString()} VND`
          }
        });
      }
      
      // Kiểm tra xem có lệnh rút tiền đang xử lý nào không
      const hasPendingWithdrawal = affiliate.withdrawal_history.some(
        w => w.status === "Pending" || w.status === "Processing"
      );
      
      if (hasPendingWithdrawal) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "PENDING_WITHDRAWAL_EXISTS",
            message: "Bạn đã có một yêu cầu rút tiền đang được xử lý. Vui lòng đợi hoàn tất trước khi tạo yêu cầu mới."
          }
        });
      }
      
      // Kiểm tra giới hạn rút tiền trong ngày (được đặt lại vào 9:00 sáng mỗi ngày)
      const amountValue = parseFloat(amount);
      const dailyLimitCheck = await storage.checkDailyWithdrawalLimit(affiliate.affiliate_id, amountValue);
      
      if (dailyLimitCheck.exceeds) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "DAILY_LIMIT_EXCEEDED",
            message: `Vượt quá giới hạn rút tiền trong ngày. Bạn đã rút ${dailyLimitCheck.totalWithdrawn.toLocaleString()} VND từ 9:00 sáng hôm nay. Số tiền còn có thể rút: ${dailyLimitCheck.remainingLimit.toLocaleString()} VND. Giới hạn sẽ được đặt lại vào 9:00 sáng ngày mai.`
          }
        });
      }
      
      // Lưu thông tin request tạm thời vào session hoặc cache
      const withdrawalData = {
        user_id: affiliate.affiliate_id,
        full_name: affiliate.full_name,
        email: affiliate.email,
        phone: affiliate.phone,
        bank_account: affiliate.bank_account,
        bank_name: affiliate.bank_name,
        amount_requested: parseFloat(amount),
        note: note || "",
        request_time: new Date().toISOString()
      };
      
      // Validate dữ liệu rút tiền
      withdrawalRequestPayloadSchema.parse(withdrawalData);
      
      // Tạo mã OTP và lưu vào cơ sở dữ liệu
      const user_id = req.user?.id as number;
      const otpCode = await storage.createOtp(user_id, "WITHDRAWAL");
      
      // Import thư viện gửi email
      const { sendOtpVerificationEmail } = await import("./email");
      
      // Gửi email chứa mã OTP
      await sendOtpVerificationEmail(
        affiliate.full_name,
        affiliate.email,
        otpCode,
        5, // Thời gian hết hạn (phút)
        "rút tiền"
      );
      
      res.status(200).json({ 
        status: "success",
        data: {
          message: "Mã OTP đã được gửi đến email của bạn",
          email_masked: affiliate.email.replace(/(.{2})(.*)(@.*)/, '$1****$3'),
          withdrawal_data: withdrawalData
        }
      });
    } catch (error) {
      console.error("Error sending withdrawal OTP:", error);
      res.status(500).json({ 
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Lỗi khi gửi mã OTP, vui lòng thử lại sau"
        }
      });
    }
  });
  
  // API endpoint to verify OTP and submit withdrawal request
  app.post("/api/withdrawal-request/verify", authenticateUser, ensureAffiliateMatchesUser, async (req, res) => {
    try {
      const { otp, withdrawal_data } = req.body;
      
      if (!otp || !withdrawal_data) {
        return res.status(400).json({ 
          status: "error",
          error: {
            code: "MISSING_DATA",
            message: "Thiếu mã OTP hoặc dữ liệu rút tiền"
          }
        });
      }
      
      // Xác thực mã OTP
      const user_id = req.user?.id as number;
      const isValid = await storage.verifyOtp(user_id, otp, "WITHDRAWAL");
      
      if (!isValid) {
        // Tăng số lần thử
        const attempts = await storage.increaseOtpAttempt(user_id, otp);
        
        // Xác định thông báo lỗi dựa vào số lần thử
        let errorMessage = "Mã OTP không hợp lệ";
        if (attempts >= 5) {
          errorMessage = "Mã OTP đã bị vô hiệu hóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.";
        } else {
          errorMessage = `Mã OTP không hợp lệ. Bạn còn ${5 - attempts} lần thử.`;
        }
        
        return res.status(400).json({ 
          status: "error",
          error: {
            code: "INVALID_OTP",
            message: errorMessage,
            attempts_left: Math.max(0, 5 - attempts)
          }
        });
      }
      
      // Validate lại dữ liệu rút tiền
      const validatedPayload = withdrawalRequestPayloadSchema.parse(withdrawal_data);
      
      // Đảm bảo user_id trong payload là affiliate_id
      if (req.affiliate) {
        validatedPayload.user_id = req.affiliate.affiliate_id;
      } else if (req.user?.role === "ADMIN") {
        // Đối với admin, lấy affiliate_id từ payload và đảm bảo nó đã được đặt
        if (!validatedPayload.user_id) {
          validatedPayload.user_id = "ADMIN-AFF"; // Gán ID mặc định cho admin
        }
        console.log(`Admin đang xử lý rút tiền với affiliate_id: ${validatedPayload.user_id}`);
      } else {
        throw new Error("Không tìm thấy thông tin Affiliate");
      }
      
      // Hoàn tất yêu cầu rút tiền
      await storage.addWithdrawalRequest(validatedPayload);
      
      // Gửi email xác nhận yêu cầu rút tiền
      const { sendWithdrawalRequestEmail } = await import("./email");
      await sendWithdrawalRequestEmail(
        validatedPayload.full_name,
        validatedPayload.email,
        validatedPayload.amount_requested,
        {
          bankName: validatedPayload.bank_name,
          accountNumber: validatedPayload.bank_account
        }
      );
      
      // Gửi thông tin yêu cầu rút tiền tới webhook
      try {
        const webhookUrl = "https://aicolormedia.app.n8n.cloud/webhook-test/yeu-cau-thanh-toan-affilate";
        const webhookPayload = {
          affiliate_id: validatedPayload.user_id,
          full_name: validatedPayload.full_name,
          email: validatedPayload.email,
          phone: validatedPayload.phone,
          bank_account: validatedPayload.bank_account,
          bank_name: validatedPayload.bank_name,
          amount_requested: validatedPayload.amount_requested,
          note: validatedPayload.note,
          request_time: validatedPayload.request_time,
          status: "PENDING",
          timestamp: new Date().toISOString(),
        };
        
        console.log("Sending webhook notification for withdrawal request:", webhookPayload);
        
        // Gửi webhook không đồng bộ (không đợi phản hồi)
        fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
        }).then(webhookRes => {
          console.log("Webhook notification sent, status:", webhookRes.status);
        }).catch(webhookErr => {
          console.error("Error sending webhook notification:", webhookErr);
        });
      } catch (webhookError) {
        // Lỗi webhook không ngăn cản quy trình chính
        console.error("Failed to send webhook notification:", webhookError);
      }
      
      res.status(200).json({ 
        status: "success",
        data: {
          message: "Yêu cầu rút tiền đã được gửi thành công",
          request: validatedPayload
        }
      });
    } catch (error) {
      console.error("Withdrawal verification error:", error);
      res.status(500).json({ 
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Lỗi khi xác thực OTP, vui lòng thử lại sau"
        }
      });
    }
  });
  
  // API endpoint to resend OTP
  app.post("/api/withdrawal-request/resend-otp", authenticateUser, ensureAffiliateMatchesUser, async (req, res) => {
    try {
      const user_id = req.user?.id as number;
      
      // Kiểm tra thông tin affiliate từ middleware ensureAffiliateMatchesUser
      if (!req.affiliate) {
        return res.status(404).json({ 
          status: "error",
          error: {
            code: "AFFILIATE_NOT_FOUND",
            message: "Không tìm thấy thông tin affiliate"
          }
        });
      }
      
      // Tạo biến affiliate từ req.affiliate để tránh lỗi TypeScript
      const affiliate = req.affiliate;
      
      // Tạo mã OTP mới (sẽ tự động vô hiệu hóa mã cũ)
      const otpCode = await storage.createOtp(user_id, "WITHDRAWAL");
      
      // Import thư viện gửi email
      const { sendOtpVerificationEmail } = await import("./email");
      
      // Gửi email chứa mã OTP
      await sendOtpVerificationEmail(
        affiliate.full_name,
        affiliate.email,
        otpCode,
        5, // Thời gian hết hạn (phút)
        "rút tiền"
      );
      
      res.status(200).json({ 
        status: "success",
        data: {
          message: "Mã OTP mới đã được gửi đến email của bạn",
          email_masked: affiliate.email.replace(/(.{2})(.*)(@.*)/, '$1****$3')
        }
      });
    } catch (error) {
      console.error("Error resending OTP:", error);
      res.status(500).json({ 
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Lỗi khi gửi lại mã OTP, vui lòng thử lại sau"
        }
      });
    }
  });

  // Admin API Routes for Data Management

  // Add a new affiliate
  app.post("/api/admin/affiliates", async (req, res) => {
    try {
      // Xác thực dữ liệu affiliate từ request body
      const affiliateData = insertAffiliateSchema.parse(req.body);
      
      // Kiểm tra xem affiliate_id có định dạng AFF.xxx hay không
      if (affiliateData.affiliate_id.startsWith("AFF")) {
        // Kiểm tra xem affiliate có tồn tại chưa
        const existingAffiliate = await storage.getAffiliateByAffiliateId(affiliateData.affiliate_id);
        
        if (existingAffiliate) {
          // Nếu đã tồn tại, cập nhật thông tin (chỉ cập nhật thông tin cơ bản)
          // Trong demo này chúng ta giả định luôn là tạo mới để đơn giản
          const updatedAffiliate = await storage.createAffiliate({
            ...affiliateData,
            user_id: existingAffiliate.user_id
          });
          
          return res.status(200).json({
            status: "success",
            data: {
              ...updatedAffiliate,
              message: "Affiliate information updated"
            }
          });
        } else {
          // Nếu chưa tồn tại, tạo user mới rồi tạo affiliate
          try {
            // Import environment sử dụng database
            if (process.env.USE_DATABASE === "true" || process.env.NODE_ENV === "production") {
              const { db } = await import("./db");
              const { createUserForAffiliate } = await import("./auth");
              
              // Tạo user mới cho affiliate
              const { user } = await createUserForAffiliate(
                db,
                affiliateData.email,
                affiliateData.full_name
              );
              
              // Tạo affiliate mới liên kết với user
              const newAffiliateWithUser = await storage.createAffiliate({
                ...affiliateData,
                user_id: user.id
              });
              
              return res.status(201).json({
                status: "success",
                data: {
                  ...newAffiliateWithUser,
                  message: "New affiliate created with user account"
                }
              });
            } else {
              // Mô phỏng hành vi trong môi trường sử dụng database
              // Giả định tạo user
              console.log("=== TEST MODE: Creating user account and sending activation email ===");

              try {
                // Import để sử dụng hàm sendAccountActivationEmail và hashPassword
                const { sendAccountActivationEmail } = await import("./email");
                const { hashPassword } = await import("./auth");
                
                // Mật khẩu mặc định
                const temporaryPassword = "color1234@";
                
                // Mã hóa mật khẩu
                const hashedPassword = await hashPassword(temporaryPassword);
                
                // Tạo tài khoản người dùng
                const newUser = await storage.createUser({
                  username: affiliateData.email,
                  password: hashedPassword,
                  role: "AFFILIATE",
                  is_first_login: true // sẽ được chuyển thành 1 trong hàm createUser
                });
                
                // Gửi email kích hoạt
                await sendAccountActivationEmail(
                  affiliateData.full_name,
                  affiliateData.email,
                  temporaryPassword
                );
                
                // Tạo affiliate mới và liên kết với user
                affiliateData.user_id = newUser.id;
                const newAffiliate = await storage.createAffiliate(affiliateData);
                
                return res.status(201).json({
                  status: "success",
                  data: {
                    ...newAffiliate,
                    message: "New affiliate created with simulated user account (DEV mode)"
                  }
                });
              } catch (emailError) {
                console.error("Error sending activation email:", emailError);
                
                // Vẫn tạo affiliate nếu gửi email thất bại
                const newAffiliate = await storage.createAffiliate(affiliateData);
                
                return res.status(201).json({
                  status: "success",
                  data: {
                    ...newAffiliate,
                    message: "New affiliate created but failed to send email notification (DEV mode)"
                  }
                });
              }
            }
          } catch (userError) {
            console.error("Error creating user for affiliate:", userError);
            return res.status(500).json({
              status: "error",
              error: {
                code: "USER_CREATION_ERROR",
                message: "Failed to create user account for affiliate"
              }
            });
          }
        }
      } else {
        // Nếu không có định dạng AFF, tạo affiliate bình thường
        const newAffiliate = await storage.createAffiliate(affiliateData);
        
        return res.status(201).json({
          status: "success",
          data: newAffiliate
        });
      }
    } catch (error) {
      console.error("Error creating affiliate:", error);
      res.status(400).json({
        status: "error",
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Invalid affiliate data"
        }
      });
    }
  });

  // Add a referred customer
  app.post("/api/admin/customers", async (req, res) => {
    try {
      const { affiliate_id, name, phone, email, status, description } = req.body;
      
      if (!affiliate_id || !name) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "VALIDATION_ERROR", 
            message: "Affiliate ID and customer name are required"
          }
        });
      }
      
      // Validate customer data
      const customerData = ReferredCustomerSchema.parse({
        customer_name: name,
        status: status || "Contact received",
        updated_at: new Date().toISOString(),
        note: description
      });
      
      // Add the customer to the affiliate
      await storage.addReferredCustomer(affiliate_id, customerData);
      
      // Return success response
      res.status(201).json({
        status: "success",
        data: {
          id: 0, // In a real DB implementation, this would be the actual ID
          name,
          phone,
          email,
          status: customerData.status,
          created_at: customerData.updated_at,
          updated_at: customerData.updated_at,
          contract_value: null,
          events: [
            {
              id: 0,
              timestamp: customerData.updated_at,
              status: customerData.status,
              description: customerData.note || "Customer added to system"
            }
          ]
        }
      });
    } catch (error) {
      console.error("Error adding referred customer:", error);
      res.status(400).json({
        status: "error",
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Invalid customer data"
        }
      });
    }
  });

  // Update customer status
  app.put("/api/admin/customers/:id/status", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const { status, description } = req.body;
      
      if (isNaN(customerId) || !status) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "VALIDATION_ERROR",
            message: "Valid customer ID and status are required"
          }
        });
      }
      
      // Validate status
      const validatedStatus = CustomerStatus.parse(status);
      
      // Update the customer status
      const updatedCustomer = await storage.updateCustomerStatus(
        customerId, 
        validatedStatus, 
        description || ""
      );
      
      if (!updatedCustomer) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Customer not found"
          }
        });
      }
      
      // Return the updated customer
      res.json({
        status: "success",
        data: {
          id: customerId,
          name: updatedCustomer.customer_name,
          status: updatedCustomer.status,
          updated_at: updatedCustomer.updated_at,
          events: [
            {
              id: 0,
              timestamp: updatedCustomer.updated_at,
              status: updatedCustomer.status,
              description: updatedCustomer.note || ""
            }
          ]
        }
      });
    } catch (error) {
      console.error("Error updating customer status:", error);
      res.status(400).json({
        status: "error",
        error: {
          code: "VALIDATION_ERROR",
          message: error instanceof Error ? error.message : "Invalid status update"
        }
      });
    }
  });

  // Seed test data
  app.post("/api/admin/seed-data", async (req, res) => {
    try {
      const { affiliates_count, customers_per_affiliate, withdrawals_per_affiliate } = req.body;
      
      // Default values if not provided
      const numAffiliates = parseInt(affiliates_count) || 5;
      const numCustomers = parseInt(customers_per_affiliate) || 3;
      const numWithdrawals = parseInt(withdrawals_per_affiliate) || 2;
      
      // Add seed data
      const result = await storage.seedData(numAffiliates, numCustomers, numWithdrawals);
      
      // Return success with summary
      res.status(200).json({
        status: "success",
        data: {
          message: "Đã thêm dữ liệu mẫu thành công",
          summary: result
        }
      });
    } catch (error) {
      console.error("Error seeding data:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to seed data"
        }
      });
    }
  });

  // API endpoint kiểm tra trạng thái cơ sở dữ liệu - không yêu cầu xác thực
  app.get("/api/db-status", async (req, res) => {
    try {
      let dbStatus = "Not connected";
      let storageType = "In-memory";
      let tablesInfo = {};
      
      // Kiểm tra loại storage đang sử dụng
      if (process.env.USE_DATABASE === "true" || process.env.NODE_ENV === "production") {
        storageType = "PostgreSQL";
        
        // Kiểm tra kết nối đến cơ sở dữ liệu
        try {
          // Thực hiện truy vấn kiểm tra đơn giản
          const { db } = await import("./db");
          const result = await db.execute('SELECT NOW()');
          dbStatus = "Connected";
          
          // Kiểm tra các bảng hiện có
          const tablesResult = await db.execute(`
            SELECT 
              table_name, 
              (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM 
              information_schema.tables t
            WHERE 
              table_schema = 'public'
          `);
          
          if (tablesResult.rows) {
            tablesInfo = tablesResult.rows.reduce((acc: Record<string, any>, row: any) => {
              acc[row.table_name] = {
                column_count: parseInt(row.column_count)
              };
              return acc;
            }, {});
          }
        } catch (dbError: any) {
          console.error("Database connection error:", dbError);
          dbStatus = `Error: ${dbError.message || 'Unknown error'}`;
        }
      }
      
      res.json({
        status: "success",
        data: {
          storage_type: storageType,
          database_status: dbStatus,
          environment: process.env.NODE_ENV || "development",
          use_database: process.env.USE_DATABASE === "true",
          database_tables: tablesInfo
        }
      });
    } catch (error) {
      console.error("Error checking database status:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check database status"
        }
      });
    }
  });
  
  // API endpoint làm sạch dữ liệu và tạo tài khoản test
  app.post("/api/reset-data", async (req, res) => {
    try {
      // Tạo tài khoản Admin
      const adminPassword = "admin@123";
      const hashedAdminPassword = await hashPassword("admin@123");
      
      const admin = await storage.createUser({
        username: "admin@colormedia.vn",
        password: hashedAdminPassword,
        role: "ADMIN",
        is_first_login: false
      });
      
      // Tạo tài khoản Affiliate 1
      const affiliate1Password = "affiliate1@123";
      const hashedAff1Password = await hashPassword(affiliate1Password);
      
      const affiliate1User = await storage.createUser({
        username: "affiliate1@colormedia.vn",
        password: hashedAff1Password,
        role: "AFFILIATE",
        is_first_login: true // Thiết lập là true để yêu cầu đổi mật khẩu khi đăng nhập lần đầu
      });
      
      // Tạo hồ sơ Affiliate 1
      const aff1Data = {
        affiliate_id: "AFF101",
        full_name: "Nguyễn Văn A",
        email: "affiliate1@colormedia.vn",
        phone: "0901234567",
        bank_account: "0123456789",
        bank_name: "TPBank",
        user_id: affiliate1User.id
      };
      
      const aff1 = await storage.createAffiliate(aff1Data);
      
      // Thêm dữ liệu khách hàng cho Affiliate 1
      const customers1 = [
        {
          customer_name: "Công ty ABC",
          status: CustomerStatus.enum["Contract signed"],
          updated_at: new Date().toISOString(),
          note: "Khách hàng đã ký hợp đồng 6 tháng"
        },
        {
          customer_name: "Công ty XYZ",
          status: CustomerStatus.enum["Presenting idea"],
          updated_at: new Date().toISOString(),
          note: "Đang thuyết trình ý tưởng"
        }
      ];
      
      for (const customer of customers1) {
        await storage.addReferredCustomer(aff1.id, customer);
      }
      
      // Tạo tài khoản Affiliate 2
      const affiliate2Password = "affiliate2@123";
      const hashedAff2Password = await hashPassword(affiliate2Password);
      
      const affiliate2User = await storage.createUser({
        username: "affiliate2@colormedia.vn",
        password: hashedAff2Password,
        role: "AFFILIATE",
        is_first_login: false
      });
      
      // Tạo hồ sơ Affiliate 2
      const aff2Data = {
        affiliate_id: "AFF102",
        full_name: "Trần Thị B",
        email: "affiliate2@colormedia.vn",
        phone: "0909876543",
        bank_account: "9876543210",
        bank_name: "Vietcombank",
        user_id: affiliate2User.id
      };
      
      const aff2 = await storage.createAffiliate(aff2Data);
      
      // Thêm dữ liệu khách hàng cho Affiliate 2
      const customers2 = [
        {
          customer_name: "Công ty DEF",
          status: CustomerStatus.enum["Contract signed"],
          updated_at: new Date().toISOString(),
          note: "Khách hàng đã ký hợp đồng 12 tháng"
        },
        {
          customer_name: "Công ty GHI",
          status: CustomerStatus.enum["Contact received"],
          updated_at: new Date().toISOString(),
          note: "Mới nhận thông tin liên hệ"
        },
        {
          customer_name: "Công ty JKL",
          status: CustomerStatus.enum["Pending reconciliation"],
          updated_at: new Date().toISOString(),
          note: "Đang chờ xác nhận"
        }
      ];
      
      for (const customer of customers2) {
        await storage.addReferredCustomer(aff2.id, customer);
      }
      
      // Trả về thông tin tài khoản cho người dùng
      res.status(200).json({
        status: "success",
        data: {
          message: "Đã tạo mới dữ liệu thành công",
          accounts: [
            {
              role: "Admin",
              username: "admin@colormedia.vn",
              password: adminPassword
            },
            {
              role: "Affiliate 1",
              username: "affiliate1@colormedia.vn",
              password: affiliate1Password,
              affiliate_id: aff1.affiliate_id
            },
            {
              role: "Affiliate 2",
              username: "affiliate2@colormedia.vn",
              password: affiliate2Password,
              affiliate_id: aff2.affiliate_id
            }
          ]
        }
      });
    } catch (error) {
      console.error("Lỗi khi tạo mới dữ liệu:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi tạo mới dữ liệu",
          details: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }
  });
  
  // API endpoint tạo bảng và cấu trúc cơ sở dữ liệu - bảo vệ bằng token
  app.post("/api/db-setup", authenticateToken, async (req, res) => {
    try {
      const { force } = req.body;
      
      if (process.env.NODE_ENV === "production" && force !== true) {
        return res.status(403).json({
          status: "error",
          error: {
            code: "FORBIDDEN",
            message: "This operation is not allowed in production environment without force=true"
          }
        });
      }
      
      const { exec } = require("child_process");
      
      // Thực thi lệnh migrate để tạo và cập nhật bảng
      exec("npm run db:push", (error: any, stdout: string, stderr: string) => {
        if (error) {
          console.error(`Error executing db:push: ${error.message}`);
          return res.status(500).json({
            status: "error",
            error: {
              code: "MIGRATION_ERROR",
              message: error.message,
              details: stderr
            }
          });
        }
        
        res.json({
          status: "success",
          data: {
            message: "Database setup completed successfully",
            details: stdout
          }
        });
      });
    } catch (error) {
      console.error("Error setting up database:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set up database"
        }
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
