import { z } from "zod";
import { affiliates, otpVerifications, users } from "@shared/schema";
import type {
  Affiliate,
  CustomerStatusType,
  InsertAffiliate,
  OtpVerification,
  ReferredCustomer,
  TopAffiliate,
  WithdrawalHistory,
  WithdrawalRequestPayload,
  WithdrawalStatusType,
  User,
  UserRoleType
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { DatabaseStorage } from "./databaseStorage";

export interface IStorage {
  getCurrentAffiliate(): Promise<Affiliate | undefined>;
  getTopAffiliates(): Promise<TopAffiliate[]>;
  addWithdrawalRequest(request: WithdrawalRequestPayload): Promise<void>;
  updateWithdrawalStatus(affiliateId: string, requestTime: string, newStatus: WithdrawalStatusType): Promise<WithdrawalHistory | undefined>;
  checkDailyWithdrawalLimit(affiliateId: string, amount: number): Promise<{exceeds: boolean, totalWithdrawn: number, remainingLimit: number}>;
  updateAffiliateBalance(affiliateId: string, amount: number): Promise<boolean>;
  createAffiliate(affiliateData: InsertAffiliate): Promise<Affiliate>;
  getAffiliateByAffiliateId(affiliateId: string): Promise<Affiliate | undefined>;
  getAffiliateByUserId(userId: number): Promise<Affiliate | undefined>; // Phương thức để lấy affiliate từ user_id
  getAffiliateByEmail(email: string): Promise<Affiliate | undefined>; // Phương thức mới để lấy affiliate từ email
  addReferredCustomer(affiliateId: string, customerData: ReferredCustomer): Promise<ReferredCustomer>;
  updateCustomerStatus(
    affiliateId: string,
    customerId: number, 
    status: CustomerStatusType, 
    description: string
  ): Promise<ReferredCustomer | undefined>;
  updateCustomerWithContract(
    customerId: number, 
    customerData: ReferredCustomer, 
    balanceUpdates: { 
      contract_value: number; 
      received_balance: number; 
      remaining_balance: number 
    }
  ): Promise<ReferredCustomer | undefined>;
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

/**
 * Lớp MemStorage là một phiên bản giả lập storage dựa trên bộ nhớ
 * được sử dụng cho mục đích phát triển khi không muốn sử dụng database
 */
export class MemStorage implements IStorage {
  /**
   * Cập nhật trạng thái yêu cầu rút tiền
   * @param affiliateId ID của affiliate
   * @param requestTime Thời gian yêu cầu
   * @param newStatus Trạng thái mới
   * @returns Thông tin yêu cầu nếu cập nhật thành công, undefined nếu không tìm thấy
   */
  async updateWithdrawalStatus(affiliateId: string, requestTime: string, newStatus: WithdrawalStatusType): Promise<WithdrawalHistory | undefined> {
    // Tìm affiliate
    const affiliate = await this.getAffiliateByAffiliateId(affiliateId);
    if (!affiliate) {
      return undefined;
    }
    
    // Tìm yêu cầu rút tiền dựa trên thời gian yêu cầu
    const withdrawalIndex = affiliate.withdrawal_history.findIndex(
      w => w.request_date === requestTime
    );
    
    if (withdrawalIndex === -1) {
      return undefined;
    }
    
    const oldStatus = affiliate.withdrawal_history[withdrawalIndex].status;
    
    // Cập nhật trạng thái
    affiliate.withdrawal_history[withdrawalIndex].status = newStatus;
    
    // Nếu trạng thái mới là "Processing" và trạng thái cũ không phải "Processing",
    // trừ tiền từ số dư khả dụng của affiliate
    if (newStatus === "Processing" && oldStatus !== "Processing") {
      const amount = affiliate.withdrawal_history[withdrawalIndex].amount;
      
      // Kiểm tra số dư
      if (affiliate.remaining_balance < amount) {
        throw new Error(`Số tiền yêu cầu vượt quá số dư khả dụng: ${affiliate.remaining_balance.toLocaleString()} VND`);
      }
      
      // Cập nhật số dư
      affiliate.remaining_balance -= amount;
      affiliate.paid_balance += amount;
    }
    
    return affiliate.withdrawal_history[withdrawalIndex];
  }

  /**
   * Kiểm tra giới hạn rút tiền trong ngày
   * @param affiliateId ID của affiliate
   * @param amount Số tiền muốn rút
   * @returns Kết quả kiểm tra với thông tin tổng đã rút và giới hạn còn lại
   */
  async checkDailyWithdrawalLimit(affiliateId: string, amount: number): Promise<{exceeds: boolean, totalWithdrawn: number, remainingLimit: number}> {
    // Tìm affiliate
    const affiliate = await this.getAffiliateByAffiliateId(affiliateId);
    if (!affiliate) {
      return { exceeds: true, totalWithdrawn: 0, remainingLimit: 0 };
    }
    
    // Lấy ngày hiện tại (ở múi giờ VN)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Giới hạn rút tiền trong ngày là 20 triệu VND
    const DAILY_LIMIT = 20000000;
    
    // Tính tổng tiền đã rút trong ngày
    const totalWithdrawn = affiliate.withdrawal_history
      .filter(w => {
        // Chỉ tính các yêu cầu trong ngày hôm nay
        const requestDate = new Date(w.request_date);
        const requestDay = new Date(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate());
        return requestDay.getTime() === today.getTime() && 
               (w.status === "Pending" || w.status === "Processing" || w.status === "Completed");
      })
      .reduce((sum, w) => sum + w.amount, 0);
    
    // Tính giới hạn còn lại
    const remainingLimit = Math.max(0, DAILY_LIMIT - totalWithdrawn);
    
    // Kiểm tra xem yêu cầu mới có vượt quá giới hạn không
    const exceeds = totalWithdrawn + amount > DAILY_LIMIT;
    
    return { exceeds, totalWithdrawn, remainingLimit };
  }

  /**
   * Cập nhật số dư của affiliate
   * @param affiliateId ID của affiliate
   * @param amount Số tiền cần trừ (số dương)
   * @returns true nếu cập nhật thành công, false nếu không
   */
  async updateAffiliateBalance(affiliateId: string, amount: number): Promise<boolean> {
    const affiliate = await this.getAffiliateByAffiliateId(affiliateId);
    
    if (!affiliate) {
      return false;
    }
    
    // Kiểm tra số dư
    if (affiliate.remaining_balance < amount) {
      return false;
    }
    
    // Trừ số dư, cập nhật paid_balance
    affiliate.remaining_balance -= amount;
    affiliate.paid_balance += amount;
    
    return true;
  }

  // Affiliate rỗng, không có dữ liệu mẫu
  private affiliate: Affiliate = {
    id: 0,
    user_id: 0,
    affiliate_id: "",
    full_name: "",
    email: "",
    phone: "",
    bank_account: "",
    bank_name: "",
    total_contacts: 0,
    total_contracts: 0,
    contract_value: 0,
    received_balance: 0,
    paid_balance: 0,
    remaining_balance: 0,
    referred_customers: [],
    withdrawal_history: []
  };
  
  private topAffiliates: TopAffiliate[];
  private allAffiliates: Affiliate[] = []; // Mảng lưu trữ tất cả các affiliates trong hệ thống
  private users: User[] = []; // Mảng lưu trữ người dùng mẫu
  private otpVerifications: OtpVerification[] = []; // Mảng lưu trữ các mã OTP

  constructor() {
    // Khởi tạo dữ liệu trống - không tạo khách hàng mẫu và không tạo lịch sử rút tiền
    this.affiliate.referred_customers = []; 
    this.affiliate.withdrawal_history = [];
    
    // Đặt tất cả các thống kê về 0
    this.affiliate.total_contacts = 0;
    this.affiliate.total_contracts = 0;
    this.affiliate.contract_value = 0;
    this.affiliate.received_balance = 0;
    this.affiliate.remaining_balance = 0;
    this.affiliate.paid_balance = 0;
    
    // Khởi tạo danh sách top affiliates trống
    this.topAffiliates = [];
    
    // Thêm affiliate hiện tại vào danh sách top (nếu có thông tin hợp lệ)
    if (this.affiliate.full_name) {
      this.topAffiliates.push({
        id: this.affiliate.id,
        full_name: this.affiliate.full_name,
        total_contracts: this.affiliate.total_contracts,
        contract_value: this.affiliate.contract_value
      });
      
      // Sắp xếp lại theo giá trị hợp đồng
      this.topAffiliates.sort((a, b) => b.contract_value - a.contract_value);
      
      // Giới hạn chỉ hiển thị 5 affiliate hàng đầu
      this.topAffiliates = this.topAffiliates.slice(0, 5);
    }
    
    // Thêm affiliate hiện tại vào danh sách all nếu có thông tin
    if (this.affiliate.affiliate_id) {
      this.allAffiliates.push(this.affiliate);
    }
    
    // Tạo tài khoản admin mẫu
    this.users.push({
      id: 1,
      username: "admin@colormedia.vn",
      password: "$2b$10$SsFtXWNGw9pLlJT4s2F9G.qO0BpI5wG6jFYrWgvYcP5o6w8gvlGT.", // admin@123
      role: "ADMIN",
      is_active: 1,
      is_first_login: 0,
      last_login: null,
      token: null,
      created_at: new Date()
    });
  }

  private generateReferredCustomers(): ReferredCustomer[] {
    // Trả về một mảng trống - không tạo khách hàng mẫu nữa
    return [];
  }

  private generateWithdrawalHistory(): WithdrawalHistory[] {
    // Trả về mảng trống - không tạo dữ liệu mẫu lịch sử rút tiền
    return [];
  }

  async getCurrentAffiliate(): Promise<Affiliate | undefined> {
    return this.affiliate;
  }

  async getTopAffiliates(): Promise<TopAffiliate[]> {
    return this.topAffiliates;
  }

  async addWithdrawalRequest(request: WithdrawalRequestPayload): Promise<void> {
    // Tìm affiliate dựa vào affiliate_id trong trường user_id
    const affiliate = await this.getAffiliateByAffiliateId(request.user_id);
    
    if (!affiliate) {
      console.warn("Affiliate not found with ID:", request.user_id);
      throw new Error(`Affiliate not found with ID: ${request.user_id}`);
    }
    
    // Kiểm tra giới hạn rút tiền theo ngày
    const dailyLimitCheck = await this.checkDailyWithdrawalLimit(request.user_id, request.amount_requested);
    if (dailyLimitCheck.exceeds) {
      throw new Error(`Vượt quá giới hạn rút tiền trong ngày. Hạn mức còn lại: ${dailyLimitCheck.remainingLimit.toLocaleString()} VND`);
    }
    
    // Kiểm tra số dư
    if (affiliate.remaining_balance < request.amount_requested) {
      throw new Error(`Số tiền yêu cầu vượt quá số dư khả dụng: ${affiliate.remaining_balance.toLocaleString()} VND`);
    }
    
    // Add to withdrawal history
    affiliate.withdrawal_history.unshift({
      request_date: request.request_time,
      amount: request.amount_requested,
      note: request.note || "",
      status: "Pending" // Trạng thái ban đầu là Pending
    });
    
    // Đổi trạng thái thành Processing và trừ tiền 
    await this.updateWithdrawalStatus(request.user_id, request.request_time, "Processing");
  }

  async getAffiliateByAffiliateId(affiliateId: string): Promise<Affiliate | undefined> {
    console.log(`Looking for affiliate with affiliate_id: ${affiliateId}`);
    
    // In memory storage, check if the affiliateId matches our current affiliate
    if (this.affiliate.affiliate_id === affiliateId) {
      return this.affiliate;
    }
    
    // Kiểm tra trong mảng allAffiliates trước tiên
    const foundInAll = this.allAffiliates.find(aff => aff.affiliate_id === affiliateId);
    if (foundInAll) {
      console.log(`Found affiliate with ID ${affiliateId} in allAffiliates list`);
      return foundInAll;
    }
    
    // Special case for admin user
    if (affiliateId === "ADMIN-AFF") {
      console.log("Found admin affiliate with special ID");
      return {
        id: 1,
        user_id: 1,
        affiliate_id: "ADMIN-AFF",
        full_name: "Admin",
        email: "admin@colormedia.vn",
        phone: "0123456789",
        bank_account: "9876543210",
        bank_name: "BIDV",
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
    
    console.log(`No affiliate found with affiliate_id: ${affiliateId}`);
    return undefined;
  }

  async getAffiliateByEmail(email: string): Promise<Affiliate | undefined> {
    console.log(`Looking for affiliate with email: ${email}`);
    
    // In memory storage, check if the email matches our current affiliate
    if (this.affiliate.email === email) {
      return this.affiliate;
    }
    
    // Kiểm tra trong mảng allAffiliates
    const foundInAll = this.allAffiliates.find(aff => aff.email === email);
    if (foundInAll) {
      console.log(`Found affiliate with email ${email} in allAffiliates list`);
      return foundInAll;
    }
    
    console.log(`No affiliate found with email: ${email}`);
    return undefined;
  }

  async getAffiliateByUserId(userId: number): Promise<Affiliate | undefined> {
    console.log(`Looking for affiliate with user_id: ${userId}`);
    
    // In memory storage, check if the userId matches our current affiliate
    if (this.affiliate.user_id === userId) {
      return this.affiliate;
    }
    
    // Kiểm tra trong mảng allAffiliates
    const foundInAll = this.allAffiliates.find(aff => aff.user_id === userId);
    if (foundInAll) {
      console.log(`Found affiliate in allAffiliates for user_id ${userId}: ${foundInAll.full_name}`);
      return foundInAll;
    }
    
    console.log(`No affiliate found with user_id: ${userId}`);
    return undefined;
  }

  async createAffiliate(affiliateData: InsertAffiliate): Promise<Affiliate> {
    console.log(`Creating new affiliate with ID: ${affiliateData.affiliate_id}`);
    
    // Kiểm tra xem affiliate_id đã tồn tại chưa
    const existingAffiliate = await this.getAffiliateByAffiliateId(affiliateData.affiliate_id);
    if (existingAffiliate) {
      console.log(`Affiliate with ID ${affiliateData.affiliate_id} already exists, returning existing affiliate`);
      
      // Nếu có thông tin mới, cập nhật thông tin cho affiliate hiện có
      if (affiliateData.full_name) existingAffiliate.full_name = affiliateData.full_name;
      if (affiliateData.email) existingAffiliate.email = affiliateData.email;
      if (affiliateData.phone) existingAffiliate.phone = affiliateData.phone;
      if (affiliateData.bank_account) existingAffiliate.bank_account = affiliateData.bank_account;
      if (affiliateData.bank_name) existingAffiliate.bank_name = affiliateData.bank_name;
      if (affiliateData.user_id) existingAffiliate.user_id = affiliateData.user_id;
      
      return existingAffiliate;
    }
    
    // Tạo affiliate mới với ID tăng dần
    const newId = this.allAffiliates.length > 0 ? Math.max(...this.allAffiliates.map(a => a.id)) + 1 : 1;
    
    const newAffiliate: Affiliate = {
      id: newId,
      user_id: affiliateData.user_id || 2, // Sử dụng user_id được cung cấp hoặc mặc định
      affiliate_id: affiliateData.affiliate_id,
      full_name: affiliateData.full_name,
      email: affiliateData.email,
      phone: affiliateData.phone,
      bank_account: affiliateData.bank_account || "",
      bank_name: affiliateData.bank_name || "",
      total_contacts: 0,
      total_contracts: 0,
      contract_value: 0,
      received_balance: 0,
      paid_balance: 0,
      remaining_balance: 0,
      referred_customers: [],
      withdrawal_history: []
    };
    
    // Thêm affiliate mới vào danh sách
    this.allAffiliates.push(newAffiliate);
    console.log(`Added new affiliate ${affiliateData.affiliate_id} to allAffiliates. Total: ${this.allAffiliates.length}`);
    
    return newAffiliate;
  }

  async addReferredCustomer(affiliateId: string, customerData: ReferredCustomer): Promise<ReferredCustomer> {
    // Tìm affiliate dựa vào affiliate_id
    const affiliate = await this.getAffiliateByAffiliateId(affiliateId);
    
    if (!affiliate) {
      throw new Error(`Affiliate not found with ID: ${affiliateId}`);
    }
    
    // Tạo ID tự động cho khách hàng mới
    // Tìm ID lớn nhất hiện có trong danh sách khách hàng của tất cả các affiliate
    const allCustomers: ReferredCustomer[] = this.allAffiliates.flatMap(aff => aff.referred_customers);
    
    // Tìm ID lớn nhất hiện có (nếu có) và tăng lên 1
    const maxCustomerId = allCustomers.length > 0 
      ? Math.max(...allCustomers.filter(c => c.id !== undefined).map(c => c.id || 0)) 
      : -1;
    const newCustomerId = maxCustomerId + 1;
    
    const now = new Date().toISOString();
    
    // Tạo thông tin khách hàng mới với ID duy nhất và affiliate_id
    const newCustomer: ReferredCustomer = {
      ...customerData,
      id: newCustomerId,
      affiliate_id: affiliateId,
      created_at: now,
      updated_at: now
    };
    
    // Nếu là hợp đồng đã ký, thêm thông tin về giá trị hợp đồng và hoa hồng
    if (newCustomer.status === "Contract signed") {
      const contractValue = newCustomer.contract_value || 20000000; // Default 20M VND
      const commission = contractValue * 0.03; // 3% hoa hồng (đã cập nhật từ 10%)
      
      // Cập nhật thông tin khách hàng
      newCustomer.contract_value = contractValue;
      newCustomer.commission = commission;
      newCustomer.contract_date = newCustomer.contract_date || now;
    }
    
    // Thêm khách hàng mới vào danh sách
    affiliate.referred_customers.unshift(newCustomer);
    
    // Update the affiliate stats
    affiliate.total_contacts += 1;
    
    // If status is "Contract signed", update contracts count and value
    if (newCustomer.status === "Contract signed") {
      affiliate.total_contracts += 1;
      
      const contractValue = newCustomer.contract_value || 20000000;
      const commission = contractValue * 0.03; // 3% hoa hồng (đã cập nhật từ 10%)
      
      affiliate.contract_value += contractValue;
      affiliate.remaining_balance += commission;
      affiliate.received_balance += commission;
      
      // Update in top affiliates list
      const affiliateInTop = this.topAffiliates.find(a => a.id === affiliate.id);
      if (affiliateInTop) {
        affiliateInTop.total_contracts += 1;
        affiliateInTop.contract_value += contractValue;
        // Re-sort the list
        this.topAffiliates.sort((a, b) => b.contract_value - a.contract_value);
      }
    }
    
    // Trả về đối tượng khách hàng mới được tạo với ID
    console.log(`Created new customer with ID ${newCustomer.id} for affiliate ${affiliateId}`);
    return newCustomer;
  }

  async updateCustomerStatus(
    affiliateId: string,
    customerId: number, 
    status: CustomerStatusType, 
    description: string
  ): Promise<ReferredCustomer | undefined> {
    // Tìm affiliate trong danh sách
    console.log(`Looking for affiliate with affiliate_id: ${affiliateId}`);
    const targetAffiliate = this.allAffiliates.find(aff => aff.affiliate_id === affiliateId);
    
    if (!targetAffiliate) {
      console.error(`Affiliate with ID ${affiliateId} not found`);
      return undefined;
    }
    
    // Tìm khách hàng theo ID thực (không phải vị trí trong mảng)
    const customerIndex = targetAffiliate.referred_customers.findIndex(
      customer => customer.id === customerId
    );
    
    console.log(`MemStorage: Finding customer with ID ${customerId} for affiliate ${affiliateId}, found at index ${customerIndex}`);
    
    // Nếu không tìm thấy khách hàng
    if (customerIndex === -1) {
      console.error(`Customer with ID ${customerId} not found for affiliate ${affiliateId}`);
      return undefined;
    }
    
    // Lấy thông tin khách hàng hiện tại
    const customer = targetAffiliate.referred_customers[customerIndex];
    const oldStatus = customer.status;
    const now = new Date().toISOString();
    
    console.log(`Current customer data before update: ${JSON.stringify(customer)}`);
    
    // Chỉ cập nhật các trường cần thiết, giữ nguyên thông tin khách hàng
    // Cập nhật trạng thái mới và ghi chú mới
    targetAffiliate.referred_customers[customerIndex] = {
      ...customer, // Giữ nguyên các thông tin khác của khách hàng
      status, // Cập nhật trạng thái mới
      note: description, // Cập nhật ghi chú mới
      updated_at: now // Cập nhật thời gian
    };
    
    // Đảm bảo tên khách hàng được giữ nguyên (không thay đổi về giá trị mặc định)
    // Đây là bước sửa lỗi chính - giữ nguyên tên customer_name
    if (customer.customer_name && customer.customer_name !== `Công ty TNHH ${customerId+1}`) {
      targetAffiliate.referred_customers[customerIndex].customer_name = customer.customer_name;
      console.log(`Preserved customer name: ${customer.customer_name}`);
    }
    
    // Lấy lại đối tượng đã cập nhật
    const updatedCustomer = targetAffiliate.referred_customers[customerIndex];
    
    // If the status is changed to "Contract signed", update contracts count and value
    if (status === "Contract signed" && oldStatus !== "Contract signed") {
      targetAffiliate.total_contracts += 1;
      // Mặc định giá trị hợp đồng và hoa hồng
      const contractValue = 20000000; // Default 20M VND
      const commission = contractValue * 0.03; // 3% commission - Cập nhật thành 3% thay vì 10%
      
      // Cập nhật thông tin về hợp đồng và hoa hồng cho khách hàng
      updatedCustomer.contract_value = contractValue;
      updatedCustomer.commission = commission;
      updatedCustomer.contract_date = now;
      
      // Cập nhật số liệu cho affiliate
      targetAffiliate.contract_value += contractValue;
      targetAffiliate.remaining_balance += commission;
      targetAffiliate.received_balance += commission;
      
      console.log(`Updated affiliate ${targetAffiliate.affiliate_id} stats: total_contracts=${targetAffiliate.total_contracts}, contract_value=${targetAffiliate.contract_value}, remaining_balance=${targetAffiliate.remaining_balance}, received_balance=${targetAffiliate.received_balance}`);
      
      // Update in top affiliates list
      const affiliateInTop = this.topAffiliates.find(a => a.id === targetAffiliate.id);
      if (affiliateInTop) {
        affiliateInTop.total_contracts += 1;
        affiliateInTop.contract_value += contractValue;
        // Re-sort the list
        this.topAffiliates.sort((a, b) => b.contract_value - a.contract_value);
      }
    }
    
    console.log(`Updated customer: ${JSON.stringify(updatedCustomer)}`);  // Thêm log để theo dõi dữ liệu
    return updatedCustomer;  // Trả về đối tượng đã cập nhật, không phải đối tượng cũ
  }
  
  async updateCustomerWithContract(
    customerIndexOrId: number, 
    customerData: ReferredCustomer, 
    balanceUpdates: { 
      contract_value: number; 
      received_balance: number; 
      remaining_balance: number 
    }
  ): Promise<ReferredCustomer | undefined> {
    console.log(`MemStorage: Updating customer contract for index/ID ${customerIndexOrId}`);
    
    // 1. Tìm affiliate cụ thể theo customerData.affiliate_id hoặc lấy affiliate đầu tiên nếu không có
    let targetAffiliate;
    
    if (customerData.affiliate_id) {
      console.log(`Looking for affiliate with affiliate_id: ${customerData.affiliate_id}`);
      targetAffiliate = this.allAffiliates.find(aff => aff.affiliate_id === customerData.affiliate_id);
    }
    
    // Không tìm kiếm dựa trên ID của khách hàng nữa, vì customerIndexOrId giờ là chỉ số trong mảng
    if (!targetAffiliate) {
      targetAffiliate = this.affiliate;
      console.log(`Using current affiliate as fallback: ${this.affiliate.affiliate_id}`);
    }
    
    if (!targetAffiliate || !targetAffiliate.referred_customers) {
      console.error(`No affiliate found for customer with index ${customerIndexOrId}`);
      return undefined;
    }
    
    // 2. Sử dụng customerIndexOrId trực tiếp như index trong mảng
    const customerIndex = customerIndexOrId;
    
    // Kiểm tra xem index có hợp lệ không
    if (customerIndex < 0 || customerIndex >= targetAffiliate.referred_customers.length) {
      console.error(`Invalid customer index ${customerIndex} for affiliate ${targetAffiliate.affiliate_id}`);
      return undefined;
    }
    
    console.log(`MemStorage: Using customer at index ${customerIndex} for affiliate ${targetAffiliate.affiliate_id}`);
    
    // Đã kiểm tra index hợp lệ ở trên, nên không cần kiểm tra customerIndex === -1 nữa
    
    try {
      // 3. Lưu lại tên khách hàng hiện tại để đảm bảo không bị mất
      const currentCustomerName = targetAffiliate.referred_customers[customerIndex].customer_name;
      console.log(`Current customer name before contract update: ${currentCustomerName}`);
      
      // 4. Cập nhật thông tin khách hàng
      targetAffiliate.referred_customers[customerIndex] = {
        ...customerData,
        affiliate_id: targetAffiliate.affiliate_id, // Đảm bảo affiliate_id được cập nhật
        updated_at: new Date().toISOString() // Đảm bảo cập nhật thời gian mới nhất
      };
      
      // Đảm bảo giữ nguyên tên khách hàng nếu không có tên mới được cung cấp
      if (!customerData.customer_name && currentCustomerName) {
        targetAffiliate.referred_customers[customerIndex].customer_name = currentCustomerName;
        console.log(`Preserved customer name in contract update: ${currentCustomerName}`);
      }
      
      // 5. Cập nhật thông tin tổng hợp của affiliate
      targetAffiliate.contract_value = balanceUpdates.contract_value;
      targetAffiliate.received_balance = balanceUpdates.received_balance;
      targetAffiliate.remaining_balance = balanceUpdates.remaining_balance;
      
      // 6. Nếu khách hàng có contract_value, tăng total_contracts của affiliate nếu cần
      const oldCustomer = targetAffiliate.referred_customers[customerIndex];
      if (customerData.contract_value && 
          (oldCustomer.contract_value === undefined || customerData.contract_value > oldCustomer.contract_value)) {
        
        // Nếu trạng thái là "Contract signed" và không có contract_date, thêm contract_date
        if (customerData.status === "Contract signed" && !customerData.contract_date) {
          targetAffiliate.referred_customers[customerIndex].contract_date = new Date().toISOString();
        }
        
        // Nếu khách hàng chưa có contract_value trước đó, tăng total_contracts
        if (!oldCustomer.contract_value) {
          targetAffiliate.total_contracts += 1;
        }
        
        // Cập nhật thông tin trong danh sách top affiliates
        const affiliateInTop = this.topAffiliates.find(a => a.id === targetAffiliate.id);
        if (affiliateInTop) {
          affiliateInTop.contract_value = targetAffiliate.contract_value;
          affiliateInTop.total_contracts = targetAffiliate.total_contracts;
          // Re-sort the list
          this.topAffiliates.sort((a, b) => b.contract_value - a.contract_value);
        }
      }
      
      // 7. Ghi log thành công
      console.log(`Successfully updated customer at index ${customerIndex} with contract value ${customerData.contract_value}`);
      console.log(`Updated affiliate balance: contract_value=${targetAffiliate.contract_value}, received_balance=${targetAffiliate.received_balance}, remaining_balance=${targetAffiliate.remaining_balance}`);
      
      // 8. Trả về khách hàng đã được cập nhật
      return targetAffiliate.referred_customers[customerIndex];
      
    } catch (error) {
      console.error("Error updating customer with contract:", error);
      return undefined;
    }
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