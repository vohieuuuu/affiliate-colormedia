import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  withdrawalRequestPayloadSchema, 
  insertAffiliateSchema, 
  ReferredCustomerSchema, 
  CustomerStatus
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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
      // Validate request body using Zod schema
      const affiliateData = insertAffiliateSchema.parse(req.body);
      
      // Create the affiliate in storage
      const newAffiliate = await storage.createAffiliate(affiliateData);
      
      // Return the newly created affiliate
      res.status(201).json({
        status: "success",
        data: newAffiliate
      });
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

  const httpServer = createServer(app);

  return httpServer;
}
