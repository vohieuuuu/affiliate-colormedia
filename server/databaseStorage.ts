import { 
  Affiliate, 
  TopAffiliate, 
  ReferredCustomer, 
  WithdrawalRequestPayload,
  InsertAffiliate,
  CustomerStatusType,
  User,
  UserRoleType,
  InsertOtpVerification,
  OtpVerification,
  affiliates,
  withdrawalRequests,
  users,
  otpVerifications,
  WithdrawalHistory,
  WithdrawalStatus,
  WithdrawalStatusType
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
  
  async getAffiliateByAffiliateId(affiliateId: string): Promise<Affiliate | undefined> {
    // Tìm affiliate theo ID mã định danh
    try {
      const [affiliate] = await db.select()
        .from(affiliates)
        .where(eq(affiliates.affiliate_id, affiliateId));
      
      return affiliate || undefined;
    } catch (error) {
      console.error("Error fetching affiliate by affiliate_id:", error);
      return undefined;
    }
  }

  async getAffiliateByUserId(userId: number): Promise<Affiliate | undefined> {
    // Tìm affiliate theo ID của người dùng liên kết
    try {
      const [affiliate] = await db.select()
        .from(affiliates)
        .where(eq(affiliates.user_id, userId));
      
      return affiliate || undefined;
    } catch (error) {
      console.error("Error fetching affiliate by user_id:", error);
      return undefined;
    }
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
    
    // 2. Kiểm tra giới hạn rút tiền theo ngày
    const dailyLimitCheck = await this.checkDailyWithdrawalLimit(request.user_id, request.amount_requested);
    if (dailyLimitCheck.exceeds) {
      throw new Error(`Vượt quá giới hạn rút tiền trong ngày. Hạn mức còn lại: ${dailyLimitCheck.remainingLimit.toLocaleString()} VND`);
    }
    
    // 3. Kiểm tra số dư
    if (affiliate.remaining_balance < request.amount_requested) {
      throw new Error(`Số tiền yêu cầu vượt quá số dư khả dụng: ${affiliate.remaining_balance.toLocaleString()} VND`);
    }
    
    // 4. Thêm withdrawal request vào bảng withdrawal_requests
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
    
    // 5. Cập nhật withdrawal_history của affiliate
    const history = affiliate.withdrawal_history || [];
    history.unshift({
      request_date: request.request_time,
      amount: request.amount_requested,
      note: request.note || "",
      status: "Pending" // Trạng thái ban đầu là Pending
    });
    
    // 6. Cập nhật affiliate với trạng thái Pending (chưa trừ tiền)
    await db.update(affiliates)
      .set({ 
        withdrawal_history: history
      })
      .where(eq(affiliates.id, affiliate.id));
      
    // 7. Đổi trạng thái thành Processing và trừ tiền 
    await this.updateWithdrawalStatus(request.user_id, request.request_time, "Processing");
  }
  
  /**
   * Cập nhật trạng thái yêu cầu rút tiền
   * @param affiliateId ID của affiliate
   * @param requestTime Thời gian yêu cầu
   * @param newStatus Trạng thái mới
   * @returns Thông tin yêu cầu nếu cập nhật thành công, undefined nếu không tìm thấy
   */
  async updateWithdrawalStatus(affiliateId: string, requestTime: string, newStatus: WithdrawalStatusType): Promise<WithdrawalHistory | undefined> {
    // Tìm affiliate dựa vào ID
    const [affiliate] = await db.select()
      .from(affiliates)
      .where(eq(affiliates.affiliate_id, affiliateId));
      
    if (!affiliate) {
      return undefined;
    }
    
    // Tìm yêu cầu rút tiền dựa vào requestTime
    const history = affiliate.withdrawal_history || [];
    const withdrawalIdx = history.findIndex(wh => wh.request_date === requestTime);
    
    if (withdrawalIdx === -1) {
      return undefined;
    }
    
    // Lấy trạng thái hiện tại và số tiền yêu cầu
    const currentStatus = history[withdrawalIdx].status;
    const withdrawalAmount = history[withdrawalIdx].amount;
    
    // Cập nhật trạng thái
    history[withdrawalIdx].status = newStatus;
    
    // Xử lý logic dựa vào trạng thái mới
    let updateFields: any = { withdrawal_history: history };
    
    // Nếu trạng thái mới là "Processing" và trạng thái hiện tại không phải "Processing"
    // thì cần trừ số dư
    if (newStatus === "Processing" && currentStatus !== "Processing") {
      const success = await this.updateAffiliateBalance(affiliateId, withdrawalAmount);
      if (!success) {
        throw new Error("Không thể cập nhật số dư hiện tại");
      }
    }
    
    // Cập nhật affiliate
    await db.update(affiliates)
      .set(updateFields)
      .where(eq(affiliates.id, affiliate.id));
      
    return history[withdrawalIdx];
  }
  
  /**
   * Kiểm tra giới hạn rút tiền trong ngày
   * @param affiliateId ID của affiliate
   * @param amount Số tiền muốn rút
   * @returns Kết quả kiểm tra với thông tin tổng đã rút và giới hạn còn lại
   */
  async checkDailyWithdrawalLimit(affiliateId: string, amount: number): Promise<{exceeds: boolean, totalWithdrawn: number, remainingLimit: number}> {
    // Tìm affiliate dựa vào ID
    const [affiliate] = await db.select()
      .from(affiliates)
      .where(eq(affiliates.affiliate_id, affiliateId));
      
    if (!affiliate) {
      return { exceeds: true, totalWithdrawn: 0, remainingLimit: 0 };
    }
    
    const DAILY_LIMIT = 20000000; // 20 triệu VND
    const today = new Date().toISOString().split('T')[0]; // format YYYY-MM-DD
    
    // Tính tổng số tiền đã rút trong ngày hôm nay
    let totalWithdrawnToday = 0;
    const history = affiliate.withdrawal_history || [];
    
    for (const withdrawal of history) {
      const withdrawalDate = new Date(withdrawal.request_date).toISOString().split('T')[0];
      if (withdrawalDate === today) {
        totalWithdrawnToday += withdrawal.amount;
      }
    }
    
    // Kiểm tra giới hạn
    const remainingLimit = DAILY_LIMIT - totalWithdrawnToday;
    const exceeds = (totalWithdrawnToday + amount) > DAILY_LIMIT;
    
    return {
      exceeds,
      totalWithdrawn: totalWithdrawnToday,
      remainingLimit
    };
  }
  
  /**
   * Cập nhật số dư của affiliate
   * @param affiliateId ID của affiliate
   * @param amount Số tiền cần trừ (số dương)
   * @returns true nếu cập nhật thành công, false nếu không
   */
  async updateAffiliateBalance(affiliateId: string, amount: number): Promise<boolean> {
    // Tìm affiliate dựa vào ID
    const [affiliate] = await db.select()
      .from(affiliates)
      .where(eq(affiliates.affiliate_id, affiliateId));
      
    if (!affiliate) {
      return false;
    }
    
    // Kiểm tra số dư
    if (affiliate.remaining_balance < amount) {
      return false;
    }
    
    // Trừ số dư, cập nhật paid_balance
    const remaining_balance = affiliate.remaining_balance - amount;
    const paid_balance = affiliate.paid_balance + amount;
    
    // Cập nhật affiliate
    await db.update(affiliates)
      .set({ remaining_balance, paid_balance })
      .where(eq(affiliates.id, affiliate.id));
      
    return true;
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
    
    const now = new Date().toISOString();
    
    // 2. Đảm bảo có đầy đủ dữ liệu cho khách hàng
    const newCustomer: ReferredCustomer = {
      ...customerData,
      created_at: customerData.created_at || now,
      updated_at: customerData.updated_at || now
    };
    
    // 3. Nếu trạng thái là "Contract signed", cập nhật thông tin hợp đồng
    if (newCustomer.status === "Contract signed") {
      const contractValue = newCustomer.contract_value || 20000000; // 20M VND
      const commission = contractValue * 0.03; // 3% hoa hồng theo yêu cầu mới
      
      newCustomer.contract_value = contractValue;
      newCustomer.commission = commission;
      newCustomer.contract_date = newCustomer.contract_date || now;
    }
    
    // 4. Cập nhật referred_customers
    const customers = affiliate.referred_customers || [];
    customers.unshift(newCustomer);
    
    // 5. Cập nhật tổng số khách hàng
    const total_contacts = affiliate.total_contacts + 1;
    
    // 6. Nếu trạng thái là "Contract signed", cập nhật hợp đồng
    let total_contracts = affiliate.total_contracts;
    let contract_value = affiliate.contract_value;
    let remaining_balance = affiliate.remaining_balance;
    let received_balance = affiliate.received_balance;
    
    if (newCustomer.status === "Contract signed") {
      total_contracts += 1;
      const contractValue = newCustomer.contract_value || 20000000;
      contract_value += contractValue;
      const commission = contractValue * 0.03; // 3% hoa hồng theo yêu cầu mới
      remaining_balance += commission;
      received_balance += commission;
    }
    
    // 7. Cập nhật affiliate
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
    const now = new Date().toISOString();
    
    // Tạo đối tượng khách hàng cập nhật
    let updatedCustomer = {
      ...customers[customerId],
      status,
      note: description,
      updated_at: now
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
      const commission = defaultValue * 0.03; // 3% hoa hồng theo yêu cầu mới
      remaining_balance += commission;
      received_balance += commission;
      
      // Cập nhật thông tin hợp đồng cho khách hàng
      updatedCustomer = {
        ...updatedCustomer,
        contract_value: defaultValue,
        commission: commission,
        contract_date: now
      };
    }
    
    // Cập nhật khách hàng trong danh sách
    customers[customerId] = updatedCustomer;
    
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
          
          const now = new Date().toISOString();
          const contractValue = status === "Contract signed" ? 20000000 : undefined;
          const commission = contractValue ? contractValue * 0.03 : undefined;
          
          const customerData: ReferredCustomer = {
            customer_name: companyName,
            status: status as CustomerStatusType,
            created_at: now,
            updated_at: now,
            contract_value: contractValue,
            commission: commission,
            contract_date: status === "Contract signed" ? now : undefined,
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
  
  // Phương thức quản lý người dùng
  
  // Lấy người dùng theo tên đăng nhập
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select()
        .from(users)
        .where(eq(users.username, username));
      
      return user || undefined;
    } catch (error) {
      console.error("Error fetching user by username:", error);
      return undefined;
    }
  }

  // Tạo người dùng mới
  async createUser(userData: { username: string; password: string; role: UserRoleType; is_first_login?: boolean }): Promise<User> {
    try {
      const [newUser] = await db.insert(users)
        .values({
          username: userData.username,
          password: userData.password,
          role: userData.role,
          is_first_login: userData.is_first_login ? 1 : 0
        })
        .returning();
      
      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user account");
    }
  }

  // Lấy người dùng theo ID
  async getUserById(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, id));
      
      return user || undefined;
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return undefined;
    }
  }

  // Cập nhật mật khẩu người dùng
  async updateUserPassword(userId: number, password: string): Promise<void> {
    try {
      await db.update(users)
        .set({ password })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error("Error updating user password:", error);
      throw new Error("Failed to update password");
    }
  }

  // Đánh dấu đã hoàn thành đăng nhập lần đầu
  async markFirstLoginComplete(userId: number): Promise<void> {
    try {
      await db.update(users)
        .set({ is_first_login: 0 })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error("Error marking first login complete:", error);
      throw new Error("Failed to update first login status");
    }
  }

  // Phương thức quản lý OTP

  /**
   * Tạo mã OTP mới
   * @param userId ID của người dùng
   * @param verificationType Loại xác thực (WITHDRAWAL, PASSWORD_RESET, etc.)
   * @param relatedId ID của đối tượng liên quan (ví dụ: ID của yêu cầu rút tiền)
   * @returns Mã OTP đã tạo
   */
  async createOtp(userId: number, verificationType: string, relatedId?: number): Promise<string> {
    try {
      // Tạo mã OTP 6 chữ số
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Tạo thời gian hết hạn (5 phút từ hiện tại)
      const expireAt = new Date();
      expireAt.setMinutes(expireAt.getMinutes() + 5);
      
      // Loại bỏ các OTP cũ chưa sử dụng của người dùng với cùng loại xác thực
      await db.delete(otpVerifications)
        .where(
          eq(otpVerifications.user_id, userId) && 
          eq(otpVerifications.verification_type, verificationType) && 
          eq(otpVerifications.is_used, 0)
        );
      
      // Tạo OTP mới
      await db.insert(otpVerifications).values({
        user_id: userId,
        otp_code: otpCode,
        verification_type: verificationType,
        related_id: relatedId || null,
        expire_at: expireAt,
        is_used: 0,
        attempt_count: 0
      });
      
      return otpCode;
    } catch (error) {
      console.error("Error creating OTP:", error);
      throw new Error("Failed to create OTP");
    }
  }
  
  /**
   * Xác thực mã OTP
   * @param userId ID của người dùng
   * @param otpCode Mã OTP cần xác thực
   * @param verificationType Loại xác thực
   * @returns true nếu OTP hợp lệ, false nếu không
   */
  async verifyOtp(userId: number, otpCode: string, verificationType: string): Promise<boolean> {
    try {
      // Tìm OTP phù hợp với điều kiện
      const [otp] = await db.select()
        .from(otpVerifications)
        .where(
          eq(otpVerifications.user_id, userId) && 
          eq(otpVerifications.otp_code, otpCode) && 
          eq(otpVerifications.verification_type, verificationType) && 
          eq(otpVerifications.is_used, 0)
        );
      
      if (!otp) {
        return false;
      }
      
      // Kiểm tra thời gian hết hạn
      if (otp.expire_at < new Date()) {
        return false;
      }
      
      // Kiểm tra số lần thử
      if (otp.attempt_count >= 5) {
        return false;
      }
      
      // Đánh dấu OTP đã được sử dụng
      await db.update(otpVerifications)
        .set({ is_used: 1 })
        .where(eq(otpVerifications.id, otp.id));
      
      return true;
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return false;
    }
  }
  
  /**
   * Tăng số lần thử sai OTP
   * @param userId ID của người dùng
   * @param otpCode Mã OTP
   * @returns Số lần thử hiện tại sau khi tăng
   */
  async increaseOtpAttempt(userId: number, otpCode: string): Promise<number> {
    try {
      // Tìm OTP
      const [otp] = await db.select()
        .from(otpVerifications)
        .where(
          eq(otpVerifications.user_id, userId) && 
          eq(otpVerifications.otp_code, otpCode) && 
          eq(otpVerifications.is_used, 0)
        );
      
      if (!otp) {
        return 0;
      }
      
      // Tăng số lần thử
      const newAttemptCount = otp.attempt_count + 1;
      
      // Cập nhật vào database
      await db.update(otpVerifications)
        .set({ 
          attempt_count: newAttemptCount,
          is_used: newAttemptCount >= 5 ? 1 : 0 // Nếu vượt quá 5 lần thử, đánh dấu đã sử dụng
        })
        .where(eq(otpVerifications.id, otp.id));
      
      return newAttemptCount;
    } catch (error) {
      console.error("Error increasing OTP attempt:", error);
      return 0;
    }
  }
  
  /**
   * Đánh dấu OTP không còn hiệu lực
   * @param userId ID của người dùng
   * @param otpCode Mã OTP
   */
  async invalidateOtp(userId: number, otpCode: string): Promise<void> {
    try {
      await db.update(otpVerifications)
        .set({ is_used: 1 })
        .where(
          eq(otpVerifications.user_id, userId) && 
          eq(otpVerifications.otp_code, otpCode)
        );
    } catch (error) {
      console.error("Error invalidating OTP:", error);
    }
  }
}