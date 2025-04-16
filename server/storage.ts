import { 
  Affiliate, 
  TopAffiliate, 
  ReferredCustomer, 
  WithdrawalHistory,
  WithdrawalRequestPayload
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  getCurrentAffiliate(): Promise<Affiliate | undefined>;
  getTopAffiliates(): Promise<TopAffiliate[]>;
  addWithdrawalRequest(request: WithdrawalRequestPayload): Promise<void>;
}

export class MemStorage implements IStorage {
  private affiliate: Affiliate;
  private topAffiliates: TopAffiliate[];

  constructor() {
    // Mock data for a sample affiliate
    this.affiliate = {
      id: 1,
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
}

export const storage = new MemStorage();
