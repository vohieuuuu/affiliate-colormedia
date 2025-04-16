import { 
  Affiliate, 
  TopAffiliate, 
  ReferredCustomer, 
  WithdrawalHistory,
  WithdrawalRequestPayload,
  InsertAffiliate,
  CustomerStatusType,
  User,
  UserRoleType,
  InsertOtpVerification,
  OtpVerification
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
  getAffiliateByUserId(userId: number): Promise<Affiliate | undefined>; // Phương thức mới để lấy affiliate từ user_id
  addReferredCustomer(affiliateId: number, customerData: ReferredCustomer): Promise<void>;
  updateCustomerStatus(customerId: number, status: CustomerStatusType, description: string): Promise<ReferredCustomer | undefined>;
  seedData(affiliatesCount: number, customersPerAffiliate: number, withdrawalsPerAffiliate: number): Promise<{ affiliates_added: number, customers_added: number, withdrawals_added: number }>;
  
  // Phương thức quản lý user
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(userData: { username: string; password: string; role: UserRoleType; is_first_login?: boolean }): Promise<User>;
  getUserById(id: number): Promise<User | undefined>;
  updateUserPassword(userId: number, password: string): Promise<void>;
  markFirstLoginComplete(userId: number): Promise<void>;
  
  // Phương thức quản lý OTP
  createOtp(userId: number, verificationType: string, relatedId?: number): Promise<string>;
  verifyOtp(userId: number, otpCode: string, verificationType: string): Promise<boolean>;
  increaseOtpAttempt(userId: number, otpCode: string): Promise<number>;
  invalidateOtp(userId: number, otpCode: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private affiliate: Affiliate;
  private topAffiliates: TopAffiliate[];
  private users: User[] = []; // Mảng lưu trữ người dùng mẫu
  private otpVerifications: OtpVerification[] = []; // Mảng lưu trữ các mã OTP

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
        request_date: "2024-04-10T00:00:00Z",
        amount: 3000000,
        note: "Advance payment",
        status: "Rejected",
        message: "Số tiền yêu cầu vượt quá số dư khả dụng"
      },
      {
        request_date: "2024-03-14T00:00:00Z",
        amount: 8000000,
        note: "Commission for February",
        status: "Completed",
        transaction_id: "TXN-202403-001",
        completed_date: "2024-03-16T00:00:00Z"
      },
      {
        request_date: "2024-02-15T00:00:00Z",
        amount: 6000000,
        note: "Commission for January",
        status: "Completed",
        transaction_id: "TXN-202402-003",
        completed_date: "2024-02-17T00:00:00Z"
      },
      {
        request_date: "2024-01-15T00:00:00Z",
        amount: 5000000,
        note: "Commission for December 2023",
        status: "Completed",
        transaction_id: "TXN-202401-008",
        completed_date: "2024-01-17T00:00:00Z"
      },
      {
        request_date: "2023-12-15T00:00:00Z",
        amount: 7500000,
        note: "Commission for November 2023",
        status: "Completed",
        transaction_id: "TXN-202312-012",
        completed_date: "2023-12-18T00:00:00Z"
      },
      {
        request_date: "2023-11-15T00:00:00Z",
        amount: 4500000,
        note: "Commission for October 2023",
        status: "Completed",
        transaction_id: "TXN-202311-022",
        completed_date: "2023-11-18T00:00:00Z"
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
  
  // Phương thức mới: Lấy affiliate theo user_id
  async getAffiliateByUserId(userId: number): Promise<Affiliate | undefined> {
    console.log(`Looking for affiliate with user_id: ${userId}`);
    
    // Tìm kiếm user trong danh sách người dùng
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      console.log(`No user found with ID ${userId}`);
      return undefined;
    }
    
    // Kiểm tra nếu user là role AFFILIATE
    if (user.role !== "AFFILIATE") {
      console.log(`User ${userId} is not an affiliate`);
      return undefined;
    }
    
    // Nếu là user từ reset-data, trả về affiliate tương ứng
    if (userId === 2) {
      console.log("Returning affiliate1 for user_id 2");
      return {
        id: 2,
        user_id: 2,
        affiliate_id: "AFF101",
        full_name: "Nguyễn Văn A",
        email: "affiliate1@colormedia.vn",
        phone: "0901234567",
        bank_account: "0123456789",
        bank_name: "TPBank",
        total_contacts: 25,
        total_contracts: 8,
        contract_value: 180000000,
        received_balance: 36000000,
        paid_balance: 18000000,
        remaining_balance: 80000000,
        referred_customers: this.generateReferredCustomers(),
        withdrawal_history: this.generateWithdrawalHistory()
      };
    } else if (userId === 3) {
      console.log("Returning affiliate2 for user_id 3");
      return {
        id: 3,
        user_id: 3,
        affiliate_id: "AFF102",
        full_name: "Trần Thị B",
        email: "affiliate2@colormedia.vn",
        phone: "0909876543",
        bank_account: "9876543210",
        bank_name: "Vietcombank",
        total_contacts: 18,
        total_contracts: 6,
        contract_value: 150000000,
        received_balance: 30000000,
        paid_balance: 15000000,
        remaining_balance: 75000000,
        referred_customers: this.generateReferredCustomers(),
        withdrawal_history: this.generateWithdrawalHistory()
      };
    }
    
    // Kiểm tra với affiliate hiện tại
    if (this.affiliate && this.affiliate.user_id === userId) {
      return this.affiliate;
    }
    
    // Nếu không tìm thấy, tạo một affiliate mặc định cho user đó
    console.log(`Creating default affiliate for user ${userId}`);
    return {
      id: userId,
      user_id: userId,
      affiliate_id: `AFF${100 + userId}`,
      full_name: user.username.split('@')[0],
      email: user.username,
      phone: "0900000000",
      bank_account: "0000000000",
      bank_name: "Color Bank",
      total_contacts: 0,
      total_contracts: 0,
      contract_value: 0,
      received_balance: 0,
      paid_balance: 0,
      remaining_balance: 0,
      referred_customers: [],
      withdrawal_history: []
    };
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

  // -- Phương thức quản lý người dùng --

  // Lấy người dùng theo tên đăng nhập
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  // Tạo người dùng mới
  async createUser(userData: { username: string; password: string; role: UserRoleType; is_first_login?: boolean }): Promise<User> {
    const newId = this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1;
    
    const newUser: User = {
      id: newId,
      username: userData.username,
      password: userData.password,
      role: userData.role,
      is_active: 1,
      is_first_login: userData.is_first_login ? 1 : 0,
      last_login: null,
      token: null,
      created_at: new Date()
    };
    
    this.users.push(newUser);
    console.log(`DEV MODE: Created new user "${userData.username}" with role "${userData.role}"`);
    
    return newUser;
  }

  // Lấy người dùng theo ID
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  // Cập nhật mật khẩu người dùng
  async updateUserPassword(userId: number, password: string): Promise<void> {
    const userIndex = this.users.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].password = password;
      console.log(`DEV MODE: Updated password for user ID ${userId}`);
    }
  }

  // Đánh dấu đã hoàn thành đăng nhập lần đầu
  async markFirstLoginComplete(userId: number): Promise<void> {
    const userIndex = this.users.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].is_first_login = 0;
      console.log(`DEV MODE: Marked first login complete for user ID ${userId}`);
    }
  }
  
  // -- Phương thức quản lý OTP --
  
  /**
   * Tạo mã OTP mới
   * @param userId ID của người dùng
   * @param verificationType Loại xác thực (WITHDRAWAL, PASSWORD_RESET, etc.)
   * @param relatedId ID của đối tượng liên quan (ví dụ: ID của yêu cầu rút tiền)
   * @returns Mã OTP đã tạo
   */
  async createOtp(userId: number, verificationType: string, relatedId?: number): Promise<string> {
    // Tạo mã OTP 6 chữ số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Tạo thời gian hết hạn (5 phút từ hiện tại)
    const expireAt = new Date();
    expireAt.setMinutes(expireAt.getMinutes() + 5);
    
    // Tạo bản ghi OTP mới
    const newOtp: OtpVerification = {
      id: this.otpVerifications.length + 1,
      user_id: userId,
      otp_code: otpCode,
      verification_type: verificationType,
      related_id: relatedId || null,
      expire_at: expireAt,
      created_at: new Date(),
      is_used: 0,
      attempt_count: 0
    };
    
    // Thêm vào mảng OTP
    this.otpVerifications.push(newOtp);
    
    console.log(`DEV MODE: Created OTP ${otpCode} for user ID ${userId}, expires at ${expireAt.toISOString()}`);
    
    return otpCode;
  }
  
  /**
   * Xác thực mã OTP
   * @param userId ID của người dùng
   * @param otpCode Mã OTP cần xác thực
   * @param verificationType Loại xác thực
   * @returns true nếu OTP hợp lệ, false nếu không
   */
  async verifyOtp(userId: number, otpCode: string, verificationType: string): Promise<boolean> {
    // Tìm OTP phù hợp với điều kiện
    const otpIndex = this.otpVerifications.findIndex(
      otp => otp.user_id === userId &&
            otp.otp_code === otpCode &&
            otp.verification_type === verificationType &&
            otp.is_used === 0 &&
            otp.expire_at > new Date() &&
            otp.attempt_count < 5
    );
    
    if (otpIndex === -1) {
      console.log(`DEV MODE: OTP verification failed for user ID ${userId}`);
      return false;
    }
    
    // Đánh dấu OTP đã được sử dụng
    this.otpVerifications[otpIndex].is_used = 1;
    
    console.log(`DEV MODE: OTP verified successfully for user ID ${userId}`);
    return true;
  }
  
  /**
   * Tăng số lần thử sai OTP
   * @param userId ID của người dùng
   * @param otpCode Mã OTP
   * @returns Số lần thử hiện tại sau khi tăng
   */
  async increaseOtpAttempt(userId: number, otpCode: string): Promise<number> {
    const otpIndex = this.otpVerifications.findIndex(
      otp => otp.user_id === userId &&
            otp.otp_code === otpCode &&
            otp.is_used === 0
    );
    
    if (otpIndex === -1) {
      return 0;
    }
    
    // Tăng số lần thử
    this.otpVerifications[otpIndex].attempt_count += 1;
    
    // Nếu đã thử quá 5 lần, đánh dấu là đã sử dụng (không thể dùng được nữa)
    if (this.otpVerifications[otpIndex].attempt_count >= 5) {
      this.otpVerifications[otpIndex].is_used = 1;
    }
    
    console.log(`DEV MODE: Increased OTP attempt for user ID ${userId}, current attempts: ${this.otpVerifications[otpIndex].attempt_count}`);
    
    return this.otpVerifications[otpIndex].attempt_count;
  }
  
  /**
   * Đánh dấu OTP không còn hiệu lực
   * @param userId ID của người dùng
   * @param otpCode Mã OTP
   */
  async invalidateOtp(userId: number, otpCode: string): Promise<void> {
    const otpIndex = this.otpVerifications.findIndex(
      otp => otp.user_id === userId &&
            otp.otp_code === otpCode
    );
    
    if (otpIndex !== -1) {
      this.otpVerifications[otpIndex].is_used = 1;
      console.log(`DEV MODE: Invalidated OTP for user ID ${userId}`);
    }
  }
}

// Chọn loại storage dựa vào môi trường hoặc biến env
// Mặc định sử dụng MemStorage trong development để dễ test
export const storage = process.env.USE_DATABASE === "true" || process.env.NODE_ENV === "production" 
  ? new DatabaseStorage() 
  : new MemStorage();
