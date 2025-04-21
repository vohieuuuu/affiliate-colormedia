import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';

// Thêm log để debug
console.log("Initializing database connection...");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Khởi tạo kết nối
let db: ReturnType<typeof drizzle>;
try {
  console.log("Setting up Neon database connection using HTTP");
  // Dùng HTTP client thay vì WebSocket
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
  console.log("Database connection established successfully");
} catch (error) {
  console.error("Error initializing database connection:", error);
  throw error;
}

export { db };