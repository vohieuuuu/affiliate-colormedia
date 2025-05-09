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
  VideoData,
  KolVipAffiliate,
  users,
  SalesKitData,
  VideoDataSchema,
  SalesKitDataSchema,
  InsertVideo,
  InsertSalesKit
} from "@shared/schema";
import { calculateCommission } from "@shared/schemas/commission";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { setupDevAuthRoutes } from "./devAuth";
import { setupVideoRoutes } from "./videoRoutes";
import { setupKolVipRoutes } from "./kolRoutes";
import { requireAdmin } from "./api/admin-kol";
import { 
  detectSuspiciousWithdrawal, 
  withdrawalLimiter, 
  authLimiter, 
  sanitizeAffiliateData, 
  statsCache,
  encryptSensitiveData,
  decryptSensitiveData
} from "./security";
import commissionRouter from "./api/commission";
import { setupAdminKolRoutes } from "./api/admin-kol";
import { Router } from "express";
import webhookRoutes from "./webhookRoutes";

// Hàm trợ giúp để kiểm tra vai trò thống nhất
function isUserRole(role: any, expectedRole: string): boolean {
  if (!role) return false;
  
  // Chuẩn hóa cả role và expectedRole về cùng một định dạng (uppercase)
  const normalizedRole = typeof role === 'string' ? role.toUpperCase() : String(role).toUpperCase();
  const normalizedExpectedRole = expectedRole.toUpperCase();
  
  console.log(`Role checking: ${normalizedRole} vs ${normalizedExpectedRole}`);
  
  // Sử dụng includes thay vì so sánh chính xác để linh hoạt hơn
  return normalizedRole.includes(normalizedExpectedRole);
}

// Kiểm tra xem một user có phải là admin hay không
export function isAdminRole(user: User | undefined): boolean {
  if (!user) return false;
  return isUserRole(user.role, "ADMIN");
}

// Kiểm tra xem một user có phải là KOL/VIP hay không
export function isKolVipRole(user: User | undefined): boolean {
  if (!user) return false;
  
  // Sử dụng KOL thay vì KOL_VIP để tương thích với frontend
  return isUserRole(user.role, "KOL");
}

// Kiểm tra xem một user có phải là Affiliate thường hay không
export function isAffiliateRole(user: User | undefined): boolean {
  if (!user) return false;
  return isUserRole(user.role, "AFFILIATE");
}

