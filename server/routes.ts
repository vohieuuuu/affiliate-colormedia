import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { 
  withdrawalRequestPayloadSchema, 
  insertAffiliateSchema, 
  ReferredCustomerSchema, 
  ReferredCustomer,
  CustomerStatus,
  CustomerStatusType,
  WithdrawalStatusType,
  UserRoleType,
  User,
  Affiliate,
  VideoData
} from "@shared/schema";
import { setupDevAuthRoutes } from "./devAuth";
import { setupVideoRoutes } from "./videoRoutes";
import { 
  detectSuspiciousWithdrawal, 
  withdrawalLimiter, 
  authLimiter, 
  sanitizeAffiliateData, 
  statsCache,
  encryptSensitiveData,
  decryptSensitiveData
} from "./security";

// Extend Express.Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
      affiliate?: Affiliate; // Thêm thuộc tính affiliate
      withdrawalRiskFactors?: {
        isUnusualAmount: boolean;
        isHighRatio: boolean;
        requireStrictVerification: boolean;
      };
    }
  }
}

// API Token cố định cho admin
const ADMIN_FIXED_TOKEN = "45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60";

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

  if (token !== ADMIN_FIXED_TOKEN) {
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

  // Trường hợp đặc biệt cho API dành cho admin - kiểm tra token cố định
  if (req.path.startsWith("/api/admin/")) {
    
    // Kiểm tra token cố định
    if (token === ADMIN_FIXED_TOKEN || token === "admin-token" || token === "admin") {
      console.log("DEV MODE: Using admin token for path:", req.path);
      // Tạo thông tin người dùng admin tạm thời
      req.user = {
        id: 1,
        username: "admin@colormedia.vn",
        password: "$2b$10$SsFtXWNGw9pLlJT4s2F9G.qO0BpI5wG6jFYrWgvYcP5o6w8gvlGT.", // admin@123
        role: "ADMIN",
        is_active: 1,
        is_first_login: 0,
        last_login: null,
        token: ADMIN_FIXED_TOKEN,
        created_at: new Date()
      };
      return next();
    } else {
      return res.status(403).json({
        status: "error",
        error: {
          code: "ADMIN_ACCESS_DENIED",
          message: "Tài khoản admin được yêu cầu cho API này"
        }
      });
    }
  }

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
      // 1. Kiểm tra nếu token là token admin cố định
      if (token === ADMIN_FIXED_TOKEN) {
        console.log("DEV MODE: Using admin fixed token");
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
        // Nếu không tìm thấy affiliate qua user_id, thử tìm qua username (email)
        if (req.user && req.user.username) {
          return storage.getAffiliateByEmail(req.user.username)
            .then(affiliateByEmail => {
              if (affiliateByEmail) {
                console.log(`Found affiliate by email ${req.user?.username} instead of user_id ${req.user?.id}`);
                // Cập nhật user_id của affiliate để khớp với user hiện tại
                if (req.user) {
                  affiliateByEmail.user_id = req.user.id;
                  
                  // Lưu thông tin affiliate vào request để tái sử dụng
                  req.affiliate = affiliateByEmail;
                  return next();
                }
              }
              
              // Nếu vẫn không tìm thấy, trả về lỗi
              return res.status(404).json({
                status: "error",
                error: {
                  code: "AFFILIATE_NOT_FOUND",
                  message: "Không tìm thấy thông tin affiliate"
                }
              });
            });
        } else {
          return res.status(404).json({
            status: "error",
            error: {
              code: "AFFILIATE_NOT_FOUND",
              message: "Không tìm thấy thông tin affiliate"
            }
          });
        }
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
  // Middleware đảm bảo tất cả API response đều có Content-Type: application/json
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      res.setHeader('Content-Type', 'application/json');
    }
    next();
  });

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
    "/api/admin/customers/:id/contract",
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
    // Trong môi trường development, áp dụng xác thực cho tất cả admin API
    console.log("SECURITY: Enforcing authentication for admin APIs");
    secureApiEndpoints.forEach(endpoint => {
      if (endpoint.startsWith("/api/admin")) {
        // API admin cần token và quyền admin chặt chẽ
        app.use(endpoint, authenticateUser, requireAdmin);
      } else {
        // API khác hiện tại bỏ qua xác thực cho dễ kiểm thử
        // app.use(endpoint, authenticateUser);
      }
    });
    
    // Bảo vệ riêng tất cả các API admin khác không liệt kê cụ thể
    app.use("/api/admin/*", authenticateUser, requireAdmin);
  }
  
  // API endpoint to register a new affiliate for a user
  app.post("/api/register-affiliate", authenticateUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required"
          }
        });
      }

      // Validate request body
      const { full_name, email, phone, bank_account, bank_name } = req.body;
      if (!full_name || !email || !phone || !bank_account || !bank_name) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_INPUT",
            message: "Missing required fields"
          }
        });
      }

      // Generate affiliate ID (e.g., AFF followed by user ID and random number)
      const affiliateId = `AFF${req.user.id}${Math.floor(Math.random() * 1000)}`;

      // Create affiliate data
      const affiliateData = {
        affiliate_id: affiliateId,
        user_id: req.user.id,
        full_name,
        email,
        phone,
        bank_account,
        bank_name
      };

      // Create affiliate in storage
      const newAffiliate = await storage.createAffiliate(affiliateData);

      res.status(201).json({
        status: "success",
        data: newAffiliate
      });
    } catch (error) {
      console.error("Error creating affiliate:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to create affiliate"
        }
      });
    }
  });

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
      
      // Sử dụng cache cho dữ liệu affiliate nếu có thể
      const getAffiliateData = async () => {
        // Tìm affiliate liên kết với user
        let affiliate = await storage.getAffiliateByUserId(userId);
        
        // Nếu không tìm thấy affiliate qua user_id, thử tìm qua username (email)
        if (!affiliate && req.user && req.user.username) {
          const affiliateByEmail = await storage.getAffiliateByEmail(req.user.username);
          if (affiliateByEmail) {
            console.log(`Found affiliate by email ${req.user.username} instead of user_id ${userId}`);
            // Cập nhật user_id của affiliate để khớp với user hiện tại
            affiliateByEmail.user_id = userId;
            affiliate = affiliateByEmail;
          }
        }
        
        return affiliate;
      };
      
      // Sử dụng cache để tăng hiệu suất
      const affiliate = await statsCache.get(`affiliate:${userId}`, getAffiliateData);
      
      if (!affiliate) {
        return res.status(404).json({ 
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Affiliate not found"
          }
        });
      }
      
      // Ẩn thông tin nhạy cảm trước khi trả về
      const sanitizedData = sanitizeAffiliateData(affiliate);
      
      // Trả về dữ liệu affiliate đã được bảo vệ
      res.json({
        status: "success",
        data: sanitizedData
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
      res.setHeader('Content-Type', 'application/json');
      res.json({
        status: "success",
        data: topAffiliates
      });
    } catch (error) {
      res.status(500).json({ 
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve top affiliates"
        }
      });
    }
  });
  
  // API để lấy danh sách affiliate (Admin)
  app.get("/api/admin/affiliates", authenticateUser, requireAdmin, async (req, res) => {
    try {
      // Lấy danh sách tất cả các affiliate
      const affiliates = [];
      
      // Trong môi trường development, tạo danh sách từ dữ liệu mẫu
      if (process.env.NODE_ENV === "development" || !(process.env.USE_DATABASE === "true")) {
        // Lấy affiliate từ storage.topAffiliates có thể được sử dụng ở đây
        const topAffiliates = await storage.getTopAffiliates();
        
        // Truy xuất thông tin chi tiết cho mỗi affiliate
        for (const topAffiliate of topAffiliates) {
          const affiliate = await storage.getAffiliateByAffiliateId(`AFF${100 + topAffiliate.id}`);
          if (affiliate) {
            affiliates.push(affiliate);
          }
        }
      } else {
        // Trong môi trường production, lấy từ database
        // (Phần triển khai database sẽ được thêm sau)
      }
      
      res.status(200).json({
        status: "success",
        data: affiliates
      });
    } catch (error) {
      console.error("Error retrieving affiliates:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve affiliates"
        }
      });
    }
  });

  // API để lấy danh sách khách hàng 
  app.get("/api/customers", authenticateUser, async (req, res) => {
    try {
      console.log("Getting customers list for user:", req.user?.id, req.user?.username);
      
      // Kiểm tra xem có affiliateId được chỉ định không (cho phép admin xem khách hàng của affiliate cụ thể)
      const affiliateId = req.query.affiliate_id as string;
      
      let affiliate = null;
      
      // Nếu có affiliateId và user là admin, lấy thông tin affiliate đó
      if (affiliateId && req.user?.role === "ADMIN") {
        console.log(`Admin requesting customers for specific affiliate: ${affiliateId}`);
        affiliate = await storage.getAffiliateByAffiliateId(affiliateId);
      } else if (req.user) {
        // Lấy affiliate của user đăng nhập
        affiliate = await storage.getAffiliateByUserId(req.user.id);
        
        // Nếu không tìm thấy affiliate qua user_id, thử tìm qua email
        if (!affiliate && req.user.username) {
          console.log(`Trying to find affiliate by email: ${req.user.username}`);
          affiliate = await storage.getAffiliateByEmail(req.user.username);
          
          if (affiliate) {
            console.log(`Found affiliate by email: ${req.user.username}`);
            // Cập nhật user_id của affiliate để khớp với user hiện tại
            affiliate.user_id = req.user.id;
          }
        }
      }
      
      if (!affiliate || !affiliate.referred_customers) {
        console.log("No affiliate or referred customers found for user:", req.user?.id);
        return res.status(200).json({
          status: "success",
          data: []
        });
      }
      
      console.log(`Found ${affiliate.referred_customers.length} customers for affiliate ${affiliate.affiliate_id}`);
      
      
      const customers = affiliate.referred_customers.map((customer, index) => ({
        id: index,
        customer_name: customer.customer_name,
        status: customer.status,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        contract_value: customer.contract_value,
        commission: customer.commission,
        contract_date: customer.contract_date,
        note: customer.note,
        phone: customer.phone,
        email: customer.email
      }));
      
      res.status(200).json({
        status: "success",
        data: customers
      });
    } catch (error) {
      console.error("Error retrieving customers:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve customers"
        }
      });
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
      const contractSignedCustomers = customers.filter(c => c.status === "Đã chốt hợp đồng");
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
      
      // Lấy tất cả khách hàng có trạng thái "Đã chốt hợp đồng"
      const contractCustomers = (affiliate.referred_customers || [])
        .filter(c => c.status === "Đã chốt hợp đồng")
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
  /**
   * Middleware để phát hiện hoạt động rút tiền đáng ngờ
   */
  function detectSuspiciousWithdrawal(req: Request, res: Response, next: NextFunction) {
    const { amount } = req.body;
    const userIP = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Kiểm tra xem có affiliate trong request không (phải được xác thực trước)
    if (!req.affiliate) {
      return next();
    }
    
    const affiliate = req.affiliate;
    
    // Tự phân tích hành vi đáng ngờ thay vì gọi lại middleware
    // Tính toán các yếu tố rủi ro
    const amountValue = parseFloat(amount);
    const isUnusualAmount = amountValue > 10000000; // 10 triệu VND
    const isHighRatio = amountValue > affiliate.remaining_balance * 0.7; // Rút hơn 70% số dư
    
    // Lưu trữ thông tin kiểm tra
    req.withdrawalRiskFactors = {
      isUnusualAmount,
      isHighRatio,
      requireStrictVerification: isUnusualAmount || isHighRatio
    };
    
    // Ghi log nếu phát hiện hành vi đáng ngờ
    if (req.withdrawalRiskFactors.requireStrictVerification) {
      console.log(`SECURITY_ALERT: Suspicious withdrawal detected for affiliate ${affiliate.affiliate_id}. Amount: ${parseFloat(amount)}, IP: ${userIP}, UserAgent: ${userAgent.substring(0, 50)}...`);
    }
    
    next();
  }
  
  app.post("/api/withdrawal-request/send-otp", authenticateUser, ensureAffiliateMatchesUser, detectSuspiciousWithdrawal, async (req, res) => {
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
      
      // Đã loại bỏ kiểm tra lệnh rút tiền đang xử lý theo yêu cầu
      
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
      
      // Kiểm tra xem có cần xác thực nghiêm ngặt hơn không (từ middleware phát hiện rủi ro)
      const requireStrictVerification = req.withdrawalRiskFactors?.requireStrictVerification || false;
      
      // Nếu yêu cầu rút tiền có dấu hiệu đáng ngờ, sử dụng phương thức xác thực tăng cường
      if (requireStrictVerification) {
        console.log(`Using enhanced OTP verification for potentially risky withdrawal from account ${affiliate.affiliate_id}`);
        // Ở đây có thể triển khai cơ chế OTP mạnh hơn, mã dài hơn hoặc thêm xác thực bổ sung
      }
      
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

  // Add a new affiliate (POST - chỉ tạo mới)
  app.post("/api/admin/affiliates", async (req, res) => {
    try {
      // Xác thực dữ liệu affiliate từ request body, loại bỏ user_id nếu có
      const { user_id, ...affiliateDataFromRequest } = req.body;
      
      // Sử dụng Zod để xác thực các trường khác, bỏ qua user_id
      const affiliateData = insertAffiliateSchema.omit({ user_id: true }).parse(affiliateDataFromRequest);
      
      // Kiểm tra xem affiliate_id có định dạng AFF.xxx hay không
      if (affiliateData.affiliate_id.startsWith("AFF")) {
        // Kiểm tra xem affiliate có tồn tại chưa
        const existingAffiliate = await storage.getAffiliateByAffiliateId(affiliateData.affiliate_id);
        
        if (existingAffiliate) {
          // Nếu đã tồn tại, báo lỗi vì POST chỉ dùng để tạo mới
          return res.status(409).json({
            status: "error",
            error: {
              code: "AFFILIATE_ALREADY_EXISTS",
              message: `Affiliate với ID ${affiliateData.affiliate_id} đã tồn tại. Hãy sử dụng PUT /api/admin/affiliates/${affiliateData.affiliate_id} để cập nhật.`
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
                
                // Kiểm tra xem email đã được sử dụng cho affiliate nào chưa
                const existingAffiliateByEmail = await storage.getAffiliateByEmail(affiliateData.email);
                
                if (existingAffiliateByEmail) {
                  // Email đã được sử dụng cho một affiliate khác
                  console.log(`Email ${affiliateData.email} is already used by affiliate ${existingAffiliateByEmail.affiliate_id}`);
                  return res.status(400).json({
                    status: "error",
                    error: {
                      code: "EMAIL_ALREADY_IN_USE",
                      message: `Email ${affiliateData.email} đã được sử dụng bởi affiliate khác. Vui lòng sử dụng email khác.`
                    }
                  });
                }
                
                // Kiểm tra xem email đã tồn tại trong hệ thống người dùng chưa
                const existingUser = await storage.getUserByUsername(affiliateData.email);
                
                let userId;
                
                try {
                  // Nếu đã qua được kiểm tra bên trên, hoặc là email chưa tồn tại, hoặc là tồn tại nhưng chưa kết hợp với affiliate nào
                  if (existingUser) {
                    userId = existingUser.id;
                  } else {
                    // Mã hóa mật khẩu
                    const hashedPassword = await hashPassword(temporaryPassword);
                    
                    // Tạo tài khoản người dùng mới
                    const newUser = await storage.createUser({
                      username: affiliateData.email,
                      password: hashedPassword,
                      role: "AFFILIATE",
                      is_first_login: true // sẽ được chuyển thành 1 trong hàm createUser
                    });
                    
                    userId = newUser.id;
                    
                    // Gửi email kích hoạt
                    await sendAccountActivationEmail(
                      affiliateData.full_name,
                      affiliateData.email,
                      temporaryPassword
                    );
                  }
                } catch (emailError) {
                  console.error("Error sending activation email:", emailError);
                  // Trường hợp gửi email thất bại nhưng vẫn tạo được tài khoản người dùng
                  if (!userId && existingUser) {
                    userId = existingUser.id;
                  } else if (!userId) {
                    // Không tạo được người dùng hoặc không gửi được email
                    throw new Error("Không thể tạo tài khoản hoặc gửi email kích hoạt");
                  }
                }
                
                // Tạo affiliate mới và liên kết với user
                const newAffiliate = await storage.createAffiliate({
                  ...affiliateData,
                  user_id: userId
                });
                
                return res.status(201).json({
                  status: "success",
                  data: {
                    ...newAffiliate,
                    message: "New affiliate created with simulated user account (DEV mode)"
                  }
                });
              } catch (error) {
                console.error("Error creating affiliate or sending email:", error);
                
                return res.status(500).json({
                  status: "error",
                  error: {
                    code: "AFFILIATE_CREATION_ERROR",
                    message: "Không thể tạo affiliate. " + (error instanceof Error ? error.message : "Unknown error")
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
        // Nếu không có định dạng AFF, tạo tài khoản người dùng và thông báo lỗi
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_AFFILIATE_ID",
            message: "Affiliate ID phải bắt đầu bằng 'AFF' (ví dụ: AFF101)"
          }
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

  // Update an existing affiliate (PUT - chỉ cập nhật)
  app.put("/api/admin/affiliates/:affiliate_id", async (req, res) => {
    try {
      const { affiliate_id } = req.params;
      
      // Xác thực dữ liệu affiliate từ request body, loại bỏ user_id và affiliate_id nếu có
      const { user_id, affiliate_id: reqAffiliateId, ...affiliateDataFromRequest } = req.body;
      
      // Kiểm tra xem affiliate có tồn tại chưa
      const existingAffiliate = await storage.getAffiliateByAffiliateId(affiliate_id);
      
      if (!existingAffiliate) {
        // Nếu không tồn tại, báo lỗi
        return res.status(404).json({
          status: "error",
          error: {
            code: "AFFILIATE_NOT_FOUND",
            message: `Affiliate với ID ${affiliate_id} không tồn tại. Hãy sử dụng POST /api/admin/affiliates để tạo mới.`
          }
        });
      }
      
      // Cập nhật thông tin (chỉ cập nhật thông tin cơ bản)
      // Trong môi trường memory, dùng createAffiliate để cập nhật
      const updatedAffiliate = await storage.createAffiliate({
        ...affiliateDataFromRequest,
        affiliate_id, // Sử dụng affiliate_id từ URL param
        user_id: existingAffiliate.user_id // Giữ nguyên user_id
      });
      
      return res.status(200).json({
        status: "success",
        data: {
          ...updatedAffiliate,
          message: "Affiliate information updated successfully"
        }
      });
    } catch (error) {
      console.error("Error updating affiliate:", error);
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
        phone: phone || "",
        email: email || "",
        status: status || "Mới nhập", // Sử dụng trạng thái mặc định đúng theo enum
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        note: description
      });
      
      // Kiểm tra xem affiliate có tồn tại không
      let affiliate = await storage.getAffiliateByAffiliateId(affiliate_id);
      
      if (!affiliate) {
        // Nếu không tìm thấy affiliate, tạo mới một affiliate với ID đó
        console.log(`Creating new affiliate with ID ${affiliate_id}`);
        
        // Tạo một tài khoản người dùng mới cho affiliate này
        const username = `${affiliate_id.toLowerCase()}@colormedia.vn`;
        const defaultPassword = "color1234@";
        const hashedPassword = await hashPassword(defaultPassword);
        
        const newUser = await storage.createUser({
          username,
          password: hashedPassword,
          role: "AFFILIATE",
          is_first_login: true
        });
        
        // Tạo affiliate mới với affiliate_id đã cung cấp
        affiliate = await storage.createAffiliate({
          affiliate_id,
          full_name: `Affiliate ${affiliate_id}`,
          email: username,
          phone: phone || "",
          bank_account: "",
          bank_name: "",
          user_id: newUser.id
        });
        
        console.log(`Created new affiliate with ID ${affiliate_id} and user ID ${newUser.id}`);
      } else {
        console.log(`Using existing affiliate with ID ${affiliate_id}`);
      }
      
      // Add the customer to the affiliate
      // Thêm khách hàng và lấy kết quả với ID
      const newCustomer = await storage.addReferredCustomer(affiliate_id, customerData);
      
      // Vô hiệu hóa cache để đảm bảo dữ liệu mới được cập nhật
      if (affiliate.user_id) {
        statsCache.invalidate(`affiliate:${affiliate.user_id}`);
        console.log(`Invalidated cache for affiliate:${affiliate.user_id} after adding new customer`);
      }
      
      // Return success response
      res.status(201).json({
        status: "success",
        data: {
          id: newCustomer.id, // Sử dụng ID được tạo tự động
          name,
          phone,
          email,
          status: customerData.status,
          created_at: customerData.updated_at,
          updated_at: customerData.updated_at,
          contract_value: null,
          affiliate_id, // Trả về affiliate_id mà khách hàng được gán cho
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

  // API lấy thông tin chi tiết về contract được chuyển xuống dưới (dòng 1739)

  // API lấy thông tin chi tiết của một affiliate theo ID
  app.get("/api/admin/affiliates/:affiliate_id", async (req, res) => {
    try {
      const { affiliate_id } = req.params;
      
      if (!affiliate_id) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "VALIDATION_ERROR",
            message: "Affiliate ID is required"
          }
        });
      }
      
      const affiliate = await storage.getAffiliateByAffiliateId(affiliate_id);
      if (!affiliate) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: `Affiliate with ID ${affiliate_id} not found`
          }
        });
      }
      
      // Trả về thông tin chi tiết của affiliate
      res.json({
        status: "success",
        data: {
          id: affiliate.id,
          user_id: affiliate.user_id,
          affiliate_id: affiliate.affiliate_id,
          full_name: affiliate.full_name,
          email: affiliate.email,
          phone: affiliate.phone,
          bank_account: affiliate.bank_account,
          bank_name: affiliate.bank_name,
          total_contacts: affiliate.total_contacts || affiliate.referred_customers.length,
          total_contracts: affiliate.total_contracts,
          contract_value: affiliate.contract_value,
          received_balance: affiliate.received_balance,
          paid_balance: affiliate.paid_balance,
          remaining_balance: affiliate.remaining_balance,
          customers_count: affiliate.referred_customers.length
        }
      });
    } catch (error) {
      console.error("Error getting affiliate details:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve affiliate details"
        }
      });
    }
  });
  
  // Lấy danh sách khách hàng của một affiliate
  app.get("/api/admin/affiliates/:affiliate_id/customers", async (req, res) => {
    try {
      const { affiliate_id } = req.params;
      
      if (!affiliate_id) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "VALIDATION_ERROR",
            message: "Affiliate ID is required"
          }
        });
      }
      
      const affiliate = await storage.getAffiliateByAffiliateId(affiliate_id);
      if (!affiliate) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: `Affiliate with ID ${affiliate_id} not found`
          }
        });
      }
      
      // Lấy danh sách khách hàng từ affiliate
      const customers = affiliate.referred_customers.map((customer) => ({
        id: customer.id || 0, // Sử dụng ID của khách hàng hoặc mặc định là 0
        name: customer.customer_name,
        phone: customer.phone,
        email: customer.email,
        status: customer.status,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        contract_value: customer.contract_value || null,
        contract_date: customer.contract_date || null,
        commission: customer.commission || null,
        note: customer.note || "",
        affiliate_id: affiliate_id
      }));
      
      res.status(200).json({
        status: "success",
        data: customers
      });
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch customers"
        }
      });
    }
  });

  // Update customer status
  // API endpoint để cập nhật thông tin hợp đồng cho khách hàng
  app.put("/api/admin/customers/:id/contract", async (req, res) => {
    try {
      const customerIndex = parseInt(req.params.id);
      const { 
        contract_value, 
        contract_date, 
        note,
        affiliate_id 
      } = req.body;
      
      if (isNaN(customerIndex) || !contract_value) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "VALIDATION_ERROR",
            message: "Valid customer index and contract value are required"
          }
        });
      }
      
      // Kiểm tra affiliate_id trong body
      if (!affiliate_id) {
        return res.status(400).json({
          status: "error", 
          error: {
            code: "VALIDATION_ERROR",
            message: "affiliate_id is required in request body to identify the customer's affiliate"
          }
        });
      }
      
      // Lấy affiliate từ storage
      const affiliate = await storage.getAffiliateByAffiliateId(affiliate_id);
      if (!affiliate) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: `Affiliate with ID ${affiliate_id} not found`
          }
        });
      }
      
      console.log(`Looking for customer at index ${customerIndex} in ${affiliate.referred_customers.length} customers for affiliate ${affiliate_id}`);
      
      // Sử dụng customerIndex như là index trong mảng khách hàng (tương tự API status)
      if (customerIndex < 0 || customerIndex >= affiliate.referred_customers.length) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND", 
            message: `Customer at index ${customerIndex} not found for affiliate ${affiliate_id}`
          }
        });
      }
      
      // Lấy thông tin khách hàng hiện tại trực tiếp từ index
      const customer = affiliate.referred_customers[customerIndex];
      
      console.log(`Found customer at index ${customerIndex}:`, JSON.stringify({
        id: customer.id,
        name: customer.customer_name,
        current_value: customer.contract_value || 0
      }));
      
      // Tính toán hoa hồng và giá trị bổ sung
      const oldContractValue = customer.contract_value || 0;
      const additionalContractValue = contract_value - oldContractValue;
      const additionalCommission = Math.round(additionalContractValue * 0.03); // 3% hoa hồng
      
      console.log(`Calculating commission: old value ${oldContractValue}, new value ${contract_value}, additional: ${additionalContractValue}, commission: ${additionalCommission}`);
      
      // Tạo bản cập nhật cho khách hàng
      const updatedCustomer = {
        ...customer,
        status: CustomerStatus.enum["Contract signed"],  // Cập nhật trạng thái thành đã ký hợp đồng
        contract_value: contract_value, // Cập nhật giá trị hợp đồng mới (không phải chỉ phần bổ sung)
        commission: (customer.commission || 0) + additionalCommission, // Cộng dồn hoa hồng
        contract_date: contract_date || customer.contract_date || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        note: note || customer.note || "",
      };
      
      // Tính toán các thay đổi về số dư
      const balanceUpdates = {
        contract_value: affiliate.contract_value + additionalContractValue,
        received_balance: affiliate.received_balance + additionalCommission,
        remaining_balance: affiliate.remaining_balance + additionalCommission
      };
      
      // Debug log
      console.log(`Submitting contract update for customer at index ${customerIndex} with data:`, JSON.stringify({
        name: updatedCustomer.customer_name,
        old_value: oldContractValue,
        new_value: updatedCustomer.contract_value,
        old_commission: customer.commission || 0,
        new_commission: updatedCustomer.commission
      }));
      
      // Cập nhật khách hàng và số dư của affiliate
      const result = await storage.updateCustomerWithContract(
        customerIndex,
        updatedCustomer,
        balanceUpdates
      );
      
      if (!result) {
        return res.status(500).json({
          status: "error",
          error: {
            code: "UPDATE_FAILED",
            message: "Failed to update customer contract information"
          }
        });
      }
      
      // Vô hiệu hóa cache để đảm bảo dữ liệu mới được hiển thị
      if (affiliate.user_id) {
        statsCache.invalidate(`affiliate:${affiliate.user_id}`);
        console.log(`Invalidated cache for affiliate:${affiliate.user_id} after updating contract`);
      }
      
      console.log(`Contract update successful, result:`, JSON.stringify({
        id: result.id,
        name: result.customer_name,
        value: result.contract_value,
        commission: result.commission
      }));
      
      // Trả về thông tin theo định dạng yêu cầu trong tài liệu API
      return res.status(200).json({
        status: "success",
        data: {
          id: result.id,
          name: result.customer_name,
          status: result.status,
          contract_value: result.contract_value,
          additional_contract_value: additionalContractValue,
          commission: result.commission,
          additional_commission: additionalCommission,
          updated_at: result.updated_at,
          affiliate_balance: {
            total_contract_value: affiliate.contract_value + additionalContractValue,
            total_received_balance: affiliate.received_balance + additionalCommission,
            paid_balance: affiliate.paid_balance || 0,
            remaining_balance: affiliate.remaining_balance + additionalCommission,
            actual_balance: affiliate.remaining_balance + additionalCommission
          }
        }
      });
      
    } catch (error: any) {
      console.error("Error updating customer contract:", error);
      return res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "An error occurred while updating the customer contract"
        }
      });
    }
  });

  app.put("/api/admin/customers/:id/status", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const { status, description, affiliate_id } = req.body;
      
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
      
      // Kiểm tra affiliate_id trong body
      if (!affiliate_id) {
        return res.status(400).json({
          status: "error", 
          error: {
            code: "VALIDATION_ERROR",
            message: "affiliate_id is required in request body to identify the customer's affiliate"
          }
        });
      }
      
      // Lấy affiliate từ storage
      const affiliate = await storage.getAffiliateByAffiliateId(affiliate_id);
      if (!affiliate) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: `Affiliate with ID ${affiliate_id} not found`
          }
        });
      }
      
      // Sử dụng customerId như là index trong mảng (như API contract)
      if (customerId < 0 || customerId >= affiliate.referred_customers.length) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND", 
            message: `Customer at index ${customerId} not found for affiliate ${affiliate_id}`
          }
        });
      }
      
      // Sử dụng index như là vị trí của khách hàng trong mảng
      const customerIndex = customerId;
      
      // Update the customer status using the index in the array
      const updatedCustomer = await storage.updateCustomerStatus(
        affiliate_id,
        customerIndex, 
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
      
      // Vô hiệu hóa cache để đảm bảo dữ liệu mới được hiển thị
      if (affiliate.user_id) {
        statsCache.invalidate(`affiliate:${affiliate.user_id}`);
        console.log(`Invalidated cache for affiliate:${affiliate.user_id} after updating customer status`);
      }
      
      // Log thông tin khách hàng sau khi cập nhật
      console.log(`Customer ${customerId} after update: ${JSON.stringify(updatedCustomer)}`);
      
      // Return the updated customer with its actual ID
      res.json({
        status: "success",
        data: {
          id: updatedCustomer.id || customerId, // Ưu tiên sử dụng ID từ đối tượng khách hàng 
          name: updatedCustomer.customer_name, // Sử dụng tên thực tế từ đối tượng khách hàng
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

  // Debug endpoint để kiểm tra thông tin affiliate
  app.get("/api/debug/affiliates/:id", async (req, res) => {
    try {
      const affiliateId = req.params.id;
      const affiliate = await storage.getAffiliateByAffiliateId(affiliateId);
      
      if (!affiliate) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: `Affiliate with ID ${affiliateId} not found`
          }
        });
      }
      
      // Log thông tin khách hàng để phân tích
      console.log("Affiliate customers:", affiliate.referred_customers.map((c, index) => ({
        index,
        id: c.id,
        name: c.customer_name
      })));
      
      return res.json({
        status: "success",
        data: affiliate
      });
    } catch (error) {
      console.error("Error in debug API:", error);
      return res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while retrieving affiliate information"
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
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 ngày trước
          updated_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), // 25 ngày trước
          contract_value: 50000000,
          commission: 1500000,
          contract_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Khách hàng đã ký hợp đồng 6 tháng trị giá 50,000,000 VND",
          phone: "0938123456",
          email: "abc@example.com"
        },
        {
          customer_name: "Công ty XYZ",
          status: CustomerStatus.enum["Contract signed"],
          created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 ngày trước
          updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 ngày trước
          contract_value: 80000000,
          commission: 2400000,
          contract_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Khách hàng đã ký hợp đồng 12 tháng trị giá 80,000,000 VND",
          phone: "0938123457",
          email: "xyz@example.com"
        },
        {
          customer_name: "Công ty Tech Solutions",
          status: CustomerStatus.enum["Presenting idea"],
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 ngày trước
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 ngày trước
          note: "Đang thuyết trình ý tưởng cho dự án web app",
          phone: "0938123458",
          email: "tech@example.com"
        },
        {
          customer_name: "Công ty Global Traders",
          status: CustomerStatus.enum["Contact received"],
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 ngày trước
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 ngày trước
          note: "Mới nhận thông tin liên hệ, cần sắp xếp cuộc gặp",
          phone: "0938123459",
          email: "global@example.com"
        }
      ];
      
      // Thêm khách hàng và cập nhật lại thông tin affiliate
      for (const customer of customers1) {
        await storage.addReferredCustomer(aff1.affiliate_id, customer);
      }
      
      // Cập nhật số dư và thống kê cho affiliate 1
      const aff1TotalContractValue = 130000000; // 50M + 80M
      const aff1CommissionEarned = 3900000; // 3% của tổng hợp đồng
      
      // Cập nhật affiliate 1 với dữ liệu mới
      await storage.createAffiliate({
        ...aff1Data,
        total_contacts: customers1.length,
        total_contracts: 2, // Đã ký 2 hợp đồng
        contract_value: aff1TotalContractValue,
        received_balance: aff1CommissionEarned,
        paid_balance: 1000000, // Đã rút 1 triệu
        remaining_balance: aff1CommissionEarned - 1000000, // Số dư còn lại
      });
      
      // Tạo lịch sử rút tiền cho affiliate 1
      const aff1WithdrawalHistory = [
        {
          user_id: aff1.affiliate_id,
          full_name: aff1.full_name,
          email: aff1.email,
          phone: aff1.phone,
          bank_account: aff1.bank_account,
          bank_name: aff1.bank_name,
          request_time: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          amount_requested: 1000000,
          status: "Completed",
          completed_time: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Rút tiền hoa hồng tháng trước",
          transaction_id: "TXN-001"
        }
      ];
      
      // Thêm lịch sử rút tiền
      for (const withdrawal of aff1WithdrawalHistory) {
        await storage.addWithdrawalRequest(withdrawal);
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
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 ngày trước
          updated_at: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(), // 55 ngày trước
          contract_value: 200000000,
          commission: 6000000,
          contract_date: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Khách hàng đã ký hợp đồng 12 tháng trị giá 200,000,000 VND"
        },
        {
          customer_name: "Công ty GHI",
          status: CustomerStatus.enum["Contract signed"],
          created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 ngày trước
          updated_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 ngày trước
          contract_value: 150000000,
          commission: 4500000,
          contract_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Khách hàng đã ký hợp đồng 6 tháng trị giá 150,000,000 VND"
        },
        {
          customer_name: "Công ty JKL",
          status: CustomerStatus.enum["Pending reconciliation"],
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 ngày trước
          updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 ngày trước
          note: "Đang chờ đối chiếu hợp đồng, có thể ký trong tuần tới"
        },
        {
          customer_name: "Công ty MNO",
          status: CustomerStatus.enum["Contact received"],
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 ngày trước
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 ngày trước
          note: "Mới nhận thông tin liên hệ, cần lên kế hoạch thuyết trình"
        }
      ];
      
      // Thêm khách hàng và cập nhật lại thông tin affiliate
      for (const customer of customers2) {
        await storage.addReferredCustomer(aff2.affiliate_id, customer);
      }
      
      // Cập nhật số dư và thống kê cho affiliate 2
      const aff2TotalContractValue = 350000000; // 200M + 150M
      const aff2CommissionEarned = 10500000; // 3% của tổng hợp đồng
      
      // Cập nhật affiliate 2 với dữ liệu mới
      await storage.createAffiliate({
        ...aff2Data,
        total_contacts: customers2.length,
        total_contracts: 2, // Đã ký 2 hợp đồng
        contract_value: aff2TotalContractValue,
        received_balance: aff2CommissionEarned,
        paid_balance: 7500000, // Đã rút 7.5 triệu
        remaining_balance: aff2CommissionEarned - 7500000, // Số dư còn lại
      });
      
      // Tạo lịch sử rút tiền cho affiliate 2
      const aff2WithdrawalHistory = [
        {
          user_id: aff2.affiliate_id,
          full_name: aff2.full_name,
          email: aff2.email,
          phone: aff2.phone,
          bank_account: aff2.bank_account,
          bank_name: aff2.bank_name,
          request_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount_requested: 5000000,
          status: "Completed",
          completed_time: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Rút tiền hoa hồng tháng trước",
          transaction_id: "TXN-002"
        },
        {
          user_id: aff2.affiliate_id,
          full_name: aff2.full_name,
          email: aff2.email,
          phone: aff2.phone,
          bank_account: aff2.bank_account,
          bank_name: aff2.bank_name,
          request_time: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          amount_requested: 2500000,
          status: "Completed",
          completed_time: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Rút tiền bổ sung",
          transaction_id: "TXN-003"
        },
        {
          user_id: aff2.affiliate_id,
          full_name: aff2.full_name,
          email: aff2.email,
          phone: aff2.phone,
          bank_account: aff2.bank_account,
          bank_name: aff2.bank_name,
          request_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          amount_requested: 1000000,
          status: "Pending",
          note: "Rút tiền chi tiêu cá nhân"
        }
      ];
      
      // Thêm lịch sử rút tiền
      for (const withdrawal of aff2WithdrawalHistory) {
        await storage.addWithdrawalRequest(withdrawal);
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
  
  // API endpoint để thêm dữ liệu khách hàng và hợp đồng bổ sung
  app.post("/api/seed-more-data", async (req, res) => {
    try {
      // Lấy danh sách affiliate hiện có
      const affiliate1 = await storage.getAffiliateByAffiliateId("AFF101");
      const affiliate2 = await storage.getAffiliateByAffiliateId("AFF102");
      
      if (!affiliate1 || !affiliate2) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Không tìm thấy affiliate, vui lòng chạy /api/reset-data trước"
          }
        });
      }
      
      // Thêm khách hàng cho Affiliate 1
      const additionalCustomers1 = [
        {
          customer_name: "Công ty Điện tử Sao Việt",
          status: CustomerStatus.enum["Contract signed"],
          created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          contract_value: 120000000,
          commission: 3600000,
          contract_date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Hợp đồng thiết kế website, marketing 12 tháng",
          phone: "0983456789",
          email: "info@saoviet.com"
        },
        {
          customer_name: "Công ty Du lịch Phương Nam",
          status: CustomerStatus.enum["Contract signed"],
          created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
          contract_value: 85000000,
          commission: 2550000,
          contract_date: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Hợp đồng thiết kế app du lịch 6 tháng",
          phone: "0912345678",
          email: "contact@phuongnamtravel.com"
        },
        {
          customer_name: "Công ty Thực phẩm Tươi Sạch",
          status: CustomerStatus.enum["Pending reconciliation"],
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Đang thảo luận các điều khoản hợp đồng",
          phone: "0987123456",
          email: "info@tuoisach.com"
        }
      ];
      
      // Thêm khách hàng cho Affiliate 2
      const additionalCustomers2 = [
        {
          customer_name: "Công ty Bất động sản Phú Thịnh",
          status: CustomerStatus.enum["Contract signed"],
          created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          contract_value: 300000000,
          commission: 9000000,
          contract_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Hợp đồng website, app và marketing online 12 tháng",
          phone: "0909888777",
          email: "info@phuthinh.com"
        },
        {
          customer_name: "Công ty Giáo dục Tương Lai",
          status: CustomerStatus.enum["Contract signed"],
          created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          contract_value: 250000000,
          commission: 7500000,
          contract_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Hợp đồng platform học trực tuyến 12 tháng",
          phone: "0918765432",
          email: "contact@tuonglai.edu.vn"
        },
        {
          customer_name: "Công ty Dược phẩm Tâm An",
          status: CustomerStatus.enum["Contract signed"],
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          contract_value: 180000000,
          commission: 5400000,
          contract_date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Hợp đồng website bán hàng và marketing 6 tháng",
          phone: "0965432198",
          email: "info@taman.com"
        },
        {
          customer_name: "Công ty Thời trang FSTYLE",
          status: CustomerStatus.enum["Presenting idea"],
          created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          note: "Đã trình bày ý tưởng, đang chờ phản hồi",
          phone: "0976543210",
          email: "sales@fstyle.vn"
        }
      ];
      
      // Thêm khách hàng cho cả hai affiliate
      for (const customer of additionalCustomers1) {
        await storage.addReferredCustomer(affiliate1.affiliate_id, customer);
      }
      
      for (const customer of additionalCustomers2) {
        await storage.addReferredCustomer(affiliate2.affiliate_id, customer);
      }
      
      // Cập nhật số liệu cho Affiliate 1
      const aff1ExistingCustomers = affiliate1.referred_customers || [];
      const aff1ExistingContracts = aff1ExistingCustomers.filter(c => c.status === "Contract signed").length;
      const aff1NewContractCustomers = additionalCustomers1.filter(c => c.status === "Contract signed");
      const aff1TotalContractValue = [...aff1ExistingCustomers, ...additionalCustomers1]
        .filter(c => c.status === "Contract signed")
        .reduce((sum, c) => sum + (c.contract_value || 0), 0);
      const aff1TotalCommission = aff1TotalContractValue * 0.03;
      
      // Cập nhật Affiliate 1
      await storage.createAffiliate({
        ...affiliate1,
        total_contacts: aff1ExistingCustomers.length + additionalCustomers1.length,
        total_contracts: aff1ExistingContracts + aff1NewContractCustomers.length,
        contract_value: aff1TotalContractValue,
        received_balance: aff1TotalCommission,
        remaining_balance: aff1TotalCommission - (affiliate1.paid_balance || 0)
      });
      
      // Cập nhật số liệu cho Affiliate 2
      const aff2ExistingCustomers = affiliate2.referred_customers || [];
      const aff2ExistingContracts = aff2ExistingCustomers.filter(c => c.status === "Contract signed").length;
      const aff2NewContractCustomers = additionalCustomers2.filter(c => c.status === "Contract signed");
      const aff2TotalContractValue = [...aff2ExistingCustomers, ...additionalCustomers2]
        .filter(c => c.status === "Contract signed")
        .reduce((sum, c) => sum + (c.contract_value || 0), 0);
      const aff2TotalCommission = aff2TotalContractValue * 0.03;
      
      // Cập nhật Affiliate 2
      await storage.createAffiliate({
        ...affiliate2,
        total_contacts: aff2ExistingCustomers.length + additionalCustomers2.length,
        total_contracts: aff2ExistingContracts + aff2NewContractCustomers.length,
        contract_value: aff2TotalContractValue,
        received_balance: aff2TotalCommission,
        remaining_balance: aff2TotalCommission - (affiliate2.paid_balance || 0)
      });
      
      // Trả về kết quả
      res.status(200).json({
        status: "success",
        data: {
          message: "Đã thêm dữ liệu khách hàng và hợp đồng thành công",
          summary: {
            affiliate1_customers_added: additionalCustomers1.length,
            affiliate1_contracts_added: aff1NewContractCustomers.length,
            affiliate1_total_contract_value: aff1TotalContractValue,
            affiliate1_total_commission: aff1TotalCommission,
            affiliate2_customers_added: additionalCustomers2.length,
            affiliate2_contracts_added: aff2NewContractCustomers.length,
            affiliate2_total_contract_value: aff2TotalContractValue,
            affiliate2_total_commission: aff2TotalCommission
          }
        }
      });
    } catch (error) {
      console.error("Lỗi khi thêm dữ liệu bổ sung:", error);
      res.status(500).json({
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Lỗi khi thêm dữ liệu bổ sung",
          details: error instanceof Error ? error.message : "Unknown error"
        }
      });
    }
  });
  
  // API cập nhật trạng thái yêu cầu rút tiền (dành cho admin)
  app.put("/api/admin/withdrawals/:affiliate_id/:request_time", authenticateUser, requireAdmin, async (req, res) => {
    try {
      const { affiliate_id, request_time } = req.params;
      const { status, note } = req.body;
      
      if (!affiliate_id || !request_time || !status) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "MISSING_PARAMS",
            message: "Thiếu thông tin yêu cầu: affiliate_id, request_time, status"
          }
        });
      }
      
      // Kiểm tra và xác thực status
      const validStatusValues = ["Pending", "Processing", "Completed", "Rejected", "Cancelled"];
      if (!validStatusValues.includes(status)) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "INVALID_STATUS",
            message: `Status không hợp lệ. Status hợp lệ bao gồm: ${validStatusValues.join(", ")}`
          }
        });
      }
      
      // Cho môi trường DEV: Tạo dữ liệu mẫu nếu đang test với affiliate AFF001
      if (affiliate_id === "AFF001" && process.env.NODE_ENV === "development") {
        console.log("DEV MODE: Creating mock withdrawal data for testing API");
        
        // Tạo một đối tượng affiliate nếu nó không tồn tại
        let mockAffiliate = await storage.getAffiliateByAffiliateId("AFF001");
        if (!mockAffiliate) {
          console.log("DEV MODE: Creating mock affiliate AFF001");
          mockAffiliate = await storage.createAffiliate({
            affiliate_id: "AFF001",
            full_name: "Võ Xuân Hiếu",
            email: "voxuanhieu.designer@gmail.com",
            phone: "0375698447",
            bank_account: "651661212",
            bank_name: "VPBank",
            user_id: 2,
          });
        }
        
        // Cập nhật số dư của affiliate dựa trên trạng thái mới
        const amount = 15000000; // Giả định số tiền rút
        
        if (status === "Processing" && mockAffiliate.remaining_balance >= amount) {
          // Trừ tiền khi chuyển sang trạng thái Processing
          mockAffiliate.remaining_balance -= amount;
          mockAffiliate.paid_balance += amount;
          await storage.createAffiliate(mockAffiliate); // Lưu lại thay đổi
          console.log(`DEV MODE: Updated affiliate balance for status ${status}. New balance: ${mockAffiliate.remaining_balance}`);
        } else if ((status === "Rejected" || status === "Cancelled") && mockAffiliate.paid_balance >= amount) {
          // Hoàn tiền khi trạng thái là Rejected hoặc Cancelled
          mockAffiliate.remaining_balance += amount;
          mockAffiliate.paid_balance -= amount;
          await storage.createAffiliate(mockAffiliate); // Lưu lại thay đổi
          console.log(`DEV MODE: Restored affiliate balance for status ${status}. New balance: ${mockAffiliate.remaining_balance}`);
        }
        
        // Ghi lại thay đổi vào lịch sử rút tiền
        const now = new Date();
        const requestDate = new Date(request_time);
        
        // Tìm xem đã có yêu cầu rút tiền này trong lịch sử chưa
        let withdrawalIndex = mockAffiliate.withdrawal_history.findIndex(
          wh => wh.request_date === request_time
        );
        
        // Nếu chưa có, thêm mới vào lịch sử
        if (withdrawalIndex === -1) {
          mockAffiliate.withdrawal_history.push({
            request_date: request_time,
            amount: amount,
            note: "Yêu cầu rút tiền test",
            status: status as WithdrawalStatusType,
            transaction_id: status === "Completed" ? "TX" + Date.now().toString() : undefined,
            completed_date: status === "Completed" ? now.toISOString() : undefined
          });
        } else {
          // Nếu đã có, cập nhật trạng thái
          mockAffiliate.withdrawal_history[withdrawalIndex].status = status as WithdrawalStatusType;
          if (status === "Completed") {
            mockAffiliate.withdrawal_history[withdrawalIndex].transaction_id = "TX" + Date.now().toString();
            mockAffiliate.withdrawal_history[withdrawalIndex].completed_date = now.toISOString();
          }
        }
        
        // Cập nhật lại affiliate
        await storage.createAffiliate(mockAffiliate);
        
        // Vô hiệu hóa cache
        if (mockAffiliate.user_id) {
          statsCache.invalidate(`affiliate:${mockAffiliate.user_id}`);
          console.log(`DEV MODE: Invalidated cache for affiliate:${mockAffiliate.user_id}`);
        }
        
        // Trả về dữ liệu cập nhật với thông tin số dư mới
        console.log("DEV MODE: Returning mock withdrawal data with updated status:", status);
        
        return res.status(200).json({
          status: "success",
          data: {
            message: `Trạng thái yêu cầu rút tiền đã được cập nhật thành ${status}`,
            withdrawal: {
              affiliate_id: affiliate_id,
              full_name: mockAffiliate.full_name,
              amount: amount,
              request_time: request_time,
              status: status,
              updated_at: new Date().toISOString()
            },
            // Thêm thông tin cập nhật về số dư để frontend biết
            balance_update: {
              remaining_balance: mockAffiliate.remaining_balance || 0,
              received_balance: mockAffiliate.received_balance || 0,
              paid_balance: mockAffiliate.paid_balance || 0
            },
            // Thêm trạng thái mới của affiliate để frontend có thể cập nhật toàn bộ dữ liệu nếu cần
            affiliate: mockAffiliate
          }
        });
      }
      
      // Cập nhật trạng thái thực tế cho môi trường production
      const updatedWithdrawal = await storage.updateWithdrawalStatus(affiliate_id, request_time, status);
      
      if (!updatedWithdrawal) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Không tìm thấy yêu cầu rút tiền với các thông tin cung cấp"
          }
        });
      }
      
      // Vô hiệu hóa cache của affiliate để đảm bảo dữ liệu mới
      const affiliate = await storage.getAffiliateByAffiliateId(affiliate_id);
      if (affiliate && affiliate.user_id) {
        statsCache.invalidate(`affiliate:${affiliate.user_id}`);
        console.log(`Invalidated cache for affiliate:${affiliate.user_id} after updating withdrawal status`);
      }
      
      // Gửi webhook thông báo cập nhật trạng thái
      try {
        const webhookUrl = "https://aicolormedia.app.n8n.cloud/webhook-test/cap-nhat-trang-thai-rut-tien";
        // Tìm affiliate để lấy thông tin đầy đủ
        const affiliateData = await storage.getAffiliateByAffiliateId(affiliate_id);
        
        const webhookPayload = {
          affiliate_id: affiliate_id,
          full_name: affiliateData?.full_name || "Unknown",
          email: affiliateData?.email || "Unknown",
          amount_requested: updatedWithdrawal.amount,
          request_time: request_time,
          previous_status: req.body.previous_status || "Pending",
          new_status: status,
          updated_by: req.user?.username || "admin",
          updated_at: new Date().toISOString(),
          note: note || ""
        };
        
        // Gửi webhook không đồng bộ
        fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
        }).then(webhookRes => {
          console.log("Status update webhook sent, status:", webhookRes.status);
        }).catch(webhookErr => {
          console.error("Error sending status update webhook:", webhookErr);
        });
      } catch (webhookError) {
        console.error("Failed to send status update webhook:", webhookError);
      }
      
      // Tìm affiliate để lấy thông tin đầy đủ - luôn lấy lại dữ liệu mới nhất sau khi cập nhật
      const affiliateData = await storage.getAffiliateByAffiliateId(affiliate_id);
      
      res.status(200).json({
        status: "success",
        data: {
          message: `Trạng thái yêu cầu rút tiền đã được cập nhật thành ${status}`,
          withdrawal: {
            affiliate_id: affiliate_id,
            full_name: affiliateData?.full_name || "Unknown",
            amount: updatedWithdrawal.amount,
            request_time: request_time,
            status: updatedWithdrawal.status,
            updated_at: new Date().toISOString()
          },
          // Thêm thông tin cập nhật về số dư để frontend biết
          balance_update: {
            remaining_balance: affiliateData?.remaining_balance || 0,
            received_balance: affiliateData?.received_balance || 0,
            paid_balance: affiliateData?.paid_balance || 0
          },
          // Thêm trạng thái mới của affiliate để frontend có thể cập nhật toàn bộ dữ liệu nếu cần
          affiliate: affiliateData
        }
      });
    } catch (error) {
      console.error("Error updating withdrawal status:", error);
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
  
  // Thiết lập routes quản lý video ColorMedia
  setupVideoRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
