import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { withdrawalRequestPayloadSchema } from "@shared/schema";

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

  const httpServer = createServer(app);

  return httpServer;
}
