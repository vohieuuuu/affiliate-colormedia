import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../shared/schema';

// Thêm log để debug
console.log("Initializing database connection...");

// Cấu hình websocket cho Neon Serverless
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Khởi tạo kết nối
console.log("Setting up Neon database connection with Pool");
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
console.log("Database connection established successfully");

// Kiểm tra kết nối
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log("Database connection test successful:", result.rows);
  } catch (error) {
    console.error("Database connection test failed:", error);
  }
}

// Chạy kiểm tra kết nối
testConnection();