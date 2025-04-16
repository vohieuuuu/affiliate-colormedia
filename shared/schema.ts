import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the status type for referred customer stages
export const CustomerStatus = z.enum([
  "Contact received",
  "Presenting idea",
  "Contract signed",
  "Pending reconciliation",
  "Ready to disburse"
]);

export type CustomerStatusType = z.infer<typeof CustomerStatus>;

// Withdrawal status type
export const WithdrawalStatus = z.enum([
  "Processing",
  "Completed",
  "Rejected"
]);

export type WithdrawalStatusType = z.infer<typeof WithdrawalStatus>;

// Referred customer details type
export const ReferredCustomerSchema = z.object({
  customer_name: z.string(),
  status: CustomerStatus,
  updated_at: z.string(),
  note: z.string().optional(),
});

export type ReferredCustomer = z.infer<typeof ReferredCustomerSchema>;

// Withdrawal history type
export const WithdrawalHistorySchema = z.object({
  request_date: z.string(),
  amount: z.number(),
  note: z.string().optional(),
  status: WithdrawalStatus,
});

export type WithdrawalHistory = z.infer<typeof WithdrawalHistorySchema>;

// Define affiliate schema
export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
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
  full_name: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  bank_account: text("bank_account").notNull(),
  bank_name: text("bank_name").notNull(),
  amount_requested: integer("amount_requested").notNull(),
  note: text("note"),
  request_time: timestamp("request_time").notNull().defaultNow(),
});

// Top affiliate schema
export const TopAffiliateSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  profile_image: z.string().optional(),
  contract_value: z.number(),
  total_contracts: z.number(),
});

export type TopAffiliate = z.infer<typeof TopAffiliateSchema>;

// Insert schemas
export const insertAffiliateSchema = createInsertSchema(affiliates);
export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests);

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
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type Affiliate = typeof affiliates.$inferSelect;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