// Extend Express.Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
      affiliate?: Affiliate; // Thuộc tính affiliate cho module thường
      kolVip?: KolVipAffiliate; // Thuộc tính kolVip cho module KOL/VIP
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
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  // Lấy token từ các nguồn khác nhau theo thứ tự ưu tiên
  let token = null;
  
  // 1. Kiểm tra cookie trực tiếp
  if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
    console.log("Middleware: Found token in cookies object");
  }
  
  // 2. Kiểm tra ký hiệu cookie thủ công
  else if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    if (cookies.auth_token) {
      token = cookies.auth_token;
      console.log("Middleware: Found token in cookie header");
    }
  }
  
  // 3. Kiểm tra token trong header Authorization
  else if (!token && req.headers['authorization'] && req.headers['authorization'].startsWith('Bearer ')) {
    token = req.headers['authorization'].split(' ')[1];
    console.log("Middleware: Found token in Authorization header");
  }
  
  // 4. Nếu request có token từ proxy
  else if (!token && (req as any).authToken) {
    token = (req as any).authToken;
    console.log("Middleware: Using token from proxy request object");
  }
  
  // 5. Kiểm tra token trong body request
  else if (!token && req.body && req.body.token) {
    token = req.body.token;
    console.log("Middleware: Found token in request body");
  }

  // Kiểm tra nếu không có token
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
    // Trường hợp đặc biệt cho API dành cho admin hoặc KOL - kiểm tra token cố định
    if ((req.path.startsWith("/api/admin/") || req.path.startsWith("/api/kol/")) && 
        (token === ADMIN_FIXED_TOKEN || token === "admin-token" || token === "admin")) {
      console.log("Using admin token for path:", req.path);
      // Tạo thông tin người dùng admin tạm thời
      req.user = {
        id: 1,
        username: "admin@colormedia.vn",
        role: "ADMIN"
      };
      return next();
    }
    
    // Kiểm tra token admin cố định cho các API khác
    if (token === ADMIN_FIXED_TOKEN) {
      console.log("Using admin fixed token");
      req.user = {
        id: 1,
        username: "admin",
        role: "ADMIN"
      };
      return next();
    }
    
    // Tìm kiếm user trong database theo token
    console.log("Authenticating with token: [SECURED]");
    const [user] = await db.select().from(users).where(eq(users.token, token));
    
    if (!user) {
      return res.status(401).json({
        status: "error",
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired token"
        }
      });
    }
    
    console.log(`User authenticated: ${user.username}, role: ${user.role}`);
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    return next();
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
  if (!req.user) {
    return next();
  }
  
  // Sử dụng hàm trợ giúp để kiểm tra vai trò admin
  if (isAdminRole(req.user)) {
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
  // Nếu không có user (môi trường dev), cho phép truy cập
  if (!req.user) {
    return next();
  }
  
  // Sử dụng hàm trợ giúp để kiểm tra vai trò admin
  if (isAdminRole(req.user)) {
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
  
  // Sử dụng hàm trợ giúp để kiểm tra admin
  if (isAdminRole(req.user)) {
    console.log("DEV MODE: Using default affiliate data for admin in OTP middleware");
    req.affiliate = {
      id: 9999,
      affiliate_id: "ADMIN",
      user_id: req.user.id,
      full_name: "Administrator",
      email: req.user.username,
      phone: "",
      bank_name: "Admin Bank",
      bank_account: "0000000000",
      total_contracts: 0,
      total_contacts: 0,
      referred_customers: [],
      withdrawal_history: [],
      contract_value: 0,
      received_balance: 0,
      paid_balance: 0,
      remaining_balance: 0,
      created_at: new Date()
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

  // Thiết lập xác thực cho ứng dụng
  // Chỉ sử dụng setupDevAuthRoutes khi yêu cầu rõ ràng
  if (process.env.USE_DEV_AUTH === "true") {
    console.log("Setup dev auth routes from routes.ts for testing");
    setupDevAuthRoutes(app, storage);
  } else {
    console.log("Skip setting up dev auth routes from routes.ts as database auth is enabled");
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
  // Sử dụng cùng một cách tiếp cận cho cả development và production
  console.log("SECURITY: Enforcing authentication for API endpoints");
  secureApiEndpoints.forEach(endpoint => {
    if (endpoint.startsWith("/api/admin")) {
      // API admin cần token và quyền admin chặt chẽ
      app.use(endpoint, authenticateUser, requireAdmin);
    } else {
      // API thông thường cũng cần xác thực
      app.use(endpoint, authenticateUser);
    }
  });
  
  // Bảo vệ riêng tất cả các API admin khác không liệt kê cụ thể
  app.use("/api/admin/*", authenticateUser, requireAdmin);
  
  // Bảo vệ tất cả API affiliate để đảm bảo đều yêu cầu xác thực
  app.use("/api/affiliate*", authenticateUser);
  
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
      // Nếu không có người dùng đăng nhập, trả về lỗi
      if (!req.user) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required"
          }
        });
      }

      const userId = req.user.id;
      console.log(`Getting affiliate data for user ID: ${userId}, role: ${req.user.role}, role type: ${typeof req.user.role}`);
      
      // Xử lý đặc biệt cho admin và KOL/VIP
      // Sử dụng hàm trợ giúp để kiểm tra vai trò
      const isAdmin = isAdminRole(req.user);
      const isKolVip = isKolVipRole(req.user);
      
      console.log("Is user an admin?", isAdmin);
      console.log("Is user a KOL/VIP?", isKolVip);
      
      // Xử lý đặc biệt cho admin - Trả về dữ liệu giả lập
      if (isAdmin) {
        console.log("DEV MODE: Admin user is accessing affiliate data - creating dummy affiliate data");
        
        const adminAffiliate = {
          id: 9999,
          affiliate_id: "ADMIN",
          user_id: req.user.id,
          full_name: "Administrator",
          email: req.user.username,
          phone: "",
          bank_name: "Admin Bank",
          bank_account: "0000000000",
          total_contracts: 0,
          total_contacts: 0,
          contract_value: 0,
          paid_balance: 0,
          received_balance: 0,
          remaining_balance: 0,
          referred_customers: [],
          withdrawal_history: [],
          created_at: new Date()
        };
        
        return res.json({
          status: "success",
          data: adminAffiliate
        });
      }
      
      // Xử lý đặc biệt cho KOL/VIP - Trả về dữ liệu giả lập
      if (isKolVip) {
        console.log("DEV MODE: KOL/VIP user is accessing affiliate data - creating dummy KOL data");
        
        const kolAffiliate = {
          id: userId,
          affiliate_id: `KOL${userId}`,
          user_id: req.user.id,
          full_name: "KOL VIP User",
          email: req.user.username,
          phone: "",
          bank_name: "Default Bank",
          bank_account: "0000000000",
          total_contracts: 0,
          total_contacts: 0,
          contract_value: 0,
          paid_balance: 0,
          received_balance: 0,
          remaining_balance: 0,
          referred_customers: [],
          withdrawal_history: [],
          created_at: new Date(),
          level: 1,
          monthly_salary: 5000000,
          kpi_status: "Pending"
        };
        
        return res.json({
          status: "success",
          data: kolAffiliate
        });
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
      
      // Luôn lấy dữ liệu mới từ storage
      const affiliate = await getAffiliateData();
      
      if (!affiliate) {
        // Nếu người dùng là affiliate thường, tạo dữ liệu affiliate mặc định
        if (isAffiliateRole(req.user)) {
          console.log(`Creating default affiliate data for user ${userId} (${req.user.username})`);
          
          // Tạo một ID affiliate mới với định dạng AF + 4 chữ số
          const affiliateId = `AF${String(userId).padStart(4, '0')}`;
          
          // Tạo dữ liệu affiliate mặc định
          const newAffiliate = await storage.createAffiliate({
            affiliate_id: affiliateId,
            user_id: userId,
            full_name: req.user.username.split('@')[0] || `Affiliate ${userId}`,
            email: req.user.username,
            phone: "0987654321",
            bank_name: "VietcomBank",
            bank_account: `1234567890`,
            total_contracts: 0,
            total_contacts: 0,
            contract_value: 0,
            received_balance: 0,
            remaining_balance: 0,
            paid_balance: 0,
            referred_customers: [],
            created_at: new Date().toISOString()
          });
          
          return res.json({
            status: "success",
            data: sanitizeAffiliateData(newAffiliate)
          });
        }
        
        return res.status(404).json({ 
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Affiliate not found"
          }
        });
      }
      
      // Cập nhật số lượng hợp đồng từ danh sách khách hàng thực tế
      const contractSignedCustomers = affiliate.referred_customers.filter(c => c.status === "Đã chốt hợp đồng");
      const totalContracts = contractSignedCustomers.length;
      
      // Cập nhật số lượng hợp đồng trong affiliate
      affiliate.total_contracts = totalContracts;
      
      // Ẩn thông tin nhạy cảm trước khi trả về
      const sanitizedData = sanitizeAffiliateData(affiliate);
      
      // Trả về dữ liệu affiliate đã được bảo vệ
      return res.json({
        status: "success",
        data: sanitizedData
      });
    } catch (error) {
      console.error("Error getting affiliate data:", error);
      return res.status(500).json({ 
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve affiliate data"
        }
      });
    }
  });

  // API endpoint to get top affiliates
  app.get("/api/affiliates/top", authenticateUser, async (req, res) => {
    try {
      console.log("User requested top affiliates");
      const topAffiliates = await storage.getTopAffiliates();
      console.log("Top affiliates retrieved:", JSON.stringify(topAffiliates));
      res.setHeader('Content-Type', 'application/json');
      res.json({
        status: "success",
        data: topAffiliates
      });
    } catch (error) {
      console.error("Error retrieving top affiliates:", error);
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
      
      // Lấy tất cả affiliate từ storage (bây giờ sẽ luôn sử dụng DatabaseStorage)
      const topAffiliates = await storage.getTopAffiliates();
      
      // Truy xuất thông tin chi tiết cho mỗi affiliate
      for (const topAffiliate of topAffiliates) {
        const affiliate = await storage.getAffiliateByAffiliateId(`AFF${100 + topAffiliate.id}`);
        if (affiliate) {
          affiliates.push(affiliate);
        }
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
      if (!req.user) {
        return res.status(401).json({
          status: "error",
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required"
          }
        });
      }
      
      console.log("Getting customers list for user:", req.user.id, req.user.username);
      
      // Kiểm tra xem có affiliateId được chỉ định không (cho phép admin xem khách hàng của affiliate cụ thể)
      const affiliateId = req.query.affiliate_id as string;
      
      let affiliate = null;
      
      // Nếu có affiliateId và user là admin, lấy thông tin affiliate đó
      if (affiliateId && isAdminRole(req.user)) {
        console.log(`Admin requesting customers for specific affiliate: ${affiliateId}`);
        affiliate = await storage.getAffiliateByAffiliateId(affiliateId);
      } else {
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
      
      // Xử lý đặc biệt cho admin
      if (isAdminRole(req.user)) {
        // Trả về dữ liệu mẫu cho admin
        return res.json({
          status: "success",
          data: {
            totalCustomers: 0,
            totalContracts: 0,
            totalContractValue: 0,
            totalCommission: 0,
            periodType: "all",
            periodStart: new Date(0).toISOString(),
            periodEnd: new Date().toISOString(),
            customers: []
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
      
      // Xử lý đặc biệt cho admin
      if (isAdminRole(req.user)) {
        // Trả về dữ liệu mẫu cho admin
        return res.json({
          status: "success",
          data: {
            periodType: "month",
            data: []
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
        user_id: affiliate.affiliate_id,
        full_name: affiliate.full_name,
        email: affiliate.email,
        phone: affiliate.phone,
        bank_account: affiliate.bank_account,
        bank_name: affiliate.bank_name,
        tax_id: tax_id || "", // Thêm MST cá nhân (nếu có)
        amount_requested: originalAmount,
        amount_after_tax: netAmount,
        tax_amount: taxAmount,
        has_tax: hasTax,
        tax_rate: INCOME_TAX_RATE,
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
      } else if (isAdminRole(req.user)) {
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
        },
        {
          taxAmount: validatedPayload.tax_amount,
          amountAfterTax: validatedPayload.amount_after_tax,
          hasTax: validatedPayload.has_tax,
          taxRate: validatedPayload.tax_rate,
          taxId: validatedPayload.tax_id // Thêm MST cá nhân vào email
        }
      );
      
      // Gửi thông báo webhook về yêu cầu rút tiền thành công
      try {
        // Import dịch vụ thông báo
        const { sendWithdrawalNotification } = await import("./notificationService");
        
        // Gửi thông báo với thông tin rút tiền của Affiliate thường (normal)
        const notificationResult = await sendWithdrawalNotification(validatedPayload, 'normal');
        
        if (notificationResult) {
          console.log("NORMAL Withdrawal notification sent successfully to webhook");
        } else {
          console.warn("Failed to send NORMAL withdrawal notification to webhook");
        }
      } catch (webhookError) {
        // Lỗi webhook không ngăn cản quy trình chính
        console.error("Failed to send NORMAL withdrawal webhook notification:", webhookError);
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
            // Import để sử dụng database
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
          } catch (userError) {
            console.error("Error creating user for affiliate:", userError);
            // Kiểm tra lỗi cụ thể nếu là lỗi do email đã tồn tại
            if (userError instanceof Error && userError.message.includes("already exists")) {
              return res.status(400).json({
                status: "error",
                error: {
                  code: "EMAIL_ALREADY_EXISTS",
                  message: userError.message
                }
              });
            } else {
              return res.status(500).json({
                status: "error",
                error: {
                  code: "USER_CREATION_ERROR",
                  message: "Failed to create user account for affiliate"
                }
              });
            }
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
      const customerId = parseInt(req.params.id);
      const { 
        contract_value, 
        contract_date, 
        note,
        affiliate_id 
      } = req.body;
      
      if (isNaN(customerId) || !contract_value) {
        return res.status(400).json({
          status: "error",
          error: {
            code: "VALIDATION_ERROR",
            message: "Valid customer ID and contract value are required"
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
      
      // Tìm khách hàng theo ID thay vì vị trí trong mảng
      // Hiển thị chi tiết về ID của tất cả khách hàng để debug
      console.log(`Searching for customer ID: ${customerId} (type: ${typeof customerId})`);
      console.log(`All customer IDs for affiliate ${affiliate_id}:`, 
        affiliate.referred_customers.map(customer => {
          return {
            id: customer.id, 
            type: typeof customer.id, 
            matches: customer.id === customerId
          };
        })
      );
      
      // Phát hiện sự không khớp về kiểu dữ liệu và thử so sánh dưới dạng chuỗi trước
      let customerIndex = affiliate.referred_customers.findIndex(
        customer => customer.id === customerId || 
                  (customer.id !== undefined && customer.id.toString() === customerId.toString())
      );
      
      // Nếu không tìm thấy, hãy thử tìm bất kỳ khách hàng nào khớp với id = 0 hoặc 1
      if (customerIndex === -1 && (customerId === 0 || customerId === 1)) {
        console.log(`Falling back to find any customer with ID 0 or 1`);
        customerIndex = affiliate.referred_customers.findIndex(
          customer => customer.id === 0 || customer.id === 1 || 
                    customer.id === "0" || customer.id === "1"
        );
      }
      
      if (customerIndex === -1) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND", 
            message: `Customer with ID ${customerId} not found for affiliate ${affiliate_id}`
          }
        });
      }
      
      // Hiển thị thông tin khách hàng đã tìm thấy để debug
      console.log(`Found customer at index ${customerIndex}:`, 
        JSON.stringify({
          id: affiliate.referred_customers[customerIndex].id,
          id_type: typeof affiliate.referred_customers[customerIndex].id
        })
      );
      
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
      
      // Xác định loại affiliate và tính hoa hồng theo quy tắc mới
      const affiliateType = affiliate.affiliate_type || "partner";
      // Sử dụng hàm calculateCommission đã import ở đầu file
      // Tính toán hoa hồng dựa trên loại affiliate và giá trị hợp đồng
      const newCommission = calculateCommission(affiliateType as any, contract_value);
      const oldCommission = customer.commission || 0;
      const additionalCommission = Math.round(newCommission - oldCommission);
      
      console.log(`Calculating commission: old value ${oldContractValue}, new value ${contract_value}, additional: ${additionalContractValue}, commission: ${additionalCommission} (rounded)`);
      
      // Tạo bản cập nhật cho khách hàng
      const updatedCustomer = {
        ...customer,
        status: "Đã chốt hợp đồng" as const,  // Cập nhật trạng thái thành đã ký hợp đồng
        contract_value: Math.round(contract_value), // Cập nhật giá trị hợp đồng mới và làm tròn số
        commission: Math.round((customer.commission || 0) + additionalCommission), // Cộng dồn hoa hồng và làm tròn số
        contract_date: contract_date || customer.contract_date || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        note: note || customer.note || "",
      };
      
      // Tính toán các thay đổi về số dư (tất cả đều làm tròn)
      const balanceUpdates = {
        contract_value: Math.round(affiliate.contract_value + additionalContractValue),
        received_balance: Math.round(affiliate.received_balance + additionalCommission),
        remaining_balance: Math.round(affiliate.remaining_balance + additionalCommission)
      };
      
      // Debug log
      console.log(`Submitting contract update for customer at index ${customerIndex} with data:`, JSON.stringify({
        name: updatedCustomer.customer_name,
        old_value: oldContractValue,
        new_value: updatedCustomer.contract_value,
        old_commission: customer.commission || 0,
        new_commission: updatedCustomer.commission
      }));
      
      // Cập nhật khách hàng và số dư của affiliate, truyền ID thật của khách hàng và affiliate_id
      const result = await storage.updateCustomerWithContract(
        customerId, // Sử dụng ID khách hàng thực thay vì chỉ số trong mảng
        updatedCustomer,
        balanceUpdates,
        affiliate_id // Truyền affiliate_id để đảm bảo tìm đúng affiliate
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
      // Xác định ID khách hàng từ params và đảm bảo là số
      const customerIdStr = req.params.id;
      let customerId = parseInt(customerIdStr);
      
      // Hot fix cho lỗi CastError trong môi trường production - đảm bảo ID luôn đúng
      if (customerId === 0 || isNaN(customerId)) {
        console.log(`CRITICAL FIX: Detected ID=${customerIdStr} being incorrectly parsed to ${customerId}, attempting to fix`);
        
        // Thử lấy ID từ string path parameter
        if (customerIdStr && !isNaN(Number(customerIdStr))) {
          customerId = Number(customerIdStr);
          console.log(`Fixed ID to ${customerId} from URL parameter`);
        } else {
          console.log(`Cannot fix ID from URL parameter, will try lookup by string ID`);
        }
      }
      // Lấy thông tin từ request body
      const { status, description, affiliate_id, contract_value } = req.body;
      
      console.log(`DEBUG - CRITICAL: Process PUT /api/admin/customers/:id/status`, {
        customerIdStr,
        customerIdType: typeof customerIdStr,
        customerId,
        customerIdNumType: typeof customerId,
        reqParamsRaw: req.params,
        environment: process.env.NODE_ENV || 'development'
      });
      
      // Log thêm thông tin debug chi tiết
      console.log(`DEBUG - PUT /api/admin/customers/:id/status - Request params:`, {
        customerId,
        customerId_type: typeof customerId,
        req_params_id: req.params.id,
        req_params_id_type: typeof req.params.id,
        status,
        description,
        affiliate_id,
        environment: process.env.NODE_ENV || 'development'
      });
      
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
      
      // Tìm khách hàng theo ID thay vì sử dụng index - cải thiện so sánh
      console.log(`Detailed customer check - Looking for ID ${customerId} in:`, 
        affiliate.referred_customers.map(c => ({ id: c.id, type: typeof c.id }))
      );
      
      const customerIndex = affiliate.referred_customers.findIndex(customer => {
        // So sánh trực tiếp
        if (customer.id === customerId) return true;
        
        // So sánh khi convert thành số
        if (typeof customer.id === 'string' && !isNaN(Number(customer.id)) && Number(customer.id) === customerId) return true;
        
        // So sánh khi convert thành chuỗi
        if (typeof customerId === 'number' && customer.id !== undefined && customer.id.toString() === customerId.toString()) return true;
        
        return false;
      });
      
      console.log(`Customer search result: index=${customerIndex} for ID=${customerId}`);
      
      if (customerIndex === -1) {
        return res.status(404).json({
          status: "error",
          error: {
            code: "NOT_FOUND", 
            message: `Customer with ID ${customerId} not found for affiliate ${affiliate_id}`
          }
        });
      }
      
      // Tạo đối tượng khách hàng cập nhật - thêm contract_value nếu có
      let customerUpdate = {
        id: customerId,
        status: validatedStatus,
        note: description || ""
      };
      
      // Nếu có giá trị hợp đồng và khách hàng chuyển sang trạng thái "Đã chốt hợp đồng", đưa vào req
      if (contract_value && validatedStatus === "Đã chốt hợp đồng") {
        console.log(`Including contract_value in customer update: ${contract_value}`);
        (customerUpdate as any).contract_value = parseFloat(contract_value);
      }
      
      // Update the customer status using the customer ID instead of index
      // Truyền giá trị hợp đồng nếu có trong request
      let updatedCustomer;
      
      if (contract_value && validatedStatus === "Đã chốt hợp đồng") {
        // Sử dụng updateCustomerWithContract nếu có giá trị hợp đồng
        const contractValueNum = parseFloat(contract_value);
        console.log(`Updating customer with contract value: ${contractValueNum}`);
        
        updatedCustomer = await storage.updateCustomerWithContract(
          customerId,
          {
            id: customerId,
            status: validatedStatus,
            note: description || "",
            customer_name: affiliate.referred_customers[customerIndex].customer_name,
            contract_value: contractValueNum,
            // Thêm các trường cần thiết khác
            created_at: affiliate.referred_customers[customerIndex].created_at,
            updated_at: new Date().toISOString()
          },
          {
            contract_value: contractValueNum,
            received_balance: contractValueNum * 0.03, // 3% hoa hồng
            remaining_balance: contractValueNum * 0.03 // 3% hoa hồng
          },
          affiliate_id
        );
      } else {
        // Sử dụng updateCustomerStatus nếu không có giá trị hợp đồng
        updatedCustomer = await storage.updateCustomerStatus(
          affiliate_id,
          customerId, 
          validatedStatus, 
          description || ""
        );
      }
      
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
      
      // Kiểm tra kết nối database
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
      
      res.json({
        status: "success",
        data: {
          storage_type: storageType,
          database_status: dbStatus,
          environment: process.env.NODE_ENV || "development",
          use_database: true,
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
        // Mảng chứa các webhook URL để gửi dữ liệu cập nhật trạng thái
        const webhookUrls = [
          "https://auto.autogptvn.com/webhook-test/cap-nhat-trang-thai-rut-tien",
          "https://auto.autogptvn.com/webhook/cap-nhat-trang-thai-rut-tien"
        ];
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
  
  // Thiết lập routes quản lý KOL/VIP
  try {
    // Sử dụng cùng một loại storage cho tất cả các module để đảm bảo tính nhất quán
    console.log("Setting up KOL/VIP routes with DatabaseStorage");
    setupKolVipRoutes(app, storage);
    
    // Thiết lập routes quản lý KOL/VIP cho admin
    const adminRouter = Router();
    app.use('/api/admin', setupAdminKolRoutes(adminRouter, storage));
    console.log("Setting up Admin KOL/VIP routes with DatabaseStorage");
  } catch (error) {
    console.error("Error setting up KOL/VIP routes:", error);
  }

  // Thiết lập routes API cho hoa hồng
  app.use("/api/commission", commissionRouter);

  // Thiết lập API cho videos và sales kits
  setupResourceRoutes(app);
  
  // Setup webhook routes để nhận yêu cầu thanh toán từ Normal và Partner
  app.use('/api/webhooks', webhookRoutes);

  const httpServer = createServer(app);

  return httpServer;
}

// Hàm thiết lập API cho video và sales kit
function setupResourceRoutes(app: Express) {
  // GET all videos
  app.get('/api/videos', async (req, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json({
        status: 'success',
        data: { videos }
      });
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({
        status: 'error',
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch videos'
        }
      });
    }
  });

  // GET top videos
  app.get('/api/videos/top', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const videos = await storage.getTopVideos(limit);
      res.json({
        status: 'success',
        data: { videos }
      });
    } catch (error) {
      console.error('Error fetching top videos:', error);
      res.status(500).json({
        status: 'error',
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch top videos'
        }
      });
    }
  });

  // POST add new video (admin only)
  app.post('/api/videos', requireAdmin, async (req, res) => {
    try {
      const videoData = VideoDataSchema.parse(req.body);
      const newVideo = await storage.addVideo(videoData);
      
      if (!newVideo) {
        return res.status(400).json({
          status: 'error',
          error: {
            code: 'INVALID_DATA',
            message: 'Failed to add video with provided data'
          }
        });
      }
      
      res.status(201).json({
        status: 'success',
        data: { video: newVideo }
      });
    } catch (error) {
      console.error('Error adding video:', error);
      res.status(400).json({
        status: 'error',
        error: {
          code: 'INVALID_DATA',
          message: error instanceof Error ? error.message : 'Invalid video data'
        }
      });
    }
  });

  // PUT update video (admin only)
  app.put('/api/videos/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const videoData = req.body;
      
      const updatedVideo = await storage.updateVideo(id, videoData);
      
      if (!updatedVideo) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: 'Video not found'
          }
        });
      }
      
      res.json({
        status: 'success',
        data: { video: updatedVideo }
      });
    } catch (error) {
      console.error('Error updating video:', error);
      res.status(400).json({
        status: 'error',
        error: {
          code: 'INVALID_DATA',
          message: error instanceof Error ? error.message : 'Invalid video data'
        }
      });
    }
  });

  // DELETE video (admin only)
  app.delete('/api/videos/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteVideo(id);
      
      if (!success) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: 'Video not found or already deleted'
          }
        });
      }
      
      res.json({
        status: 'success',
        data: { message: 'Video deleted successfully' }
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({
        status: 'error',
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to delete video'
        }
      });
    }
  });

  // GET all sales kits
  app.get('/api/sales-kits', async (req, res) => {
    try {
      const salesKits = await storage.getAllSalesKits();
      res.json({
        status: 'success',
        data: { salesKits }
      });
    } catch (error) {
      console.error('Error fetching sales kits:', error);
      res.status(500).json({
        status: 'error',
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch sales kits'
        }
      });
    }
  });

  // POST add new sales kit (admin only)
  app.post('/api/sales-kits', requireAdmin, async (req, res) => {
    try {
      const kitData = SalesKitDataSchema.parse(req.body);
      const newKit = await storage.addSalesKit(kitData);
      
      if (!newKit) {
        return res.status(400).json({
          status: 'error',
          error: {
            code: 'INVALID_DATA',
            message: 'Failed to add sales kit with provided data'
          }
        });
      }
      
      res.status(201).json({
        status: 'success',
        data: { salesKit: newKit }
      });
    } catch (error) {
      console.error('Error adding sales kit:', error);
      res.status(400).json({
        status: 'error',
        error: {
          code: 'INVALID_DATA',
          message: error instanceof Error ? error.message : 'Invalid sales kit data'
        }
      });
    }
  });

  // PUT update sales kit (admin only)
  app.put('/api/sales-kits/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const kitData = req.body;
      
      const updatedKit = await storage.updateSalesKit(id, kitData);
      
      if (!updatedKit) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: 'Sales kit not found'
          }
        });
      }
      
      res.json({
        status: 'success',
        data: { salesKit: updatedKit }
      });
    } catch (error) {
      console.error('Error updating sales kit:', error);
      res.status(400).json({
        status: 'error',
        error: {
          code: 'INVALID_DATA',
          message: error instanceof Error ? error.message : 'Invalid sales kit data'
        }
      });
    }
  });

  // DELETE sales kit (admin only)
  app.delete('/api/sales-kits/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSalesKit(id);
      
      if (!success) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: 'Sales kit not found or already deleted'
          }
        });
      }
      
      res.json({
        status: 'success',
        data: { message: 'Sales kit deleted successfully' }
      });
    } catch (error) {
      console.error('Error deleting sales kit:', error);
      res.status(500).json({
        status: 'error',
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to delete sales kit'
        }
      });
    }
  });

  // POST increment downloads count for a sales kit
  app.post('/api/sales-kits/:id/download', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const newDownloads = await storage.incrementSalesKitDownloads(id);
      
      if (newDownloads === undefined) {
        return res.status(404).json({
          status: 'error',
          error: {
            code: 'NOT_FOUND',
            message: 'Sales kit not found'
          }
        });
      }
      
      res.json({
        status: 'success',
        data: { downloads: newDownloads }
      });
    } catch (error) {
      console.error('Error incrementing downloads:', error);
      res.status(500).json({
        status: 'error',
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to record download'
        }
      });
    }
  });
}
