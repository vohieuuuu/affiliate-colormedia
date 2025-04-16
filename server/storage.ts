import { 
  Affiliate, 
  TopAffiliate, 
  ReferredCustomer, 
  WithdrawalHistory,
  WithdrawalRequestPayload,
  InsertAffiliate,
  CustomerStatusType
} from "@shared/schema";
import { DatabaseStorage } from "./databaseStorage";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  getCurrentAffiliate(): Promise<Affiliate | undefined>;
  getTopAffiliates(): Promise<TopAffiliate[]>;
  addWithdrawalRequest(request: WithdrawalRequestPayload): Promise<void>;
  createAffiliate(affiliateData: InsertAffiliate): Promise<Affiliate>;
  getAffiliateByAffiliateId(affiliateId: string): Promise<Affiliate | undefined>;
  addReferredCustomer(affiliateId: number, customerData: ReferredCustomer): Promise<void>;
  updateCustomerStatus(customerId: number, status: CustomerStatusType, description: string): Promise<ReferredCustomer | undefined>;
  seedData(affiliatesCount: number, customersPerAffiliate: number, withdrawalsPerAffiliate: number): Promise<{ affiliates_added: number, customers_added: number, withdrawals_added: number }>;
}

export class MemStorage implements IStorage {
  private affiliate: Affiliate;
  private topAffiliates: TopAffiliate[];

  constructor() {
    // Mock data for a sample affiliate
    this.affiliate = {
      id: 1,
      user_id: 1, // Thêm liên kết đến user_id
      affiliate_id: "AFF123",
      full_name: "Nguyen Van A",
      email: "a.nguyen@example.com",
      phone: "0987654321",
      bank_account: "0123456789",
      bank_name: "TPBank",
      total_contacts: 36,
      total_contracts: 12,
      contract_value: 240000000,
      received_balance: 48000000,
      paid_balance: 24000000,
      remaining_balance: 24000000,
      referred_customers: this.generateReferredCustomers(),
      withdrawal_history: this.generateWithdrawalHistory()
    };

    // Mock data for top affiliates
    this.topAffiliates = [
      {
        id: 2,
        full_name: "Jane Cooper",
        contract_value: 320000000,
        total_contracts: 15,
      },
      {
        id: 1,
        full_name: "Nguyen Van A",
        contract_value: 240000000,
        total_contracts: 12,
      },
      {
        id: 3,
        full_name: "Tran Van B",
        contract_value: 210000000,
        total_contracts: 11,
      },
      {
        id: 4,
        full_name: "Le Thi C",
        contract_value: 180000000,
        total_contracts: 9,
      },
      {
        id: 5,
        full_name: "Pham Van D",
        contract_value: 150000000,
        total_contracts: 8,
      }
    ];
  }

  // Generate mock referred customers
  private generateReferredCustomers(): ReferredCustomer[] {
    return [
      {
        customer_name: "ABC Company",
        status: "Contract signed",
        updated_at: "2023-12-15T00:00:00Z",
        note: "Customer agreed to a 12-month contract worth 50,000,000 VND."
      },
      {
        customer_name: "XYZ Corporation",
        status: "Presenting idea",
        updated_at: "2024-03-28T00:00:00Z"
      },
      {
        customer_name: "123 Industries",
        status: "Pending reconciliation",
        updated_at: "2024-04-02T00:00:00Z"
      },
      {
        customer_name: "Tech Solutions Ltd",
        status: "Ready to disburse",
        updated_at: "2024-04-05T00:00:00Z"
      },
      {
        customer_name: "Global Traders",
        status: "Contact received",
        updated_at: "2024-04-10T00:00:00Z"
      }
    ];
  }

  // Generate mock withdrawal history
  private generateWithdrawalHistory(): WithdrawalHistory[] {
    return [
      {
        request_date: "2024-04-15T00:00:00Z",
        amount: 5000000,
        note: "Commission for March",
        status: "Processing"
      },
      {
        request_date: "2024-03-14T00:00:00Z",
        amount: 8000000,
        note: "Commission for February",
        status: "Completed"
      },
      {
        request_date: "2024-02-15T00:00:00Z",
        amount: 6000000,
        note: "Commission for January",
        status: "Completed"
      },
      {
        request_date: "2024-01-15T00:00:00Z",
        amount: 5000000,
        note: "Commission for December",
        status: "Completed"
      }
    ];
  }

  async getCurrentAffiliate(): Promise<Affiliate | undefined> {
    return this.affiliate;
  }

  async getTopAffiliates(): Promise<TopAffiliate[]> {
    return this.topAffiliates;
  }

  async addWithdrawalRequest(request: WithdrawalRequestPayload): Promise<void> {
    // Add to withdrawal history
    this.affiliate.withdrawal_history.unshift({
      request_date: request.request_time,
      amount: request.amount_requested,
      note: request.note || "",
      status: "Processing"
    });

    // Update remaining balance (would be updated by an external system in a real app)
    this.affiliate.remaining_balance -= request.amount_requested;
  }

  async getAffiliateByAffiliateId(affiliateId: string): Promise<Affiliate | undefined> {
    // In memory storage, check if the affiliateId matches our current affiliate
    if (this.affiliate.affiliate_id === affiliateId) {
      return this.affiliate;
    }
    return undefined;
  }

