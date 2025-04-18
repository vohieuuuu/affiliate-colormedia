import { pgTable, text, serial, integer, timestamp, json, varchar, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod/zod";

// Define the status type for referred customer stages
export const CustomerStatus = z.enum([
  "Mới nhập",        // 🟡 Contact vừa được tạo, chưa xử lý
  "Đang tư vấn",     // 🔵 Đã có sale gọi điện hoặc tiếp cận
  "Chờ phản hồi",    // 🟠 Đã gửi báo giá hoặc thông tin thêm
  "Đã chốt hợp đồng", // 🟢 Thành công, được tính hoa hồng
  "Không tiềm năng"   // 🔴 Không còn nhu cầu, loại khỏi KPI
]);

export type CustomerStatusType = z.infer<typeof CustomerStatus>;

// Withdrawal status type
export const WithdrawalStatus = z.enum([
  "Pending",     // Đang chờ xử lý
  "Processing",  // Đang xử lý, đã trừ số dư
  "Completed",   // Đã hoàn thành
  "Rejected",    // Đã từ chối
  "Cancelled"    // Đã hủy bởi affiliate
]);

export type WithdrawalStatusType = z.infer<typeof WithdrawalStatus>;



// User role type
export const UserRole = z.enum([
  "ADMIN",        // Quản trị viên
  "AFFILIATE",    // Người giới thiệu
  "MANAGER"       // Quản lý
]);

export type UserRoleType = z.infer<typeof UserRole>;

// Referred customer details type
export const ReferredCustomerSchema = z.object({
  id: z.number().optional(), // Thêm ID cho khách hàng
  affiliate_id: z.string().optional(), // ID của affiliate sở hữu khách hàng
  customer_name: z.string(),
  status: CustomerStatus,
  created_at: z.string().default(() => new Date().toISOString()), // Thời điểm tạo khách hàng
  updated_at: z.string(),
  contract_value: z.number().optional(), // Giá trị hợp đồng
  commission: z.number().optional(), // Hoa hồng tính được
  contract_date: z.string().optional(), // Ngày ký hợp đồng
  note: z.string().optional(),
  phone: z.string().optional(), // Số điện thoại khách hàng
  email: z.string().optional(), // Email khách hàng
});

export type ReferredCustomer = z.infer<typeof ReferredCustomerSchema>;

// Withdrawal history type
export const WithdrawalHistorySchema = z.object({
  request_date: z.string(),
  amount: z.number(),
  note: z.string().optional(),
  status: WithdrawalStatus,
  message: z.string().optional(),
  transaction_id: z.string().optional(),
  completed_date: z.string().optional(),
});

export type WithdrawalHistory = z.infer<typeof WithdrawalHistorySchema>;

// Define users schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).$type<UserRoleType>().notNull().default("AFFILIATE"),
  is_active: integer("is_active").notNull().default(1),
  is_first_login: integer("is_first_login").notNull().default(0), // Đánh dấu user cần đổi mật khẩu
  last_login: timestamp("last_login"),
  token: varchar("token", { length: 255 }),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Define affiliate schema
export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id), // Reference to users table
  affiliate_id: text("affiliate_id").notNull().unique(),
  full_name: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  bank_account: text("bank_account").notNull(),
  bank_name: text("bank_name").notNull(),
  total_contacts: integer("total_contacts").notNull().default(0),
  total_contracts: integer("total_contracts").notNull().default(0),
  contract_value: integer("contract_value").notNull().default(0),
  received_balance: integer("received_balance").notNull().default(0),
  paid_balance: integer("paid_balance").notNull().default(0),
  remaining_balance: integer("remaining_balance").notNull().default(0),
  referred_customers: json("referred_customers").$type<ReferredCustomer[]>().notNull().default([]),
  withdrawal_history: json("withdrawal_history").$type<WithdrawalHistory[]>().notNull().default([]),
});

// Withdrawal request schema
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  affiliate_id: integer("affiliate_id").references(() => affiliates.id), // Reference to affiliates table
  full_name: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  bank_account: text("bank_account").notNull(),
  bank_name: text("bank_name").notNull(),
  amount_requested: integer("amount_requested").notNull(),
  note: text("note"),
  request_time: timestamp("request_time").notNull().defaultNow(),
  is_verified: integer("is_verified").notNull().default(0), // 0: chưa xác thực, 1: đã xác thực
});

