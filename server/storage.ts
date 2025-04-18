import { z } from "zod";
import { affiliates, otpVerifications, users } from '../shared/schema.js';
import type {
  Affiliate,
  CustomerStatusType,
  InsertAffiliate,
  OtpVerification,
  ReferredCustomer,
  TopAffiliate,
  VideoData,
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
  createUser(userData: { username: string; password: string; role: UserRoleType; is_first_login?: boolean; token?: string }): Promise<User>;
  getUserById(id: number): Promise<User | undefined>;
  updateUserPassword(userId: number, password: string): Promise<void>;
  markFirstLoginComplete(userId: number): Promise<void>;
  
  // Phương thức quản lý OTP
  createOtp(userId: number, verificationType: string, relatedId?: number): Promise<string>;
  verifyOtp(userId: number, otpCode: string, verificationType: string): Promise<boolean>;
  increaseOtpAttempt(userId: number, otpCode: string): Promise<number>;
  invalidateOtp(userId: number, otpCode: string): Promise<void>;
  
  // Phương thức quản lý video
  getTopVideos(limit?: number): Promise<VideoData[]>;
  addVideo(video: VideoData): Promise<VideoData>;
  updateVideo(id: number, video: Partial<VideoData>): Promise<VideoData | undefined>;
  deleteVideo(id: number): Promise<boolean>;
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
      console.error(`Không tìm thấy affiliate với ID: ${affiliateId}`);
      return undefined;
    }
    
    console.log(`Đang tìm yêu cầu rút tiền cho ${affiliateId} với thời gian ${requestTime}`);
    console.log(`Số lượng yêu cầu rút tiền hiện có: ${affiliate.withdrawal_history.length}`);
    
    // Kiểm tra và ghi nhật ký tất cả yêu cầu rút tiền hiện có
    if (affiliate.withdrawal_history.length > 0) {
      console.log(`Danh sách yêu cầu rút tiền hiện có:`, affiliate.withdrawal_history.map(w => ({
        request_date: w.request_date,
        amount: w.amount,
        status: w.status
      })));
    }
    
    // Tìm yêu cầu rút tiền dựa trên thời gian yêu cầu
    const withdrawalIndex = affiliate.withdrawal_history.findIndex(
      w => w.request_date === requestTime
    );
    
    if (withdrawalIndex === -1) {
      console.error(`Không tìm thấy yêu cầu rút tiền với thời gian ${requestTime} cho affiliate ${affiliateId}`);
      
      // Kiểm tra định dạng thời gian
      try {
        const requestDate = new Date(requestTime);
        console.log(`Thời gian yêu cầu đã chuyển đổi: ${requestDate.toISOString()}`);
        
        // Tìm kiếm tương đối (chỉ so sánh ngày)
        let sameDayIndex = affiliate.withdrawal_history.findIndex(w => {
          const wDate = new Date(w.request_date);
          return wDate.getFullYear() === requestDate.getFullYear() && 
                 wDate.getMonth() === requestDate.getMonth() && 
                 wDate.getDate() === requestDate.getDate() &&
                 // Thêm kiểm tra giờ nếu có sự khác biệt về múi giờ
                 Math.abs(wDate.getHours() - requestDate.getHours()) < 2;
        });
        
        if (sameDayIndex !== -1) {
          console.log(`Tìm thấy yêu cầu cùng ngày với giờ tương đối: ${affiliate.withdrawal_history[sameDayIndex].request_date}`);
          // Sử dụng yêu cầu này thay thế
          return await this.updateWithdrawalStatus(
            affiliateId, 
            affiliate.withdrawal_history[sameDayIndex].request_date, 
            newStatus
          );
        } else {
          return undefined;
        }
      } catch (e) {
        console.error(`Lỗi khi chuyển đổi thời gian: ${e}`);
        return undefined;
      }
    }
    
    const oldStatus = affiliate.withdrawal_history[withdrawalIndex].status;
    console.log(`Cập nhật trạng thái yêu cầu rút tiền từ ${oldStatus} thành ${newStatus}`);
    
    // Cập nhật trạng thái
    affiliate.withdrawal_history[withdrawalIndex].status = newStatus;
    
    // Nếu trạng thái mới là "Processing" và trạng thái cũ không phải "Processing",
    // trừ tiền từ số dư khả dụng của affiliate
    if (newStatus === "Processing" && oldStatus !== "Processing") {
      const amount = affiliate.withdrawal_history[withdrawalIndex].amount;
      
      console.log(`Chuẩn bị trừ ${amount} từ số dư khả dụng ${affiliate.remaining_balance}`);
      
      // Kiểm tra số dư
      if (affiliate.remaining_balance < amount) {
        console.error(`Số dư không đủ: ${affiliate.remaining_balance} < ${amount}`);
        throw new Error(`Số tiền yêu cầu vượt quá số dư khả dụng: ${affiliate.remaining_balance.toLocaleString()} VND`);
      }
      
      // Cập nhật số dư
      affiliate.remaining_balance -= amount;
      affiliate.paid_balance += amount;
      
      console.log(`Đã trừ tiền thành công: Số dư còn lại: ${affiliate.remaining_balance}, Đã thanh toán: ${affiliate.paid_balance}`);
    }
    // Nếu trạng thái mới là "Rejected" hoặc "Cancelled" và trạng thái cũ là "Processing",
    // hoàn lại tiền vào số dư khả dụng của affiliate
    else if ((newStatus === "Rejected" || newStatus === "Cancelled") && oldStatus === "Processing") {
      const amount = affiliate.withdrawal_history[withdrawalIndex].amount;
      
      // Hoàn lại tiền
      affiliate.remaining_balance += amount;
      affiliate.paid_balance -= amount;
      
      console.log(`Đã hoàn lại ${amount} vào số dư khả dụng. Số dư mới: ${affiliate.remaining_balance}`);
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
  private videos: VideoData[] = []; // Mảng lưu trữ các video của ColorMedia

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
    
    // Kiểm tra số dư tích lũy có bằng 0 không
    if (affiliate.remaining_balance <= 0) {
      throw new Error("Không thể tạo yêu cầu rút tiền khi số dư hoa hồng tích lũy bằng 0");
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
    
    // Thêm vào lịch sử rút tiền với trạng thái ban đầu là "Pending"
    const withdrawalEntry: WithdrawalHistory = {
      request_date: request.request_time,
      amount: request.amount_requested,
      note: request.note || "",
      status: "Pending" // Trạng thái ban đầu là Pending
    };
    
    // Thêm vào đầu mảng để hiển thị theo thứ tự từ mới đến cũ
    affiliate.withdrawal_history.unshift(withdrawalEntry);
    
    console.log(`Thêm yêu cầu rút tiền mới: ${JSON.stringify(withdrawalEntry)}`);
    console.log(`Số lượng yêu cầu rút tiền hiện tại: ${affiliate.withdrawal_history.length}`);
    
    // Cập nhật số dư (trừ từ remaining_balance, cộng vào paid_balance)
    console.log(`Số dư trước khi cập nhật: ${affiliate.remaining_balance}`);
    
    // Đổi trạng thái thành Processing và trừ tiền 
    try {
      // Trừ số dư affiliate trước khi cập nhật trạng thái
      // Kiểm tra số dư
      if (affiliate.remaining_balance < request.amount_requested) {
        throw new Error(`Số tiền yêu cầu vượt quá số dư khả dụng: ${affiliate.remaining_balance.toLocaleString()} VND`);
      }
      
      console.log(`Số dư trước khi trừ tiền: ${affiliate.remaining_balance}`);
      
      // Trừ tiền trực tiếp
      affiliate.remaining_balance -= request.amount_requested;
      affiliate.paid_balance = (affiliate.paid_balance || 0) + request.amount_requested;
      
      console.log(`Đã trừ ${request.amount_requested} từ số dư trực tiếp. Số dư mới: ${affiliate.remaining_balance}`);
      
      // Cập nhật trạng thái
      await this.updateWithdrawalStatus(request.user_id, request.request_time, "Processing");
      console.log(`Đã cập nhật trạng thái thành công và trừ tiền: ${request.amount_requested}`);
      console.log(`Số dư sau khi cập nhật: ${affiliate.remaining_balance}`);
    } catch (error) {
      console.error(`Lỗi khi cập nhật trạng thái và trừ tiền: ${error}`);
      // Xóa yêu cầu rút tiền khỏi lịch sử nếu có lỗi xảy ra
      affiliate.withdrawal_history.shift();
      throw error;
    }
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
    
    // Lấy user_id từ affiliate
    const userId = affiliate.user_id;
    
    // Sử dụng user_id làm ID khách hàng nếu được chỉ định trong customerData
    let customerId: number;
    if (customerData.id !== undefined) {
      // Sử dụng ID đã được chỉ định
      customerId = customerData.id;
      console.log(`Using provided customer ID: ${customerId}`);
    } else if (userId) {
      // Sử dụng user_id nếu không có ID được chỉ định
      customerId = userId;
      console.log(`Using user_id as customer ID: ${customerId}`);
    } else {
      // Tạo ID tự động nếu không có thông tin nào
      const allCustomers: ReferredCustomer[] = this.allAffiliates.flatMap(aff => aff.referred_customers);
      const maxCustomerId = allCustomers.length > 0 
        ? Math.max(...allCustomers.filter(c => c.id !== undefined).map(c => c.id || 0)) 
        : -1;
      customerId = maxCustomerId + 1;
      console.log(`Generated new customer ID: ${customerId}`);
    }
    
    const now = new Date().toISOString();
    
    // Tạo thông tin khách hàng mới với ID được xác định và affiliate_id
    const newCustomer: ReferredCustomer = {
      ...customerData,
      id: customerId,
      affiliate_id: affiliateId,
      created_at: now,
      updated_at: now
    };
    
    // Nếu là hợp đồng đã ký, thêm thông tin về giá trị hợp đồng và hoa hồng
    if (newCustomer.status === "Đã chốt hợp đồng") {
      const contractValue = newCustomer.contract_value || 20000000; // Default 20M VND
      const commission = contractValue * 0.03; // 3% hoa hồng
      
      // Cập nhật thông tin khách hàng
      newCustomer.contract_value = contractValue;
      newCustomer.commission = commission;
      newCustomer.contract_date = newCustomer.contract_date || now;
    }
    
    // Thêm khách hàng mới vào danh sách
    affiliate.referred_customers.unshift(newCustomer);
    
    // Update the affiliate stats
    affiliate.total_contacts += 1;
    
    // If status is "Đã chốt hợp đồng", update contracts count and value
    if (newCustomer.status === "Đã chốt hợp đồng") {
      affiliate.total_contracts += 1;
      
      const contractValue = newCustomer.contract_value || 20000000;
      const commission = contractValue * 0.03; // 3% hoa hồng
      
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
    customerIndex: number, 
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
    
    // Kiểm tra xem index có hợp lệ không
    if (customerIndex < 0 || customerIndex >= targetAffiliate.referred_customers.length) {
      console.error(`Invalid customer index ${customerIndex} for affiliate ${affiliateId}. Available range: 0-${targetAffiliate.referred_customers.length-1}`);
      return undefined;
    }
    
    console.log(`MemStorage: Using customer at index ${customerIndex} for affiliate ${affiliateId}`);
    
    // Lấy ID của khách hàng tại vị trí index để tiện theo dõi
    const customerId = targetAffiliate.referred_customers[customerIndex].id;
    console.log(`Found customer with ID ${customerId} at index ${customerIndex}`);
    
    
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
    if (customer.customer_name) {
      targetAffiliate.referred_customers[customerIndex].customer_name = customer.customer_name;
      console.log(`Preserved customer name: ${customer.customer_name}`);
    }
    
    // Lấy lại đối tượng đã cập nhật
    const updatedCustomer = targetAffiliate.referred_customers[customerIndex];
    
    // If the status is changed to "Đã chốt hợp đồng", update contracts count and value
    if (status === "Đã chốt hợp đồng" && oldStatus !== "Đã chốt hợp đồng") {
      targetAffiliate.total_contracts += 1;
      // Mặc định giá trị hợp đồng và hoa hồng
      const contractValue = 20000000; // Default 20M VND
      const commission = contractValue * 0.03; // 3% commission
      
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
      
      // Cập nhật lại thông tin cho affiliate hiện tại
      if (targetAffiliate.affiliate_id === this.affiliate.affiliate_id) {
        this.affiliate = { ...targetAffiliate };
        console.log(`Updated current affiliate with new contract data: total_contracts=${this.affiliate.total_contracts}`);
      }
    }
    
    console.log(`Updated customer: ${JSON.stringify(updatedCustomer)}`);  // Thêm log để theo dõi dữ liệu
    return updatedCustomer;  // Trả về đối tượng đã cập nhật, không phải đối tượng cũ
  }
  
  async updateCustomerWithContract(
    customerIndex: number, 
    customerData: ReferredCustomer, 
    balanceUpdates: { 
      contract_value: number; 
      received_balance: number; 
      remaining_balance: number 
    }
  ): Promise<ReferredCustomer | undefined> {
    console.log(`MemStorage: Updating customer contract for index ${customerIndex}`);
    
    // 1. Tìm affiliate cụ thể theo customerData.affiliate_id hoặc lấy affiliate đầu tiên nếu không có
    let targetAffiliate;
    
    if (customerData.affiliate_id) {
      console.log(`Looking for affiliate with affiliate_id: ${customerData.affiliate_id}`);
      targetAffiliate = this.allAffiliates.find(aff => aff.affiliate_id === customerData.affiliate_id);
    }
    
    if (!targetAffiliate) {
      targetAffiliate = this.affiliate;
      console.log(`Using current affiliate as fallback: ${this.affiliate.affiliate_id}`);
    }
    
    if (!targetAffiliate || !targetAffiliate.referred_customers) {
      console.error(`No affiliate found for customer with index ${customerIndex}`);
      return undefined;
    }
    
    // 2. Kiểm tra xem index có hợp lệ không
    if (customerIndex < 0 || customerIndex >= targetAffiliate.referred_customers.length) {
      console.error(`Invalid customer index ${customerIndex} for affiliate ${targetAffiliate.affiliate_id}. Available range: 0-${targetAffiliate.referred_customers.length-1}`);
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
      
      // 5. Tính toán sự chênh lệch giữa giá trị hiện tại và giá trị mới
      // Chỉ tính chênh lệch và cộng dồn, không ghi đè toàn bộ giá trị
      // Đảm bảo không trừ đi giá trị hợp đồng cũ mà chỉ thêm giá trị mới
      
      // Tính toán giá trị chênh lệch của hợp đồng
      const currentContractValue = targetAffiliate.contract_value || 0;
      const newContractValue = (balanceUpdates.contract_value || 0);
      const contractValueDifference = Math.max(0, newContractValue - currentContractValue);
      
      // Tính toán giá trị chênh lệch của hoa hồng (3% của giá trị hợp đồng mới)
      const commissionDifference = contractValueDifference * 0.03;
      
      console.log(`Contract value calculation: Current=${currentContractValue}, New=${newContractValue}, Difference=${contractValueDifference}`);
      console.log(`Commission calculation: Difference=${commissionDifference}`);
      
      // Cập nhật bằng cách cộng dồn, không ghi đè
      if (contractValueDifference > 0) {
        targetAffiliate.contract_value += contractValueDifference;
        targetAffiliate.received_balance += commissionDifference;
        targetAffiliate.remaining_balance += commissionDifference;
        
        console.log(`Updated affiliate values: contract_value=${targetAffiliate.contract_value}, received_balance=${targetAffiliate.received_balance}, remaining_balance=${targetAffiliate.remaining_balance}`);
      } else {
        console.log(`No change in contract value detected. Keeping current values.`);
      }
      
      // 6. Nếu khách hàng có contract_value, tăng total_contracts của affiliate nếu cần
      const oldCustomer = targetAffiliate.referred_customers[customerIndex];
      if (customerData.contract_value && 
          (oldCustomer.contract_value === undefined || customerData.contract_value > oldCustomer.contract_value)) {
        
        // Nếu trạng thái là "Đã chốt hợp đồng" và không có contract_date, thêm contract_date
        if (customerData.status === "Đã chốt hợp đồng" && !customerData.contract_date) {
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
    // For the in-memory store, we'll generate sample data for testing
    const affiliates_added = Math.min(affiliatesCount, 20); // Limit to 20 for performance
    const customers_added = affiliates_added * Math.min(customersPerAffiliate, 10); // Limit to 10 per affiliate
    const withdrawals_added = affiliates_added * Math.min(withdrawalsPerAffiliate, 5); // Limit to 5 per affiliate
    
    // Tạo các affiliate mẫu
    for (let i = 0; i < affiliates_added; i++) {
      const affiliateId = `AFF${1000 + i}`;
      const userId = 100 + i;
      
      // Tạo affiliate
      const affiliateData: Affiliate = {
        id: i + 10,
        user_id: userId,
        affiliate_id: affiliateId,
        full_name: `Affiliate Test ${i + 1}`,
        email: `affiliate${i + 1}@test.com`,
        phone: `090${1000000 + i}`,
        bank_account: `9876543${i}`,
        bank_name: "VietcomBank",
        total_contacts: 0,
        total_contracts: 0,
        contract_value: 0,
        received_balance: 0,
        paid_balance: 0,
        remaining_balance: 100000000, // 100M VND mặc định
        referred_customers: [],
        withdrawal_history: []
      };
      
      // Thêm khách hàng cho affiliate này
      for (let j = 0; j < customersPerAffiliate; j++) {
        const customerId = i * 100 + j;
        const customerData: ReferredCustomer = {
          id: customerId,
          affiliate_id: affiliateId,
          customer_name: `Customer ${customerId}`,
          email: `customer${customerId}@example.com`,
          phone: `098${7000000 + customerId}`,
          status: j % 2 === 0 ? "Đã chốt hợp đồng" : "Đang tư vấn",
          created_at: new Date(Date.now() - (j * 86400000)).toISOString(),
          updated_at: new Date(Date.now() - (j * 43200000)).toISOString(),
          contract_value: j % 2 === 0 ? 50000000 + (j * 10000000) : 0,
          commission: j % 2 === 0 ? (50000000 + (j * 10000000)) * 0.03 : 0,
          contract_date: j % 2 === 0 ? new Date(Date.now() - (j * 86400000)).toISOString() : undefined,
          note: j % 2 === 0 ? "Hợp đồng đã ký" : "Đang xử lý"
        };
        
        // Thêm khách hàng vào affiliate
        affiliateData.referred_customers.push(customerData);
        
        // Cập nhật thống kê cho affiliate
        if (customerData.status === "Đã chốt hợp đồng") {
          affiliateData.total_contracts += 1;
          const contractValue = customerData.contract_value || 0;
          const commission = contractValue * 0.03;
          
          affiliateData.contract_value += contractValue;
          affiliateData.received_balance += commission;
          affiliateData.remaining_balance += commission;
        }
        
        affiliateData.total_contacts += 1;
      }
      
      // Thêm yêu cầu rút tiền cho affiliate này
      for (let k = 0; k < withdrawalsPerAffiliate; k++) {
        const requestDate = new Date(Date.now() - (k * 172800000)); // 2 ngày một lần
        const requestTime = requestDate.toISOString();
        const amount = 5000000 + (k * 1000000); // 5M-10M VND
        
        const withdrawalHistory: WithdrawalHistory = {
          request_date: requestTime,
          amount: amount,
          note: `Yêu cầu rút tiền #${k + 1}`,
          status: k === 0 ? "Pending" : (k === 1 ? "Processing" : "Completed"),
          message: k === 0 ? undefined : (k === 1 ? "Đang xử lý giao dịch" : "Đã hoàn tất"),
          transaction_id: k > 1 ? `TXN${100000 + k}` : undefined,
          completed_date: k > 1 ? new Date(requestDate.getTime() + 86400000).toISOString() : undefined
        };
        
        // Thêm vào lịch sử rút tiền
        affiliateData.withdrawal_history.push(withdrawalHistory);
        
        // Nếu đã hoàn tất hoặc đang xử lý, giảm số dư
        if (k === 1 || k > 1) {
          affiliateData.paid_balance += amount;
          affiliateData.remaining_balance -= amount;
        }
      }
      
      // Thêm affiliate vào danh sách
      this.allAffiliates.push(affiliateData);
      
      // Thêm vào top affiliates
      this.topAffiliates.push({
        id: affiliateData.id,
        full_name: affiliateData.full_name,
        total_contracts: affiliateData.total_contracts,
        contract_value: affiliateData.contract_value
      });
    }
    
    // Cập nhật danh sách top affiliates
    this.topAffiliates.sort((a, b) => b.contract_value - a.contract_value);
    this.topAffiliates = this.topAffiliates.slice(0, 5);
    
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
  
  /**
   * Lấy danh sách top videos
   * @param limit số lượng video cần lấy
   * @returns danh sách top videos
   */
  async getTopVideos(limit: number = 5): Promise<VideoData[]> {
    // Nếu không có video nào, khởi tạo dữ liệu mẫu
    if (this.videos.length === 0) {
      this.initializeDefaultVideos();
    }
    
    // Sắp xếp theo thứ tự và lấy số lượng yêu cầu
    return this.videos
      .sort((a, b) => a.order - b.order)
      .filter(video => video.is_featured)
      .slice(0, limit);
  }
  
  /**
   * Thêm video mới
   * @param video dữ liệu video
   * @returns video đã thêm
   */
  async addVideo(video: VideoData): Promise<VideoData> {
    // Tạo ID mới
    const newId = this.videos.length > 0 
      ? Math.max(...this.videos.map(v => v.id)) + 1 
      : 1;
    
    // Tạo mới video với ID được gán
    const newVideo: VideoData = {
      ...video,
      id: newId,
      created_at: new Date().toISOString(),
      published_at: video.published_at || new Date().toISOString()
    };
    
    // Thêm vào danh sách
    this.videos.push(newVideo);
    console.log(`Added new video: ${newVideo.title}`);
    
    return newVideo;
  }
  
  /**
   * Cập nhật video
   * @param id ID của video
   * @param video dữ liệu cập nhật
   * @returns video đã cập nhật hoặc undefined nếu không tìm thấy
   */
  async updateVideo(id: number, video: Partial<VideoData>): Promise<VideoData | undefined> {
    const index = this.videos.findIndex(v => v.id === id);
    
    if (index === -1) {
      return undefined;
    }
    
    // Cập nhật thông tin
    this.videos[index] = {
      ...this.videos[index],
      ...video
    };
    
    console.log(`Updated video ID ${id}: ${this.videos[index].title}`);
    return this.videos[index];
  }
  
  /**
   * Xóa video
   * @param id ID của video
   * @returns true nếu xóa thành công, false nếu không tìm thấy
   */
  async deleteVideo(id: number): Promise<boolean> {
    const index = this.videos.findIndex(v => v.id === id);
    
    if (index === -1) {
      return false;
    }
    
    // Xóa video
    this.videos.splice(index, 1);
    console.log(`Deleted video ID ${id}`);
    
    return true;
  }
  
  /**
   * Khởi tạo danh sách video mặc định
   */
  private initializeDefaultVideos(): void {
    // Video ColorMedia từ YouTube
    this.videos = [
      {
        id: 1,
        title: "Colormedia - Brand Identity & Promotion",
        description: "Giới thiệu về ColorMedia và các dịch vụ của chúng tôi",
        youtube_id: "vSKtTKN7WJQ",
        thumbnail_url: "https://img.youtube.com/vi/vSKtTKN7WJQ/maxresdefault.jpg",
        views: 15432,
        order: 1,
        is_featured: true,
        published_at: "2023-04-15T00:00:00.000Z",
        created_at: "2023-04-15T00:00:00.000Z"
      },
      {
        id: 2,
        title: "ColorMedia - Tư vấn & Thiết kế",
        description: "Dịch vụ tư vấn và thiết kế chuyên nghiệp",
        youtube_id: "BtplBnyr_CQ",
        thumbnail_url: "https://img.youtube.com/vi/BtplBnyr_CQ/maxresdefault.jpg",
        views: 8976,
        order: 2,
        is_featured: true,
        published_at: "2023-05-10T00:00:00.000Z",
        created_at: "2023-05-10T00:00:00.000Z"
      },
      {
        id: 3,
        title: "ColorMedia - Xây dựng thương hiệu",
        description: "Giải pháp xây dựng thương hiệu toàn diện",
        youtube_id: "YnAE0VC8L3E",
        thumbnail_url: "https://img.youtube.com/vi/YnAE0VC8L3E/maxresdefault.jpg",
        views: 12430,
        order: 3,
        is_featured: true,
        published_at: "2023-06-05T00:00:00.000Z",
        created_at: "2023-06-05T00:00:00.000Z"
      },
      {
        id: 4,
        title: "ColorMedia - Quảng cáo trực tuyến",
        description: "Dịch vụ quảng cáo trực tuyến đa nền tảng",
        youtube_id: "Qj1KbL9ixBk",
        thumbnail_url: "https://img.youtube.com/vi/Qj1KbL9ixBk/maxresdefault.jpg",
        views: 7524,
        order: 4,
        is_featured: true,
        published_at: "2023-07-20T00:00:00.000Z",
        created_at: "2023-07-20T00:00:00.000Z"
      },
      {
        id: 5,
        title: "ColorMedia - Giải pháp kỹ thuật số",
        description: "Các giải pháp công nghệ cho doanh nghiệp",
        youtube_id: "q6xiIfT-l4c",
        thumbnail_url: "https://img.youtube.com/vi/q6xiIfT-l4c/maxresdefault.jpg",
        views: 10284,
        order: 5,
        is_featured: true,
        published_at: "2023-08-15T00:00:00.000Z",
        created_at: "2023-08-15T00:00:00.000Z"
      }
    ];
    
    console.log(`Initialized ${this.videos.length} default videos`);
  }
}

// Chọn loại storage dựa vào môi trường hoặc biến env
// Mặc định sử dụng MemStorage trong development để dễ test
export const storage = process.env.USE_DATABASE === "true" || process.env.NODE_ENV === "production" 
  ? new DatabaseStorage() 
  : new MemStorage();