  async createAffiliate(affiliateData: InsertAffiliate): Promise<Affiliate> {
    // In a real implementation, this would add to the database
    // For the in-memory store, we'll simulate adding a new affiliate
    const newId = this.topAffiliates.length + 2; // +2 because we already have affiliates starting from ID 1
    
    // Create the affiliate object with default values for the stats
    const newAffiliate: Affiliate = {
      id: newId,
      user_id: affiliateData.user_id || null, // Sử dụng user_id từ dữ liệu đầu vào nếu có
      affiliate_id: affiliateData.affiliate_id,
      full_name: affiliateData.full_name,
      email: affiliateData.email,
      phone: affiliateData.phone,
      bank_account: affiliateData.bank_account,
      bank_name: affiliateData.bank_name,
      total_contacts: 0,
      total_contracts: 0,
      contract_value: 0,
      received_balance: 0,
      paid_balance: 0,
      remaining_balance: 0,
      referred_customers: [],
      withdrawal_history: []
    };
    
    // Add to our top affiliates list
    this.topAffiliates.push({
      id: newAffiliate.id,
      full_name: newAffiliate.full_name,
      contract_value: 0,
      total_contracts: 0
    });
    
    // Sort top affiliates by contract value in descending order
    this.topAffiliates.sort((a, b) => b.contract_value - a.contract_value);
    
    // Return the new affiliate
    return newAffiliate;
  }

  async addReferredCustomer(affiliateId: number, customerData: ReferredCustomer): Promise<void> {
    // For the in-memory store, we'll only add to the current affiliate's list
    if (this.affiliate.id === affiliateId) {
      this.affiliate.referred_customers.unshift({
        ...customerData,
        updated_at: new Date().toISOString()
      });
      
      // Update the affiliate stats
      this.affiliate.total_contacts += 1;
      
      // If status is "Contract signed", update contracts count and value
      if (customerData.status === "Contract signed") {
        this.affiliate.total_contracts += 1;
        // Assume contract value from the note or a default value
        const defaultValue = 20000000; // Default 20M VND
        this.affiliate.contract_value += defaultValue;
        this.affiliate.remaining_balance += defaultValue * 0.1; // 10% commission
        this.affiliate.received_balance += defaultValue * 0.1;
        
        // Update in top affiliates list
        const affiliateInTop = this.topAffiliates.find(a => a.id === affiliateId);
        if (affiliateInTop) {
          affiliateInTop.total_contracts += 1;
          affiliateInTop.contract_value += defaultValue;
          // Re-sort the list
          this.topAffiliates.sort((a, b) => b.contract_value - a.contract_value);
        }
      }
    }
  }

  async updateCustomerStatus(customerId: number, status: CustomerStatusType, description: string): Promise<ReferredCustomer | undefined> {
    // Since we're using an in-memory store with array,
    // we'll use the index in the array as a proxy for ID
    // In a real DB implementation, we would query by actual ID
    if (customerId >= 0 && customerId < this.affiliate.referred_customers.length) {
      const customer = this.affiliate.referred_customers[customerId];
      
      // Update the customer status
      customer.status = status;
      customer.note = description;
      customer.updated_at = new Date().toISOString();
      
      // If the status is changed to "Contract signed", update contracts count and value
      if (status === "Contract signed" && this.affiliate.referred_customers[customerId].status !== "Contract signed") {
        this.affiliate.total_contracts += 1;
        // Assume contract value from the description or a default value
        const defaultValue = 20000000; // Default 20M VND
        this.affiliate.contract_value += defaultValue;
        this.affiliate.remaining_balance += defaultValue * 0.1; // 10% commission
        this.affiliate.received_balance += defaultValue * 0.1;
        
        // Update in top affiliates list
        const affiliateInTop = this.topAffiliates.find(a => a.id === this.affiliate.id);
        if (affiliateInTop) {
          affiliateInTop.total_contracts += 1;
          affiliateInTop.contract_value += defaultValue;
          // Re-sort the list
          this.topAffiliates.sort((a, b) => b.contract_value - a.contract_value);
        }
      }
      
      return customer;
    }
    
    return undefined;
  }

  async seedData(affiliatesCount: number, customersPerAffiliate: number, withdrawalsPerAffiliate: number): Promise<{ affiliates_added: number, customers_added: number, withdrawals_added: number }> {
    // For the in-memory store, we'll just generate random data
    // In a real implementation, this would insert data into the database
    
    const affiliates_added = Math.min(affiliatesCount, 20); // Limit to 20 for performance
    const customers_added = affiliates_added * Math.min(customersPerAffiliate, 10); // Limit to 10 per affiliate
    const withdrawals_added = affiliates_added * Math.min(withdrawalsPerAffiliate, 5); // Limit to 5 per affiliate
    
    // This function would add sample data to the database
    // Here in memory implementation we'll just return the counts
    
    return {
      affiliates_added,
      customers_added,
      withdrawals_added
    };
  }
}

// Chọn loại storage dựa vào môi trường hoặc biến env
// Mặc định sử dụng MemStorage trong development để dễ test
export const storage = process.env.USE_DATABASE === "true" || process.env.NODE_ENV === "production" 
  ? new DatabaseStorage() 
  : new MemStorage();
