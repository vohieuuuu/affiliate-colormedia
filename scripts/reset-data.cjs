// Script làm sạch dữ liệu mẫu cũ và tạo mới dữ liệu với 2 tài khoản
// Node.js script sử dụng CommonJS

const { storage } = require('../server/storage');
const { hashPassword } = require('../server/auth');

async function resetData() {
  console.log("=== Bắt đầu làm sạch dữ liệu và tạo tài khoản mới ===");
  
  try {
    // Lưu ý: Với MemStorage, chúng ta không thể thực sự xóa dữ liệu
    // vì nó được khởi tạo trong constructor
    // Nhưng chúng ta có thể tạo mới dữ liệu người dùng
    
    // --- 1. Tạo tài khoản Admin ---
    const adminPassword = "admin@123";
    const hashedAdminPassword = await hashPassword(adminPassword);
    
    const admin = await storage.createUser({
      username: "admin@colormedia.vn",
      password: hashedAdminPassword,
      role: "ADMIN",
      is_first_login: false
    });
    
    console.log(`=== Tạo tài khoản Admin thành công ===`);
    console.log(`Username: admin@colormedia.vn`);
    console.log(`Password: ${adminPassword}`);
    console.log(`ID: ${admin.id}`);
    
    // --- 2. Tạo tài khoản Affiliate 1 ---
    const affiliate1Password = "affiliate1@123";
    const hashedAff1Password = await hashPassword(affiliate1Password);
    
    const affiliate1User = await storage.createUser({
      username: "affiliate1@colormedia.vn",
      password: hashedAff1Password,
      role: "AFFILIATE",
      is_first_login: false
    });
    
    // Tạo hồ sơ Affiliate 1
    const aff1Data = {
      affiliate_id: "AFF101",
      full_name: "Nguyễn Văn A",
      email: "affiliate1@colormedia.vn",
      phone: "0901234567",
      bank_account: "0123456789",
      bank_name: "TPBank",
      user_id: affiliate1User.id
    };
    
    const aff1 = await storage.createAffiliate(aff1Data);
    
    console.log(`=== Tạo tài khoản Affiliate 1 thành công ===`);
    console.log(`Username: affiliate1@colormedia.vn`);
    console.log(`Password: ${affiliate1Password}`);
    console.log(`ID: ${affiliate1User.id}`);
    console.log(`Affiliate ID: ${aff1.affiliate_id}`);
    
    // Thêm dữ liệu khách hàng cho Affiliate 1
    const customers1 = [
      {
        customer_name: "Công ty ABC",
        status: "Contract signed",
        updated_at: new Date().toISOString(),
        note: "Khách hàng đã ký hợp đồng 6 tháng"
      },
      {
        customer_name: "Công ty XYZ",
        status: "Presenting idea",
        updated_at: new Date().toISOString(),
        note: "Đang thuyết trình ý tưởng"
      }
    ];
    
    for (const customer of customers1) {
      await storage.addReferredCustomer(aff1.id, customer);
    }
    
    // --- 3. Tạo tài khoản Affiliate 2 ---
    const affiliate2Password = "affiliate2@123";
    const hashedAff2Password = await hashPassword(affiliate2Password);
    
    const affiliate2User = await storage.createUser({
      username: "affiliate2@colormedia.vn",
      password: hashedAff2Password,
      role: "AFFILIATE",
      is_first_login: false
    });
    
    // Tạo hồ sơ Affiliate 2
    const aff2Data = {
      affiliate_id: "AFF102",
      full_name: "Trần Thị B",
      email: "affiliate2@colormedia.vn",
      phone: "0909876543",
      bank_account: "9876543210",
      bank_name: "Vietcombank",
      user_id: affiliate2User.id
    };
    
    const aff2 = await storage.createAffiliate(aff2Data);
    
    console.log(`=== Tạo tài khoản Affiliate 2 thành công ===`);
    console.log(`Username: affiliate2@colormedia.vn`);
    console.log(`Password: ${affiliate2Password}`);
    console.log(`ID: ${affiliate2User.id}`);
    console.log(`Affiliate ID: ${aff2.affiliate_id}`);
    
    // Thêm dữ liệu khách hàng cho Affiliate 2
    const customers2 = [
      {
        customer_name: "Công ty DEF",
        status: "Contract signed",
        updated_at: new Date().toISOString(),
        note: "Khách hàng đã ký hợp đồng 12 tháng"
      },
      {
        customer_name: "Công ty GHI",
        status: "Contact received",
        updated_at: new Date().toISOString(),
        note: "Mới nhận thông tin liên hệ"
      },
      {
        customer_name: "Công ty JKL",
        status: "Pending reconciliation",
        updated_at: new Date().toISOString(),
        note: "Đang chờ xác nhận"
      }
    ];
    
    for (const customer of customers2) {
      await storage.addReferredCustomer(aff2.id, customer);
    }
    
    console.log("=== Hoàn thành khởi tạo dữ liệu ===");
    
    console.log("\n=== Thông tin tài khoản để đăng nhập ===");
    console.log("1. Admin:");
    console.log(`   - Username: admin@colormedia.vn`);
    console.log(`   - Password: ${adminPassword}`);
    console.log("2. Affiliate 1:");
    console.log(`   - Username: affiliate1@colormedia.vn`);
    console.log(`   - Password: ${affiliate1Password}`);
    console.log("3. Affiliate 2:");
    console.log(`   - Username: affiliate2@colormedia.vn`);
    console.log(`   - Password: ${affiliate2Password}`);
    
  } catch (error) {
    console.error("Lỗi khi khởi tạo dữ liệu:", error);
  }
}

// Thực thi hàm
resetData();