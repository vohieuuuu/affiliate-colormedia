import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';

// Thêm log để debug
console.log("Initializing database connection...");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Khởi tạo kết nối
let db;
console.log("Setting up Neon database connection with neon-serverless");
const sql = neon(process.env.DATABASE_URL!);
db = drizzle(sql, { schema });
console.log("Database connection established successfully");

// Kiểm tra kết nối
async function testConnection() {
  try {
    const result = await sql`SELECT NOW()`;
    console.log("Database connection test successful:", result);
  } catch (error) {
    console.error("Database connection test failed:", error);
  }
}

// Chạy kiểm tra kết nối
testConnection();

export { db };