// OTP verification schema
export const otpVerifications = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id), // Reference to users table
  otp_code: varchar("otp_code", { length: 10 }).notNull(), // Mã OTP
  verification_type: varchar("verification_type", { length: 30 }).notNull().default("WITHDRAWAL"), // Loại xác thực
  related_id: integer("related_id"), // ID của yêu cầu liên quan (ví dụ: ID của withdrawal_request)
  expire_at: timestamp("expire_at").notNull(), // Thời gian hết hạn
  created_at: timestamp("created_at").notNull().defaultNow(), // Thời gian tạo
  is_used: integer("is_used").notNull().default(0), // 0: chưa dùng, 1: đã dùng
  attempt_count: integer("attempt_count").notNull().default(0), // Số lần thử nhập OTP sai
});

// Note: Relations will be implemented when we add proper drizzle-orm/relations support

// Schema for time period statistics
export const StatisticsPeriodSchema = z.enum([
  "week",
  "month",
  "year",
  "all"
]);

export type StatisticsPeriodType = z.infer<typeof StatisticsPeriodSchema>;

// Schema for customer statistics response
export const CustomerStatisticsSchema = z.object({
  totalCustomers: z.number(),
  totalContracts: z.number(),
  totalContractValue: z.number(),
  totalCommission: z.number(),
  periodType: StatisticsPeriodSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  customers: z.array(ReferredCustomerSchema)
});

export type CustomerStatistics = z.infer<typeof CustomerStatisticsSchema>;

// Schema for contract value and commission statistics by time period
export const TimeSeriesDataPointSchema = z.object({
  period: z.string(), // e.g., "2024-04" for April 2024
  contractValue: z.number(),
  commission: z.number(),
  contractCount: z.number()
});

export type TimeSeriesDataPoint = z.infer<typeof TimeSeriesDataPointSchema>;

// Schema for time series statistics response
export const TimeSeriesStatisticsSchema = z.object({
  periodType: StatisticsPeriodSchema,
  data: z.array(TimeSeriesDataPointSchema)
});

export type TimeSeriesStatistics = z.infer<typeof TimeSeriesStatisticsSchema>;

// Top affiliate schema
export const TopAffiliateSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  profile_image: z.string().optional(),
  contract_value: z.number(),
  total_contracts: z.number(),
});

export type TopAffiliate = z.infer<typeof TopAffiliateSchema>;

// Login schema
export const LoginSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(6),
});

export type LoginData = z.infer<typeof LoginSchema>;

// Registration schema
export const RegisterSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(6),
  role: UserRole.optional(),
  affiliate_data: z.object({
    affiliate_id: z.string(),
    full_name: z.string(),
    email: z.string().email(),
    phone: z.string(),
    bank_name: z.string(),
    bank_account: z.string(),
  }).optional(),
});

export type RegisterData = z.infer<typeof RegisterSchema>;

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertAffiliateSchema = createInsertSchema(affiliates);
export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests);
export const insertOtpVerificationSchema = createInsertSchema(otpVerifications);

// Define the withdrawal request payload sent to the webhook
export const withdrawalRequestPayloadSchema = z.object({
  user_id: z.string(),
  full_name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  bank_account: z.string(),
  bank_name: z.string(),
  amount_requested: z.number().positive(),
  note: z.string().optional(),
  request_time: z.string(),
});

export type WithdrawalRequestPayload = z.infer<typeof withdrawalRequestPayloadSchema>;

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type Affiliate = typeof affiliates.$inferSelect;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertOtpVerification = z.infer<typeof insertOtpVerificationSchema>;
export type OtpVerification = typeof otpVerifications.$inferSelect;

// Video schema
export const VideoSchema = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  youtube_id: text("youtube_id").notNull(), // YouTube video ID (e.g., dQw4w9WgXcQ)
  thumbnail_url: text("thumbnail_url"),
  views: integer("views"), // Số lượt xem video
  order: integer("order").notNull().default(0), // For custom ordering
  is_featured: boolean("is_featured").notNull().default(false),
  published_at: timestamp("published_at").notNull().defaultNow(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const VideoDataSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().optional(),
  youtube_id: z.string(),
  thumbnail_url: z.string().optional(),
  views: z.number().optional(),
  order: z.number(),
  is_featured: z.boolean().default(false),
  published_at: z.string(),
  created_at: z.string(),
});

export type VideoData = z.infer<typeof VideoDataSchema>;

// Schema for storing videos in memory storage
export const VideoCollectionSchema = z.object({
  videos: z.array(VideoDataSchema),
});

export type VideoCollection = z.infer<typeof VideoCollectionSchema>;

export const insertVideoSchema = createInsertSchema(VideoSchema);
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof VideoSchema.$inferSelect;
