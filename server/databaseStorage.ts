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
  VideoData,
  affiliates,
  withdrawalRequests,
  users,
  otpVerifications,
  WithdrawalHistory,
  WithdrawalStatus,
  WithdrawalStatusType,
  KolVipAffiliate,
  InsertKolVipAffiliate,
  KolContact,
  kolVipAffiliates,
  kolContacts,
  KpiPerformanceTypeValue,
  KolVipLevelType,
  MonthlyKpi
} from '../shared/schema.js';
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";
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

  async getAffiliateByEmail(email: string): Promise<Affiliate | undefined> {
    // Tìm affiliate theo email
    try {
      const [affiliate] = await db.select()
        .from(affiliates)
        .where(eq(affiliates.email, email));
      
      return affiliate || undefined;
    } catch (error) {
      console.error("Error getting affiliate by email:", error);
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
    
    // 2. Kiểm tra số dư tích lũy có bằng 0 không
    if (affiliate.remaining_balance <= 0) {
      throw new Error("Không thể tạo yêu cầu rút tiền khi số dư hoa hồng tích lũy bằng 0");
    }
    
    // 3. Kiểm tra giới hạn rút tiền theo ngày
    const dailyLimitCheck = await this.checkDailyWithdrawalLimit(request.user_id, request.amount_requested);
    if (dailyLimitCheck.exceeds) {
      throw new Error(`Vượt quá giới hạn rút tiền trong ngày. Hạn mức còn lại: ${dailyLimitCheck.remainingLimit.toLocaleString()} VND`);
    }
    
    // 4. Kiểm tra số dư
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
    
    // 5. Cập nhật withdrawal_history của affiliate với thông tin thuế nếu có
    const history = affiliate.withdrawal_history || [];
    history.unshift({
      request_date: request.request_time,
      amount: request.amount_requested,
      tax_amount: request.tax_amount || 0,
      amount_after_tax: request.amount_after_tax || request.amount_requested,
      has_tax: request.has_tax || false,
      tax_rate: request.tax_rate || 0,
      note: request.note || "",
      status: "Pending" // Trạng thái ban đầu là Pending
    });
    
    // 6. Trừ số dư trực tiếp ở trạng thái Pending
    const updatedRemainingBalance = affiliate.remaining_balance - request.amount_requested;
    const updatedPaidBalance = (affiliate.paid_balance || 0) + request.amount_requested;
    
    console.log(`Trừ số dư trực tiếp ở trạng thái Pending: ${affiliate.remaining_balance} -> ${updatedRemainingBalance}`);
    
    // Cập nhật affiliate với trạng thái Pending và trừ tiền ngay lập tức
    await db.update(affiliates)
      .set({ 
        withdrawal_history: history,
        remaining_balance: updatedRemainingBalance,
        paid_balance: updatedPaidBalance
      })
      .where(eq(affiliates.id, affiliate.id));
      
    // Tiền đã được trừ ở trên rồi, không cần chuyển sang Processing nữa
    // Điều này ngăn chặn tình trạng bị trừ tiền hai lần khi cập nhật trạng thái

    // Trong trường hợp cần thêm xử lý OTP hoặc logic khác, hãy thêm code ở đây
    console.log(`Yêu cầu rút tiền đã được tạo ở trạng thái Pending và số dư đã được trừ ngay lập tức`);
    
    // Không gọi updateWithdrawalStatus nữa vì đã trừ tiền ở trên
    // try {
    //   await this.updateWithdrawalStatus(request.user_id, request.request_time, "Processing");
    // } catch (error) {
    //   console.error("Lỗi khi cập nhật trạng thái, hoàn lại tiền:", error);
    //   await db.update(affiliates)
    //     .set({ 
    //       remaining_balance: affiliate.remaining_balance,
    //       paid_balance: affiliate.paid_balance || 0
    //     })
    //     .where(eq(affiliates.id, affiliate.id));
    //   throw error;
    // }
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
    
    // Không trừ tiền ở Completed vì đã trừ ở Pending
    if (newStatus === "Completed" && currentStatus !== "Completed") {
      console.log(`Chuyển sang trạng thái Completed, không trừ tiền nữa vì đã trừ ở Pending.`);
    }
    
    // Nếu trạng thái mới là "Rejected" hoặc "Cancelled"
    // thì cần hoàn lại tiền vì đã trừ ở Pending
    if ((newStatus === "Rejected" || newStatus === "Cancelled") && currentStatus !== "Rejected" && currentStatus !== "Cancelled") {
      // Lấy affiliate mới nhất để đảm bảo số dư chính xác
      const [latestAffiliate] = await db.select()
        .from(affiliates)
        .where(eq(affiliates.affiliate_id, affiliateId));
      
      if (!latestAffiliate) {
        throw new Error("Không thể tìm thấy affiliate");
      }
      
      // Hoàn lại tiền vì yêu cầu bị từ chối
      updateFields.remaining_balance = latestAffiliate.remaining_balance + withdrawalAmount;
      updateFields.paid_balance = Math.max(0, (latestAffiliate.paid_balance || 0) - withdrawalAmount);
      
      console.log(`Yêu cầu rút tiền bị ${newStatus}, hoàn lại ${withdrawalAmount} vào số dư. Số dư mới: ${updateFields.remaining_balance}`);
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

  async addReferredCustomer(affiliateId: string, customerData: ReferredCustomer): Promise<ReferredCustomer> {
    // 1. Tìm affiliate theo affiliateId (mã AFF)
    const [affiliate] = await db.select()
      .from(affiliates)
      .where(eq(affiliates.affiliate_id, affiliateId));
    
    if (!affiliate) {
      throw new Error("Affiliate not found");
    }
    
    const now = new Date().toISOString();
    
    // Lấy tất cả referred_customers của tất cả affiliates để tìm ID lớn nhất
    const allAffiliates = await db.select().from(affiliates);
    const allCustomers: ReferredCustomer[] = allAffiliates.flatMap(
      aff => aff.referred_customers || []
    );
    
    // Tìm ID lớn nhất hiện có (nếu có) và tăng lên 1
    const maxCustomerId = allCustomers.length > 0 
      ? Math.max(...allCustomers.filter(c => c.id !== undefined).map(c => c.id || 0)) 
      : -1;
    const newCustomerId = maxCustomerId + 1;
    
    // 2. Đảm bảo có đầy đủ dữ liệu cho khách hàng
    const newCustomer: ReferredCustomer = {
      ...customerData,
      id: newCustomerId, // Thêm ID duy nhất
      created_at: customerData.created_at || now,
      updated_at: customerData.updated_at || now
    };
    
    // 3. Nếu trạng thái là "Đã chốt hợp đồng", cập nhật thông tin hợp đồng
    if (newCustomer.status === "Đã chốt hợp đồng") {
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
    
    // 6. Nếu trạng thái là "Đã chốt hợp đồng", cập nhật hợp đồng
    let total_contracts = affiliate.total_contracts;
    let contract_value = affiliate.contract_value;
    let remaining_balance = affiliate.remaining_balance;
    let received_balance = affiliate.received_balance;
    
    if (newCustomer.status === "Đã chốt hợp đồng") {
      total_contracts += 1;
      const contractValue = newCustomer.contract_value || 20000000;
      contract_value += contractValue;
      // Làm tròn hoa hồng thành số nguyên
      const commission = Math.round(contractValue * 0.03); // 3% hoa hồng theo yêu cầu mới
      remaining_balance += commission;
      received_balance += commission;
      
      // Đảm bảo các giá trị contract_value, commission là số nguyên
      newCustomer.contract_value = Math.round(contractValue);
      newCustomer.commission = commission;
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
      .where(eq(affiliates.id, affiliate.id));
      
    // 8. Trả về đối tượng khách hàng mới với ID
    return newCustomer;
  }

  async updateCustomerStatus(
    affiliateId: string,
    customerId: number, 
    status: CustomerStatusType, 
    description: string
  ): Promise<ReferredCustomer | undefined> {
    // Tìm affiliate theo ID
    const [affiliate] = await db.select()
      .from(affiliates)
      .where(eq(affiliates.affiliate_id, affiliateId));
      
    if (!affiliate) {
      console.error(`Affiliate with ID ${affiliateId} not found`);
      return undefined;
    }
    
    // Lấy danh sách khách hàng và tìm theo ID thực
    const customers = [...(affiliate.referred_customers || [])]; // Tạo bản sao
    
    // Tìm khách hàng theo ID duy nhất
    const customerIndex = customers.findIndex(
      customer => customer.id === customerId
    );
    
    console.log(`DatabaseStorage: Finding customer with ID ${customerId} for affiliate ${affiliateId}, found at index ${customerIndex}`);
    
    // Nếu không tìm thấy khách hàng
    if (customerIndex === -1) {
      console.error(`Customer with ID ${customerId} not found for affiliate ${affiliateId}`);
      return undefined;
    }
    
    // 2. Cập nhật thông tin khách hàng
    const oldStatus = customers[customerIndex].status;
    const now = new Date().toISOString();
    
    // Tạo đối tượng khách hàng cập nhật
    let updatedCustomer = {
      ...customers[customerIndex],
      status,
      note: description,
      updated_at: now
    };
    
    // 3. Nếu trạng thái mới là "Đã chốt hợp đồng" và trạng thái cũ không phải
    let total_contracts = affiliate.total_contracts;
    let contract_value = affiliate.contract_value;
    let remaining_balance = affiliate.remaining_balance;
    let received_balance = affiliate.received_balance;
    
    if (status === "Đã chốt hợp đồng" && oldStatus !== "Đã chốt hợp đồng") {
      total_contracts += 1;
      const defaultValue = 20000000; // 20M VND
      contract_value += defaultValue;
      // Làm tròn hoa hồng thành số nguyên
      const commission = Math.round(defaultValue * 0.03); // 3% hoa hồng theo yêu cầu mới
      remaining_balance += commission;
      received_balance += commission;
      
      // Cập nhật thông tin hợp đồng cho khách hàng (tất cả là số nguyên)
      updatedCustomer = {
        ...updatedCustomer,
        contract_value: Math.round(defaultValue),
        commission: Math.round(commission),
        contract_date: now
      };
      
      console.log(`Updated total_contracts to ${total_contracts} for affiliate ${affiliateId}`);
    }
    
    // Cập nhật khách hàng trong danh sách
    customers[customerIndex] = updatedCustomer;
    
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
    
    return customers[customerIndex];
  }

  async updateCustomerWithContract(
    customerId: number, 
    customerData: ReferredCustomer, 
    balanceUpdates: { 
      contract_value: number; 
      received_balance: number; 
      remaining_balance: number 
    }
  ): Promise<ReferredCustomer | undefined> {
    try {
      console.log(`DatabaseStorage: Updating customer contract for ID ${customerId}`);
      
      // 1. Lấy affiliate cụ thể theo customerData.affiliate_id hoặc lấy affiliate đầu tiên nếu không có
      let affiliate;
      
      if (customerData.affiliate_id) {
        [affiliate] = await db.select()
          .from(affiliates)
          .where(eq(affiliates.affiliate_id, customerData.affiliate_id));
      }
      
      // Nếu không tìm thấy, lấy affiliate đầu tiên
      if (!affiliate) {
        [affiliate] = await db.select().from(affiliates).limit(1);
      }
      
      if (!affiliate || !affiliate.referred_customers) {
        console.error(`No affiliate found for customer with ID ${customerId}`);
        return undefined;
      }
      
      // 2. Tạo bản sao danh sách khách hàng
      const customers = [...affiliate.referred_customers];
      
      // 3. Tìm khách hàng theo ID duy nhất
      const customerIndex = customers.findIndex(
        customer => customer.id === customerId
      );
      
      console.log(`DatabaseStorage: Finding customer with ID ${customerId}, found at index ${customerIndex}`);
      
      // Nếu không tìm thấy khách hàng
      if (customerIndex === -1) {
        console.error(`Customer with ID ${customerId} not found for affiliate ${affiliate.affiliate_id}`);
        return undefined;
      }
      
      // 4. Cập nhật thông tin khách hàng
      customers[customerIndex] = {
        ...customerData,
        updated_at: new Date().toISOString() // Đảm bảo cập nhật thời gian mới nhất
      };
      
      // 5. Tính toán cập nhật tổng số hợp đồng nếu cần
      let total_contracts = affiliate.total_contracts;
      
      // Nếu trước đây khách hàng chưa có contract_value nhưng bây giờ có,
      // tăng tổng số hợp đồng
      const oldCustomer = affiliate.referred_customers[customerIndex];
      if (!oldCustomer.contract_value && customerData.contract_value) {
        total_contracts += 1;
      }
      
      // 6. Tính toán sự chênh lệch giữa giá trị hiện tại và giá trị mới
      // Chỉ tính chênh lệch và cộng dồn, không ghi đè toàn bộ giá trị
      const currentContractValue = affiliate.contract_value || 0;
      const newContractValue = (balanceUpdates.contract_value || 0);
      const contractValueDifference = Math.max(0, newContractValue - currentContractValue);
      
      // Tính toán giá trị chênh lệch của hoa hồng (3% của giá trị hợp đồng mới) và làm tròn thành số nguyên
      const commissionDifference = Math.round(contractValueDifference * 0.03);
      
      console.log(`Contract value calculation: Current=${currentContractValue}, New=${newContractValue}, Difference=${contractValueDifference}`);
      console.log(`Commission calculation: Difference=${commissionDifference} (rounded from ${contractValueDifference * 0.03})`);
      
      // Làm tròn tất cả các giá trị về số nguyên trước khi cập nhật vào database
      const newTotalContractValue = Math.round(currentContractValue + contractValueDifference);
      // Làm tròn số và chuyển về số nguyên để tránh lỗi khi lưu vào database
      const newReceivedBalance = Math.round((affiliate.received_balance || 0) + commissionDifference);
      const newRemainingBalance = Math.round((affiliate.remaining_balance || 0) + commissionDifference);
      
      // Đảm bảo customerData.commission là số nguyên
      if (customerData.commission) {
        customerData.commission = Math.round(customerData.commission);
      }
      
      // Đảm bảo customerData.contract_value là số nguyên
      if (customerData.contract_value) {
        customerData.contract_value = Math.round(customerData.contract_value);
      }
      
      console.log(`New values after adding differences (rounded): contract_value=${newTotalContractValue}, received_balance=${newReceivedBalance}, remaining_balance=${newRemainingBalance}`);
      
      // Thực hiện cập nhật vào cơ sở dữ liệu
      await db.update(affiliates)
        .set({
          referred_customers: customers,
          total_contracts,
          contract_value: newTotalContractValue,
          received_balance: newReceivedBalance,
          remaining_balance: newRemainingBalance
        })
        .where(eq(affiliates.id, affiliate.id));
      
      // 7. Ghi log thành công
      console.log(`DatabaseStorage: Successfully updated customer #${customerId} with contract value ${customerData.contract_value}`);
      console.log(`DatabaseStorage: Updated affiliate balance: contract_value=${balanceUpdates.contract_value}, received_balance=${balanceUpdates.received_balance}, remaining_balance=${balanceUpdates.remaining_balance}`);
      
      // 8. Trả về khách hàng đã được cập nhật
      return customers[customerIndex];
      
    } catch (error) {
      console.error("DatabaseStorage: Error updating customer with contract:", error);
      return undefined;
    }
  }

  // Development version - more detailed implementation
  private async _seedDataDev(affiliatesCount: number, customersPerAffiliate: number, withdrawalsPerAffiliate: number): Promise<{ affiliates_added: number, customers_added: number, withdrawals_added: number }> {
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
          const status = j % 5 === 0 ? "Đã chốt hợp đồng" : 
                        j % 4 === 0 ? "Chờ phản hồi" : 
                        j % 3 === 0 ? "Đang tư vấn" : 
                        j % 2 === 0 ? "Không tiềm năng" : "Mới nhập";
          
          const now = new Date().toISOString();
          const contractValue = status === "Đã chốt hợp đồng" ? 20000000 : undefined;
          const commission = contractValue ? contractValue * 0.03 : undefined;
          
          const customerData: ReferredCustomer = {
            customer_name: companyName,
            status: status as CustomerStatusType,
            created_at: now,
            updated_at: now,
            contract_value: contractValue,
            commission: commission,
            contract_date: status === "Đã chốt hợp đồng" ? now : undefined,
            note: `Khách hàng được giới thiệu bởi ${newAffiliate.full_name}`
          };
          
          await this.addReferredCustomer(newAffiliate.affiliate_id, customerData);
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
  
  // Phương thức quản lý video (triển khai cơ bản)
  
  /**
   * Lấy danh sách top videos
   * @param limit số lượng video cần lấy
   * @returns danh sách top videos
   */
  async getTopVideos(limit: number = 5): Promise<VideoData[]> {
    // Dữ liệu mẫu để tránh lỗi interface
    return [
      {
        id: 1,
        title: "Colormedia - Brand Identity & Promotion",
        description: "Giới thiệu về ColorMedia và các dịch vụ của chúng tôi",
        youtube_id: "vSKtTKN7WJQ",
        thumbnail_url: "https://img.youtube.com/vi/vSKtTKN7WJQ/maxresdefault.jpg",
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
        order: 2,
        is_featured: true,
        published_at: "2023-05-10T00:00:00.000Z",
        created_at: "2023-05-10T00:00:00.000Z"
      }
    ].slice(0, limit);
  }
  
  /**
   * Thêm video mới
   * @param video dữ liệu video
   * @returns video đã thêm
   */
  async addVideo(video: VideoData): Promise<VideoData> {
    // TODO: Implement when VideoSchema table is created
    return {
      ...video,
      id: 1,
      created_at: new Date().toISOString()
    };
  }
  
  /**
   * Cập nhật video
   * @param id ID của video
   * @param video dữ liệu cập nhật
   * @returns video đã cập nhật hoặc undefined nếu không tìm thấy
   */
  async updateVideo(id: number, video: Partial<VideoData>): Promise<VideoData | undefined> {
    // TODO: Implement when VideoSchema table is created
    return {
      id,
      title: video.title || "Video tiêu đề",
      youtube_id: video.youtube_id || "dQw4w9WgXcQ",
      order: video.order || 1,
      is_featured: video.is_featured !== undefined ? video.is_featured : true,
      published_at: video.published_at || new Date().toISOString(),
      created_at: new Date().toISOString()
    };
  }
  
  /**
   * Xóa video
   * @param id ID của video
   * @returns true nếu xóa thành công, false nếu không tìm thấy
   */
  async deleteVideo(id: number): Promise<boolean> {
    // TODO: Implement when VideoSchema table is created
    return true;
  }
  
  // Production version - less complex implementation
  async seedData(affiliatesCount: number, customersPerAffiliate: number, withdrawalsPerAffiliate: number): Promise<{ affiliates_added: number, customers_added: number, withdrawals_added: number }> {
    // Return empty result in production mode
    return { affiliates_added: 0, customers_added: 0, withdrawals_added: 0 };
  }

  // Phương thức quản lý KOL/VIP Affiliate
  async createKolVipAffiliate(kolVipData: InsertKolVipAffiliate): Promise<KolVipAffiliate> {
    try {
      console.log("Creating new KOL/VIP affiliate with ID:", kolVipData.affiliate_id);
      
      // Kiểm tra xem affiliate_id đã tồn tại chưa
      const existingKolVip = await this.getKolVipByAffiliateId(kolVipData.affiliate_id);
      if (existingKolVip) {
        console.log(`KOL/VIP Affiliate with ID ${kolVipData.affiliate_id} already exists`);
        return existingKolVip;
      }
      
      console.log("No KOL/VIP found with affiliate_id:", kolVipData.affiliate_id);
      
      // Chuẩn bị dữ liệu cơ bản cho việc chèn
      const insertData = {
        user_id: kolVipData.user_id,
        affiliate_id: kolVipData.affiliate_id,
        full_name: kolVipData.full_name,
        email: kolVipData.email,
        phone: kolVipData.phone,
        bank_account: kolVipData.bank_account,
        bank_name: kolVipData.bank_name,
        level: kolVipData.level || "LEVEL_1",
        current_base_salary: kolVipData.current_base_salary || 5000000
      };
      
      console.log("Inserting KOL/VIP with basic data:", insertData);
      
      // Thử chèn với ít trường dữ liệu hơn
      try {
        const [newKolVipAffiliate] = await db.insert(kolVipAffiliates)
          .values(insertData)
          .returning();
        
        console.log("KOL/VIP created successfully:", newKolVipAffiliate);
        return newKolVipAffiliate;
      } catch (insertError) {
        console.error("Error during insert operation:", insertError);
        
        // Thử lại với truy vấn SQL trực tiếp
        console.log("Attempting direct SQL insert");
        const result = await db.execute(`
          INSERT INTO kol_vip_affiliates (user_id, affiliate_id, full_name, email, phone, bank_account, bank_name, level, current_base_salary)
          VALUES (${kolVipData.user_id}, '${kolVipData.affiliate_id}', '${kolVipData.full_name}', '${kolVipData.email}', 
                 '${kolVipData.phone}', '${kolVipData.bank_account}', '${kolVipData.bank_name}', 
                 '${kolVipData.level || "LEVEL_1"}', ${kolVipData.current_base_salary || 5000000})
          RETURNING *
        `);
        
        console.log("Direct SQL insert result:", result);
        
        if (result.rows && result.rows.length > 0) {
          return result.rows[0] as KolVipAffiliate;
        } else {
          throw new Error("Failed to create KOL/VIP affiliate using direct SQL");
        }
      }
    } catch (error) {
      console.error("Error creating KOL/VIP affiliate:", error);
      throw new Error("Failed to create KOL/VIP affiliate");
    }
  }
  
  async getKolVipAffiliateByAffiliateId(affiliateId: string): Promise<KolVipAffiliate | undefined> {
    try {
      const [kolVip] = await db.select()
        .from(kolVipAffiliates)
        .where(eq(kolVipAffiliates.affiliate_id, affiliateId));
      
      return kolVip || undefined;
    } catch (error) {
      console.error("Error fetching KOL/VIP by affiliate_id:", error);
      return undefined;
    }
  }
  
  async getKolVipAffiliateByUserId(userId: number): Promise<KolVipAffiliate | undefined> {
    try {
      const [kolVip] = await db.select()
        .from(kolVipAffiliates)
        .where(eq(kolVipAffiliates.user_id, userId));
      
      return kolVip || undefined;
    } catch (error) {
      console.error("Error fetching KOL/VIP by user_id:", error);
      return undefined;
    }
  }
  
  async getKolVipAffiliateByEmail(email: string): Promise<KolVipAffiliate | undefined> {
    try {
      const [kolVip] = await db.select()
        .from(kolVipAffiliates)
        .where(eq(kolVipAffiliates.email, email));
      
      return kolVip || undefined;
    } catch (error) {
      console.error("Error fetching KOL/VIP by email:", error);
      return undefined;
    }
  }
  
  async updateKolVipAffiliateLevel(affiliateId: string, newLevel: KolVipLevelType): Promise<KolVipAffiliate | undefined> {
    try {
      // 1. Tìm KOL/VIP affiliate
      const kolVip = await this.getKolVipByAffiliateId(affiliateId);
      if (!kolVip) {
        return undefined;
      }
      
      // 2. Tính toán lương cơ bản dựa trên cấp mới
      let newBaseSalary = 5000000; // LEVEL_1
      if (newLevel === "LEVEL_2") {
        newBaseSalary = 10000000;
      } else if (newLevel === "LEVEL_3") {
        newBaseSalary = 15000000;
      }
      
      // 3. Cập nhật thông tin KOL/VIP
      const [updatedKolVip] = await db.update(kolVipAffiliates)
        .set({
          level: newLevel,
          current_base_salary: newBaseSalary
        })
        .where(eq(kolVipAffiliates.affiliate_id, affiliateId))
        .returning();
      
      return updatedKolVip;
    } catch (error) {
      console.error("Error updating KOL/VIP affiliate level:", error);
      return undefined;
    }
  }
  
  async updateKolVipAffiliateBalance(affiliateId: string, amount: number): Promise<boolean> {
    try {
      // 1. Tìm KOL/VIP affiliate
      const [kolVip] = await db.select()
        .from(kolVipAffiliates)
        .where(eq(kolVipAffiliates.affiliate_id, affiliateId));
      
      if (!kolVip) {
        return false;
      }
      
      // 2. Kiểm tra số dư
      if (amount > 0 && kolVip.remaining_balance < amount) {
        return false;
      }
      
      // 3. Tính toán số dư mới
      const remaining_balance = kolVip.remaining_balance - amount;
      const paid_balance = (kolVip.paid_balance || 0) + amount;
      
      // 4. Cập nhật số dư
      await db.update(kolVipAffiliates)
        .set({
          remaining_balance,
          paid_balance
        })
        .where(eq(kolVipAffiliates.id, kolVip.id));
      
      return true;
    } catch (error) {
      console.error("Error updating KOL/VIP affiliate balance:", error);
      return false;
    }
  }
  
  /**
   * Thêm yêu cầu rút tiền cho KOL/VIP affiliate
   * @param request Thông tin yêu cầu rút tiền
   */
  async addKolVipWithdrawalRequest(request: WithdrawalRequestPayload): Promise<void> {
    // 1. Tìm KOL/VIP affiliate dựa trên user_id
    const [kolVip] = await db.select()
      .from(kolVipAffiliates)
      .where(eq(kolVipAffiliates.affiliate_id, request.user_id));
    
    if (!kolVip) {
      throw new Error("KOL/VIP affiliate not found");
    }
    
    // 2. Kiểm tra số dư tích lũy có bằng 0 không
    if (kolVip.remaining_balance <= 0) {
      throw new Error("Không thể tạo yêu cầu rút tiền khi số dư hoa hồng tích lũy bằng 0");
    }
    
    // 3. Kiểm tra giới hạn rút tiền theo ngày
    const dailyLimitCheck = await this.checkKolVipDailyWithdrawalLimit(request.user_id, request.amount_requested);
    if (dailyLimitCheck.exceeds) {
      throw new Error(`Vượt quá giới hạn rút tiền trong ngày. Hạn mức còn lại: ${dailyLimitCheck.remainingLimit.toLocaleString()} VND`);
    }
    
    // 4. Kiểm tra số dư
    if (kolVip.remaining_balance < request.amount_requested) {
      throw new Error(`Số tiền yêu cầu vượt quá số dư khả dụng: ${kolVip.remaining_balance.toLocaleString()} VND`);
    }
    
    // 5. Cập nhật withdrawal_history của KOL/VIP với thông tin thuế nếu có
    const history = kolVip.withdrawal_history || [];
    history.unshift({
      request_date: request.request_time,
      amount: request.amount_requested,
      tax_amount: request.tax_amount || 0,
      amount_after_tax: request.amount_after_tax || request.amount_requested,
      has_tax: request.has_tax || false,
      tax_rate: request.tax_rate || 0,
      note: request.note || "",
      status: "Pending" // Trạng thái ban đầu là Pending
    });
    
    // 6. Trừ số dư trực tiếp ở trạng thái Pending
    const updatedRemainingBalance = kolVip.remaining_balance - request.amount_requested;
    const updatedPaidBalance = (kolVip.paid_balance || 0) + request.amount_requested;
    
    console.log(`Trừ số dư trực tiếp cho KOL/VIP ở trạng thái Pending: ${kolVip.remaining_balance} -> ${updatedRemainingBalance}`);
    
    // Cập nhật KOL/VIP với trạng thái Pending và trừ tiền ngay lập tức
    await db.update(kolVipAffiliates)
      .set({ 
        withdrawal_history: history,
        remaining_balance: updatedRemainingBalance,
        paid_balance: updatedPaidBalance
      })
      .where(eq(kolVipAffiliates.id, kolVip.id));
      
    console.log(`Yêu cầu rút tiền đã được tạo cho KOL/VIP ở trạng thái Pending và số dư đã được trừ ngay lập tức`);
  }
  
  /**
   * Cập nhật trạng thái yêu cầu rút tiền của KOL/VIP
   * @param affiliateId ID của KOL/VIP affiliate
   * @param requestTime Thời gian yêu cầu
   * @param newStatus Trạng thái mới
   * @returns Thông tin yêu cầu nếu cập nhật thành công, undefined nếu không tìm thấy
   */
  async updateKolVipWithdrawalStatus(affiliateId: string, requestTime: string, newStatus: WithdrawalStatusType): Promise<WithdrawalHistory | undefined> {
    // Tìm KOL/VIP affiliate dựa vào ID
    const [kolVip] = await db.select()
      .from(kolVipAffiliates)
      .where(eq(kolVipAffiliates.affiliate_id, affiliateId));
      
    if (!kolVip) {
      return undefined;
    }
    
    // Tìm yêu cầu rút tiền dựa vào requestTime
    const history = kolVip.withdrawal_history || [];
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
    
    // Không trừ tiền ở Completed vì đã trừ ở Pending
    if (newStatus === "Completed" && currentStatus !== "Completed") {
      console.log(`Chuyển sang trạng thái Completed cho KOL/VIP, không trừ tiền nữa vì đã trừ ở Pending.`);
    }
    
    // Nếu trạng thái mới là "Rejected" hoặc "Cancelled"
    // thì cần hoàn lại tiền vì đã trừ ở Pending
    if ((newStatus === "Rejected" || newStatus === "Cancelled") && currentStatus !== "Rejected" && currentStatus !== "Cancelled") {
      // Lấy KOL/VIP affiliate mới nhất để đảm bảo số dư chính xác
      const [latestKolVip] = await db.select()
        .from(kolVipAffiliates)
        .where(eq(kolVipAffiliates.affiliate_id, affiliateId));
      
      if (!latestKolVip) {
        throw new Error("Không thể tìm thấy KOL/VIP affiliate");
      }
      
      // Hoàn lại tiền vì yêu cầu bị từ chối
      updateFields.remaining_balance = latestKolVip.remaining_balance + withdrawalAmount;
      updateFields.paid_balance = Math.max(0, (latestKolVip.paid_balance || 0) - withdrawalAmount);
      
      console.log(`Yêu cầu rút tiền của KOL/VIP bị ${newStatus}, hoàn lại ${withdrawalAmount} vào số dư. Số dư mới: ${updateFields.remaining_balance}`);
    }
    
    // Cập nhật KOL/VIP affiliate
    await db.update(kolVipAffiliates)
      .set(updateFields)
      .where(eq(kolVipAffiliates.id, kolVip.id));
      
    return history[withdrawalIdx];
  }
  
  /**
   * Kiểm tra giới hạn rút tiền trong ngày cho KOL/VIP
   * @param affiliateId ID của KOL/VIP affiliate
   * @param amount Số tiền muốn rút
   * @returns Kết quả kiểm tra với thông tin tổng đã rút và giới hạn còn lại
   */
  async checkKolVipDailyWithdrawalLimit(affiliateId: string, amount: number): Promise<{exceeds: boolean, totalWithdrawn: number, remainingLimit: number}> {
    // Tìm KOL/VIP affiliate dựa vào ID
    const [kolVip] = await db.select()
      .from(kolVipAffiliates)
      .where(eq(kolVipAffiliates.affiliate_id, affiliateId));
      
    if (!kolVip) {
      return { exceeds: true, totalWithdrawn: 0, remainingLimit: 0 };
    }
    
    const DAILY_LIMIT = 20000000; // 20 triệu VND, giống như affiliate thông thường
    const today = new Date().toISOString().split('T')[0]; // format YYYY-MM-DD
    
    // Tính tổng số tiền đã rút trong ngày hôm nay
    let totalWithdrawnToday = 0;
    const history = kolVip.withdrawal_history || [];
    
    for (const withdrawal of history) {
      // Kiểm tra xem yêu cầu có được tạo trong ngày hôm nay không
      // Cần kiểm tra cả giờ vì giới hạn được reset vào 9:00 sáng
      
      const requestDate = new Date(withdrawal.request_date);
      const requestDateString = requestDate.toISOString().split('T')[0];
      
      const requestHour = requestDate.getHours();
      const now = new Date();
      const nowHour = now.getHours();
      
      // Chỉ tính các yêu cầu sau 9:00 sáng hôm nay hoặc từ ngày trước 9:00 sáng đến hiện tại nếu hiện tại chưa đến 9:00 sáng
      if (
        // Cùng ngày và cả hai đều sau 9:00 sáng
        (requestDateString === today && requestHour >= 9 && nowHour >= 9) ||
        // Cùng ngày và cả hai đều trước 9:00 sáng
        (requestDateString === today && requestHour < 9 && nowHour < 9) ||
        // Ngày hôm trước sau 9:00 sáng và hôm nay trước 9:00 sáng
        (requestDateString !== today && requestHour >= 9 && new Date(today).getDate() - requestDate.getDate() === 1 && nowHour < 9)
      ) {
        // Chỉ tính các trạng thái không bị từ chối hoặc hủy
        if (withdrawal.status !== "Rejected" && withdrawal.status !== "Cancelled") {
          totalWithdrawnToday += withdrawal.amount;
        }
      }
    }
    
    const remainingLimit = Math.max(0, DAILY_LIMIT - totalWithdrawnToday);
    const exceeds = amount > remainingLimit;
    
    return {
      exceeds,
      totalWithdrawn: totalWithdrawnToday,
      remainingLimit
    };
  }
  
  async addKolVipContact(kolId: string, contactData: KolContact): Promise<KolContact> {
    try {
      console.log(`Attempting to add contact for KOL/VIP with ID: ${kolId}`);
      
      // 1. Kiểm tra xem KOL/VIP có tồn tại không
      const kolVip = await this.getKolVipByAffiliateId(kolId);
      if (!kolVip) {
        console.error(`KOL/VIP affiliate with ID ${kolId} not found in database`);
        throw new Error(`KOL/VIP affiliate with ID ${kolId} not found`);
      }
      
      console.log(`Found KOL/VIP: ${kolVip.full_name} (ID: ${kolVip.affiliate_id})`);
      
      // Chuẩn bị dữ liệu cho contact
      const contactInsertData = {
        ...contactData,
        kol_id: kolId,
        status: contactData.status || 'Mới nhập',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      console.log(`Preparing to insert contact with data:`, contactInsertData);
      
      // 2. Thêm contact mới
      try {
        const [newContact] = await db.insert(kolContacts)
          .values(contactInsertData)
          .returning();
        
        console.log(`Successfully inserted new contact with ID: ${newContact.id}`);
        
        // 3. Cập nhật số lượng liên hệ của KOL/VIP
        const newTotalContacts = (kolVip.total_contacts || 0) + 1;
        await db.update(kolVipAffiliates)
          .set({ total_contacts: newTotalContacts })
          .where(eq(kolVipAffiliates.affiliate_id, kolId));
        
        console.log(`Updated KOL/VIP total_contacts to: ${newTotalContacts}`);
        
        return newContact;
      } catch (insertError) {
        console.error("Error during contact insert operation:", insertError);
        
        // Thử chèn trực tiếp với SQL nếu Drizzle ORM gặp vấn đề
        console.log("Attempting direct SQL insert for contact");
        const result = await db.execute(`
          INSERT INTO kol_contacts (kol_id, full_name, email, phone, company, position, source, status, note, created_at, updated_at)
          VALUES ('${kolId}', '${contactData.full_name}', '${contactData.email}', '${contactData.phone}', 
                 '${contactData.company || ""}', '${contactData.position || ""}', '${contactData.source || ""}',
                 '${contactData.status || "Mới nhập"}', '${contactData.note || ""}', NOW(), NOW())
          RETURNING *
        `);
        
        console.log("Direct SQL insert result:", result);
        
        if (result.rows && result.rows.length > 0) {
          // Vẫn cập nhật số lượng contact
          const newTotalContacts = (kolVip.total_contacts || 0) + 1;
          await db.update(kolVipAffiliates)
            .set({ total_contacts: newTotalContacts })
            .where(eq(kolVipAffiliates.affiliate_id, kolId));
          
          return result.rows[0] as KolContact;
        } else {
          throw new Error("Failed to insert contact using direct SQL");
        }
      }
    } catch (error) {
      console.error("Error adding KOL/VIP contact:", error);
      throw new Error("Failed to add KOL/VIP contact");
    }
  }
  
  async updateKolVipContactStatus(
    kolId: string,
    contactId: number,
    status: CustomerStatusType,
    note: string
  ): Promise<KolContact | undefined> {
    try {
      // 1. Kiểm tra xem KOL/VIP có tồn tại không
      const kolVip = await this.getKolVipByAffiliateId(kolId);
      if (!kolVip) {
        return undefined;
      }
      
      // 2. Tìm contact
      const [contact] = await db.select()
        .from(kolContacts)
        .where(and(
          eq(kolContacts.id, contactId),
          eq(kolContacts.kol_id, kolId)
        ));
      
      if (!contact) {
        return undefined;
      }
      
      // 3. Cập nhật trạng thái contact
      const [updatedContact] = await db.update(kolContacts)
        .set({
          status,
          note: note || contact.note,
          updated_at: new Date()
        })
        .where(eq(kolContacts.id, contactId))
        .returning();
      
      // 4. Cập nhật số lượng liên hệ tiềm năng nếu status = 'Đang tư vấn'
      if (status === 'Đang tư vấn' && contact.status !== 'Đang tư vấn') {
        const newPotentialContacts = (kolVip.potential_contacts || 0) + 1;
        await db.update(kolVipAffiliates)
          .set({ potential_contacts: newPotentialContacts })
          .where(eq(kolVipAffiliates.affiliate_id, kolId));
      }
      
      return updatedContact;
    } catch (error) {
      console.error("Error updating KOL/VIP contact status:", error);
      return undefined;
    }
  }
  
  async updateKolVipContactWithContract(
    contactId: number,
    contactData: KolContact,
    balanceUpdates: {
      contract_value: number;
      commission: number;
      remaining_balance: number;
    }
  ): Promise<KolContact | undefined> {
    try {
      // 1. Tìm contact
      const [contact] = await db.select()
        .from(kolContacts)
        .where(eq(kolContacts.id, contactId));
      
      if (!contact) {
        return undefined;
      }
      
      // 2. Lấy thông tin KOL/VIP
      const kolVip = await this.getKolVipByAffiliateId(contact.kol_id);
      if (!kolVip) {
        return undefined;
      }
      
      // 3. Cập nhật thông tin contact
      const [updatedContact] = await db.update(kolContacts)
        .set({
          ...contactData,
          updated_at: new Date()
        })
        .where(eq(kolContacts.id, contactId))
        .returning();
      
      // 4. Cập nhật thông tin hợp đồng và số dư của KOL/VIP nếu là 'Đã chốt hợp đồng'
      if (contactData.status === 'Đã chốt hợp đồng' && contact.status !== 'Đã chốt hợp đồng') {
        const newTotalContracts = (kolVip.total_contracts || 0) + 1;
        const newContractValue = (kolVip.contract_value || 0) + balanceUpdates.contract_value;
        const newReceivedBalance = (kolVip.received_balance || 0) + balanceUpdates.commission;
        const newRemainingBalance = (kolVip.remaining_balance || 0) + balanceUpdates.commission;
        
        await db.update(kolVipAffiliates)
          .set({
            total_contracts: newTotalContracts,
            contract_value: newContractValue,
            received_balance: newReceivedBalance,
            remaining_balance: newRemainingBalance
          })
          .where(eq(kolVipAffiliates.affiliate_id, contact.kol_id));
      }
      
      return updatedContact;
    } catch (error) {
      console.error("Error updating KOL/VIP contact with contract:", error);
      return undefined;
    }
  }
  
  async getKolVipContacts(kolId: string): Promise<KolContact[]> {
    try {
      const contacts = await db.select()
        .from(kolContacts)
        .where(eq(kolContacts.kol_id, kolId))
        .orderBy(desc(kolContacts.created_at));
      
      return contacts;
    } catch (error) {
      console.error("Error fetching KOL/VIP contacts:", error);
      return [];
    }
  }
  
  async addKolVipMonthlyKpi(
    kolId: string,
    kpiData: MonthlyKpi
  ): Promise<MonthlyKpi> {
    try {
      // 1. Tìm KOL/VIP
      const kolVip = await this.getKolVipByAffiliateId(kolId);
      if (!kolVip) {
        throw new Error("KOL/VIP affiliate not found");
      }
      
      // 2. Kiểm tra xem đã có KPI cho tháng này chưa
      const kpiHistory = kolVip.kpi_history || [];
      const existingKpiIndex = kpiHistory.findIndex(
        kpi => kpi.year === kpiData.year && kpi.month === kpiData.month
      );
      
      // 3. Thêm hoặc cập nhật KPI
      if (existingKpiIndex >= 0) {
        kpiHistory[existingKpiIndex] = {
          ...kpiHistory[existingKpiIndex],
          ...kpiData
        };
      } else {
        kpiHistory.push(kpiData);
      }
      
      // 4. Cập nhật KPI history vào database
      const [updatedKolVip] = await db.update(kolVipAffiliates)
        .set({ kpi_history: kpiHistory })
        .where(eq(kolVipAffiliates.affiliate_id, kolId))
        .returning();
      
      // 5. Trả về KPI mới hoặc đã cập nhật
      if (existingKpiIndex >= 0) {
        return kpiHistory[existingKpiIndex];
      } else {
        return kpiHistory[kpiHistory.length - 1];
      }
    } catch (error) {
      console.error("Error adding KOL/VIP monthly KPI:", error);
      throw new Error("Failed to add KOL/VIP monthly KPI");
    }
  }
  
  async evaluateKolVipMonthlyKpi(
    kolId: string,
    year: number,
    month: number,
    performance: KpiPerformanceTypeValue,
    note?: string
  ): Promise<{ success: boolean, newLevel?: KolVipLevelType, previousLevel?: KolVipLevelType }> {
    try {
      // 1. Tìm KOL/VIP
      const kolVip = await this.getKolVipByAffiliateId(kolId);
      if (!kolVip) {
        return { success: false };
      }
      
      // 2. Lấy level hiện tại
      const currentLevel = kolVip.level;
      let newLevel = currentLevel;
      
      // 3. Kiểm tra KPI history
      const kpiHistory = kolVip.kpi_history || [];
      const kpiIndex = kpiHistory.findIndex(
        kpi => kpi.year === year && kpi.month === month
      );
      
      if (kpiIndex < 0) {
        return { success: false };
      }
      
      // 4. Cập nhật performance cho KPI
      kpiHistory[kpiIndex].performance = performance;
      if (note) {
        kpiHistory[kpiIndex].note = note;
      }
      
      // 5. Xử lý logic thay đổi level
      let consecutiveFailures = kolVip.consecutive_failures || 0;
      
      if (performance === 'MET') {
        consecutiveFailures = 0;
        
        // Tăng level nếu đạt KPI
        if (currentLevel === 'LEVEL_1') {
          newLevel = 'LEVEL_2';
        } else if (currentLevel === 'LEVEL_2') {
          newLevel = 'LEVEL_3';
        }
      } else {
        consecutiveFailures++;
        
        // Giảm level nếu 2 tháng liên tiếp không đạt KPI
        if (consecutiveFailures >= 2) {
          if (currentLevel === 'LEVEL_3') {
            newLevel = 'LEVEL_2';
          } else if (currentLevel === 'LEVEL_2') {
            newLevel = 'LEVEL_1';
          }
          
          consecutiveFailures = 0;
        }
      }
      
      // 6. Cập nhật trạng thái KOL/VIP
      let newBaseSalary = kolVip.current_base_salary;
      if (newLevel !== currentLevel) {
        if (newLevel === 'LEVEL_1') {
          newBaseSalary = 5000000;
        } else if (newLevel === 'LEVEL_2') {
          newBaseSalary = 10000000;
        } else if (newLevel === 'LEVEL_3') {
          newBaseSalary = 15000000;
        }
      }
      
      // 7. Lưu cập nhật vào database
      await db.update(kolVipAffiliates)
        .set({
          kpi_history: kpiHistory,
          consecutive_failures: consecutiveFailures,
          level: newLevel,
          current_base_salary: newBaseSalary
        })
        .where(eq(kolVipAffiliates.affiliate_id, kolId));
      
      return {
        success: true,
        newLevel,
        previousLevel: currentLevel !== newLevel ? currentLevel : undefined
      };
    } catch (error) {
      console.error("Error evaluating KOL/VIP monthly KPI:", error);
      return { success: false };
    }
  }
}