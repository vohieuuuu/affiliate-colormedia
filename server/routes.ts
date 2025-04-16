import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  withdrawalRequestPayloadSchema, 
  insertAffiliateSchema, 
  ReferredCustomerSchema, 
  CustomerStatus,
  UserRoleType,
  User
} from "@shared/schema";

// Extend Express.Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
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

// Middleware xác thực người dùng dựa trên token trong database
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
      // Trong môi trường phát triển không sử dụng database, sử dụng token mặc định
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

export async function registerRoutes(app: Express): Promise<Server> {
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
  app.get("/api/affiliate", async (req, res) => {
    try {
      const affiliate = await storage.getCurrentAffiliate();
      if (!affiliate) {
        return res.status(404).json({ message: "Affiliate not found" });
      }
      res.json(affiliate);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve affiliate data" });
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

  // API endpoint to submit withdrawal request
  app.post("/api/withdrawal-request", async (req, res) => {
    try {
      const { amount, note } = req.body;
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      const affiliate = await storage.getCurrentAffiliate();
      if (!affiliate) {
        return res.status(404).json({ message: "Affiliate not found" });
      }
      
      if (parseFloat(amount) > affiliate.remaining_balance) {
        return res.status(400).json({ 
          message: `Withdrawal amount exceeds available balance of ${affiliate.remaining_balance} VND` 
        });
      }
      
      // Create withdrawal request payload
      const payload = {
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
      
      // Validate the payload
      const validatedPayload = withdrawalRequestPayloadSchema.parse(payload);
      
      // In a real app, this would send a webhook to an external system
      console.log("Sending withdrawal request webhook:", validatedPayload);
      
      // Add the withdrawal request to the affiliate's history
      await storage.addWithdrawalRequest(validatedPayload);
      
      res.status(200).json({ 
        message: "Withdrawal request submitted successfully",
        request: validatedPayload
      });
    } catch (error) {
      console.error("Withdrawal request error:", error);
      res.status(500).json({ message: "Failed to submit withdrawal request" });
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
              console.log("=== TEST MODE: Simulating user creation and email sending ===");

              try {
                // Import để sử dụng hàm sendAccountActivationEmail
                const { sendAccountActivationEmail } = await import("./email");
                
                // Giả lập tạo người dùng và gửi email
                await sendAccountActivationEmail(
                  affiliateData.full_name,
                  affiliateData.email,
                  "color1234@" // Mật khẩu mặc định
                );
                
                // Tạo affiliate mới (không có user thật vì không có database)
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
