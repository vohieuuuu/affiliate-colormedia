/**
 * Script tạo tài khoản admin mặc định trong cơ sở dữ liệu
 * Chạy: tsx scripts/create-default-admin.ts
 */
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from "ws";
import dotenv from 'dotenv';
import { users } from '../shared/schema';
import { hashPassword } from '../server/auth';

// Tải biến môi trường
dotenv.config();

// Cấu hình Neon PostgreSQL với websocket
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Định nghĩa thông tin tài khoản admin mặc định
const DEFAULT_ADMIN = {
  username: "admin",
  password: "admin", // Sẽ được hash
  role: "ADMIN" as const,
  token: "45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60",
  is_active: 1,
  is_first_login: 0
};

async function createDefaultAdmin() {
  console.log("Bắt đầu tạo tài khoản admin mặc định...");
  
  try {
    // Khởi tạo kết nối
    const sql = neon(process.env.DATABASE_URL!);
    const db = drizzle(sql);
    
    // Kiểm tra xem admin đã tồn tại chưa
    const existingAdmin = await db.select().from(users).where(eq(users.username, DEFAULT_ADMIN.username));
    
    if (existingAdmin.length > 0) {
      console.log("Tài khoản admin đã tồn tại. Cập nhật token...");
      
      // Cập nhật token cố định
      await db.update(users)
        .set({ 
          token: DEFAULT_ADMIN.token,
          is_active: 1
        })
        .where(eq(users.username, DEFAULT_ADMIN.username));
      
      console.log("Đã cập nhật token cho tài khoản admin.");
      return;
    }
    
    // Hash mật khẩu
    const hashedPassword = await hashPassword(DEFAULT_ADMIN.password);
    
    // Tạo tài khoản admin mới
    await db.insert(users).values({
      username: DEFAULT_ADMIN.username,
      password: hashedPassword,
      role: DEFAULT_ADMIN.role,
      token: DEFAULT_ADMIN.token,
      is_active: DEFAULT_ADMIN.is_active,
      is_first_login: DEFAULT_ADMIN.is_first_login,
      created_at: new Date()
    });
    
    console.log("Đã tạo tài khoản admin mặc định:");
    console.log("- Username: admin");
    console.log("- Password: admin");
    console.log("- Token: 45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60");
    
  } catch (error) {
    console.error("Lỗi khi tạo tài khoản admin:", error);
  }
}

// Thực thi hàm tạo admin
createDefaultAdmin().then(() => {
  console.log("Hoàn tất.");
  process.exit(0);
}).catch(error => {
  console.error("Lỗi:", error);
  process.exit(1);
});