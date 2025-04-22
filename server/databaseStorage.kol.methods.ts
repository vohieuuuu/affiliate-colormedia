  // Phương thức quản lý KOL/VIP Affiliate
  async createKolVipAffiliate(kolVipData: InsertKolVipAffiliate): Promise<KolVipAffiliate> {
    try {
      // Kiểm tra xem affiliate_id đã tồn tại chưa
      const existingKolVip = await this.getKolVipByAffiliateId(kolVipData.affiliate_id);
      if (existingKolVip) {
        console.log(`KOL/VIP Affiliate with ID ${kolVipData.affiliate_id} already exists`);
        return existingKolVip;
      }
      
      // Tạo mới KOL/VIP Affiliate
      const [newKolVipAffiliate] = await db.insert(kolVipAffiliates)
        .values({
          ...kolVipData,
          level: kolVipData.level || "LEVEL_1",
          current_base_salary: kolVipData.current_base_salary || 5000000,
          join_date: kolVipData.join_date || new Date(),
          consecutive_failures: kolVipData.consecutive_failures || 0,
          total_contacts: kolVipData.total_contacts || 0,
          potential_contacts: kolVipData.potential_contacts || 0,
          total_contracts: kolVipData.total_contracts || 0,
          contract_value: kolVipData.contract_value || 0,
          received_balance: kolVipData.received_balance || 0,
          paid_balance: kolVipData.paid_balance || 0,
          remaining_balance: kolVipData.remaining_balance || 0
        })
        .returning();
      
      return newKolVipAffiliate;
    } catch (error) {
      console.error("Error creating KOL/VIP affiliate:", error);
      throw new Error("Failed to create KOL/VIP affiliate");
    }
  }
  
  async getKolVipByAffiliateId(affiliateId: string): Promise<KolVipAffiliate | undefined> {
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
  
  async addKolVipContact(kolId: string, contactData: KolContact): Promise<KolContact> {
    try {
      // 1. Kiểm tra xem KOL/VIP có tồn tại không
      const kolVip = await this.getKolVipByAffiliateId(kolId);
      if (!kolVip) {
        throw new Error("KOL/VIP affiliate not found");
      }
      
      // 2. Thêm contact mới
      const [newContact] = await db.insert(kolContacts)
        .values({
          ...contactData,
          kol_id: kolId,
          status: contactData.status || 'Mới nhập',
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning();
      
      // 3. Cập nhật số lượng liên hệ của KOL/VIP
      const newTotalContacts = (kolVip.total_contacts || 0) + 1;
      await db.update(kolVipAffiliates)
        .set({ total_contacts: newTotalContacts })
        .where(eq(kolVipAffiliates.affiliate_id, kolId));
      
      return newContact;
    } catch (error) {
      console.error("Error adding KOL/VIP contact:", error);
      throw new Error("Failed to add KOL/VIP contact");
    }
  }
  
  async updateKolVipContactStatus(
    kolId: string,
    contactId: number,
    updateData: { status?: CustomerStatusType, description?: string }
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
      
      // Tạo object chỉ với các trường cần cập nhật
      const updateFields: any = {
        updated_at: new Date()
      };
      
      if (updateData.status) {
        updateFields.status = updateData.status;
      }
      
      if (updateData.description) {
        updateFields.note = updateData.description;
      }
      
      // 3. Cập nhật trạng thái contact
      const [updatedContact] = await db.update(kolContacts)
        .set(updateFields)
        .where(eq(kolContacts.id, contactId))
        .returning();
      
      // 4. Cập nhật số lượng liên hệ tiềm năng nếu status = 'Đang tư vấn' hoặc 'Chờ phản hồi'
      if (updateData.status) {
        console.log(`Trạng thái mới của contact: ${updateData.status} (trước đó: ${contact.status})`);
        
        // Kiểm tra điều kiện theo từng trạng thái riêng biệt để gỡ lỗi
        const isConsultingNew = updateData.status === 'Đang tư vấn' && contact.status !== 'Đang tư vấn';
        const isWaitingResponseNew = updateData.status === 'Chờ phản hồi' && contact.status !== 'Chờ phản hồi';
        
        console.log(`Điều kiện cập nhật KPI: isConsultingNew=${isConsultingNew}, isWaitingResponseNew=${isWaitingResponseNew}`);
        
        if (isConsultingNew || isWaitingResponseNew) {
          const newPotentialContacts = (kolVip.potential_contacts || 0) + 1;
          
          console.log(`Tăng số lượng liên hệ tiềm năng cho KOL/VIP ${kolId}: ${kolVip.potential_contacts} -> ${newPotentialContacts}`);
          
          await db.update(kolVipAffiliates)
            .set({ potential_contacts: newPotentialContacts })
            .where(eq(kolVipAffiliates.affiliate_id, kolId));
            
          console.log(`Đã cập nhật KPI lead tiềm năng cho KOL/VIP ${kolId} thành ${newPotentialContacts}`);
        }
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
        
        // 5. Thêm giao dịch hoa hồng (COMMISSION) vào bảng giao dịch
        const companyInfo = contactData.company ? ` - ${contactData.company}` : '';
        const description = `Hoa hồng từ hợp đồng${companyInfo} (${formatCurrency(balanceUpdates.contract_value)})`;
        
        // Thêm giao dịch hoa hồng
        await db.insert(kolVipTransactions)
          .values({
            kol_id: contact.kol_id,
            transaction_type: 'COMMISSION',
            amount: balanceUpdates.commission,
            description,
            reference_id: `CONTRACT-${contactId}`,
            created_at: new Date(),
            balance_after: newRemainingBalance
          });
      }
      
      return updatedContact;
    } catch (error) {
      console.error("Error updating KOL/VIP contact with contract:", error);
      return undefined;
    }
  }
  
  // Helper để định dạng tiền tệ
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
      .replace('₫', 'VNĐ').trim();
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