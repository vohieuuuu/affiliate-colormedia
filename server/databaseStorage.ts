import { 
  Affiliate, 
  TopAffiliate, 
  ReferredCustomer, 
  WithdrawalRequestPayload,
  InsertAffiliate,
  CustomerStatusType,
  affiliates,
  withdrawalRequests
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  async getCurrentAffiliate(): Promise<Affiliate | undefined> {
    // Đọc affiliate đầu tiên từ cơ sở dữ liệu
    const [affiliate] = await db.select().from(affiliates).limit(1);
    return affiliate || undefined;
  }

  async getTopAffiliates(): Promise<TopAffiliate[]> {
    // Lấy tất cả affiliate và sắp xếp theo contract_value giảm dần
    const dbAffiliates = await db.select({
      id: affiliates.id,
      full_name: affiliates.full_name,
      contract_value: affiliates.contract_value,
      total_contracts: affiliates.total_contracts
    })
    .from(affiliates)
    .orderBy(desc(affiliates.contract_value))
    .limit(10);
    
    return dbAffiliates.map(aff => ({
      id: aff.id,
      full_name: aff.full_name,
      contract_value: aff.contract_value,
      total_contracts: aff.total_contracts
    }));
  }

  async addWithdrawalRequest(request: WithdrawalRequestPayload): Promise<void> {
    // 1. Tìm affiliate dựa trên user_id
    const [affiliate] = await db.select()
      .from(affiliates)
      .where(eq(affiliates.affiliate_id, request.user_id));
    
    if (!affiliate) {
      throw new Error("Affiliate not found");
    }
    
    // 2. Thêm withdrawal request vào bảng withdrawal_requests
    await db.insert(withdrawalRequests).values({
      user_id: request.user_id,
      full_name: request.full_name,
      email: request.email,
      phone: request.phone,
      bank_account: request.bank_account,
      bank_name: request.bank_name,
      amount_requested: request.amount_requested,
      note: request.note || "",
      request_time: new Date(request.request_time)
    });
    
    // 3. Cập nhật withdrawal_history của affiliate
    const history = affiliate.withdrawal_history || [];
    history.unshift({
      request_date: request.request_time,
      amount: request.amount_requested,
      note: request.note || "",
      status: "Processing"
    });
    
    // 4. Cập nhật số dư còn lại
    const remaining_balance = affiliate.remaining_balance - request.amount_requested;
    
    // 5. Cập nhật affiliate
    await db.update(affiliates)
      .set({ 
        withdrawal_history: history,
        remaining_balance
      })
      .where(eq(affiliates.id, affiliate.id));
  }

  async createAffiliate(affiliateData: InsertAffiliate): Promise<Affiliate> {
    // Tạo affiliate mới
    const [newAffiliate] = await db.insert(affiliates)
      .values({
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
      })
      .returning();
    
    return newAffiliate;
  }

  async addReferredCustomer(affiliateId: number, customerData: ReferredCustomer): Promise<void> {
    // 1. Tìm affiliate theo ID
    const [affiliate] = await db.select()
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId));
    
    if (!affiliate) {
      throw new Error("Affiliate not found");
    }
    
    // 2. Cập nhật referred_customers
    const customers = affiliate.referred_customers || [];
    customers.unshift(customerData);
    
    // 3. Cập nhật tổng số khách hàng
    const total_contacts = affiliate.total_contacts + 1;
    
    // 4. Nếu trạng thái là "Contract signed", cập nhật hợp đồng
    let total_contracts = affiliate.total_contracts;
    let contract_value = affiliate.contract_value;
    let remaining_balance = affiliate.remaining_balance;
    let received_balance = affiliate.received_balance;
    
    if (customerData.status === "Contract signed") {
      total_contracts += 1;
      const defaultValue = 20000000; // 20M VND
      contract_value += defaultValue;
      const commission = defaultValue * 0.1; // 10% hoa hồng
      remaining_balance += commission;
      received_balance += commission;
    }
    
    // 5. Cập nhật affiliate
    await db.update(affiliates)
      .set({
        referred_customers: customers,
        total_contacts,
        total_contracts,
        contract_value,
        remaining_balance,
        received_balance
      })
      .where(eq(affiliates.id, affiliateId));
  }

  async updateCustomerStatus(customerId: number, status: CustomerStatusType, description: string): Promise<ReferredCustomer | undefined> {
    // Lưu ý: customerId là index trong mảng referred_customers
    // 1. Lấy affiliate đầu tiên (giả sử chúng ta chỉ làm việc với affiliate hiện tại)
    const [affiliate] = await db.select().from(affiliates).limit(1);
    
    if (!affiliate || !affiliate.referred_customers || customerId >= affiliate.referred_customers.length) {
      return undefined;
    }
    
    // 2. Cập nhật thông tin khách hàng
    const customers = [...affiliate.referred_customers]; // Tạo bản sao
    const oldStatus = customers[customerId].status;
    customers[customerId] = {
      ...customers[customerId],
      status,
      note: description,
      updated_at: new Date().toISOString()
    };
    
    // 3. Nếu trạng thái mới là "Contract signed" và trạng thái cũ không phải
    let total_contracts = affiliate.total_contracts;
    let contract_value = affiliate.contract_value;
    let remaining_balance = affiliate.remaining_balance;
    let received_balance = affiliate.received_balance;
    
    if (status === "Contract signed" && oldStatus !== "Contract signed") {
      total_contracts += 1;
      const defaultValue = 20000000; // 20M VND
      contract_value += defaultValue;
      const commission = defaultValue * 0.1; // 10% hoa hồng
      remaining_balance += commission;
      received_balance += commission;
    }
    
    // 4. Cập nhật affiliate
    await db.update(affiliates)
      .set({
        referred_customers: customers,
        total_contracts,
        contract_value,
        remaining_balance,
        received_balance
      })
      .where(eq(affiliates.id, affiliate.id));
    
    return customers[customerId];
  }

  async seedData(affiliatesCount: number, customersPerAffiliate: number, withdrawalsPerAffiliate: number): Promise<{ affiliates_added: number, customers_added: number, withdrawals_added: number }> {
    // Giới hạn số lượng để tránh quá tải
    const numAffiliates = Math.min(affiliatesCount, 20);
    const numCustomersPerAffiliate = Math.min(customersPerAffiliate, 10);
    const numWithdrawalsPerAffiliate = Math.min(withdrawalsPerAffiliate, 5);
    
    let affiliates_added = 0;
    let customers_added = 0;
    let withdrawals_added = 0;
    
    // Danh sách tên mẫu
    const firstNames = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng"];
    const lastNames = ["Văn", "Thị", "Đức", "Minh", "Quốc", "Thành", "Thu", "Xuân", "Hải", "Anh"];
    const middleNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"];
    const banks = ["Vietcombank", "BIDV", "Agribank", "Techcombank", "VPBank", "TPBank", "MB Bank"];
    const companyNames = ["Công ty", "Doanh nghiệp", "Tập đoàn", "Cơ sở", "Nhà máy"];
    const companySuffixes = ["TNHH", "Cổ phần", "Tư nhân", "Quốc tế", "Thương mại"];
    const industries = ["Thương mại", "Sản xuất", "Dịch vụ", "Xây dựng", "Thực phẩm"];
    
    // 1. Tạo affiliate
    for (let i = 0; i < numAffiliates; i++) {
      try {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
        const name = `${firstName} ${lastName} ${middleName}`;
        const email = `${lastName.toLowerCase()}${middleName.toLowerCase()}@example.com`;
        
        const affiliateData: InsertAffiliate = {
          affiliate_id: `AFF${1000 + i}`,
          full_name: name,
          email,
          phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
          bank_account: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          bank_name: banks[Math.floor(Math.random() * banks.length)],
        };
        
        const newAffiliate = await this.createAffiliate(affiliateData);
        affiliates_added++;
        
        // 2. Thêm khách hàng cho affiliate
        for (let j = 0; j < numCustomersPerAffiliate; j++) {
          const companyName = `${companyNames[Math.floor(Math.random() * companyNames.length)]} ${companySuffixes[Math.floor(Math.random() * companySuffixes.length)]} ${industries[Math.floor(Math.random() * industries.length)]}`;
          const status = j % 5 === 0 ? "Contract signed" : 
                        j % 4 === 0 ? "Pending reconciliation" : 
                        j % 3 === 0 ? "Presenting idea" : 
                        j % 2 === 0 ? "Ready to disburse" : "Contact received";
          
          const customerData: ReferredCustomer = {
            customer_name: companyName,
            status: status as CustomerStatusType,
            updated_at: new Date().toISOString(),
            note: `Khách hàng được giới thiệu bởi ${newAffiliate.full_name}`
          };
          
          await this.addReferredCustomer(newAffiliate.id, customerData);
          customers_added++;
        }
      } catch (error) {
        console.error("Error seeding affiliate data:", error);
      }
    }
    
    return {
      affiliates_added,
      customers_added,
      withdrawals_added: 0 // Chưa thực hiện tạo withdrawal history
    };
  }
}