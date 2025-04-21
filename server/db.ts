import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from '../shared/schema';

// Cấu hình Neon PostgreSQL với websocket
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Khởi tạo kết nối
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });