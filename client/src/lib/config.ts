/**
 * Cấu hình API endpoint tùy theo môi trường
 */

// Sử dụng biến môi trường từ Vite nếu có
interface ImportMeta {
  env: {
    PROD: boolean;
    DEV: boolean;
    MODE: string;
    VITE_API_URL?: string;
    VITE_ENVIRONMENT?: string;
    VITE_APP_URL?: string;
  }
}

// Kiểm tra xem ứng dụng đang chạy trên môi trường nào
const isProd = import.meta.env.PROD;
const envName = import.meta.env.VITE_ENVIRONMENT || (isProd ? 'production' : 'development');

/**
 * Cấu hình các URL tùy theo môi trường
 */

// API URL để gọi backend
export const API_URL = import.meta.env.VITE_API_URL || ''; 

// Đường dẫn gốc của ứng dụng website
export const APP_URL = import.meta.env.VITE_APP_URL || (isProd ? window.location.origin : '');

// Các cấu hình phụ thuộc môi trường
export const CONFIG = {
  environment: envName,
  isDevelopment: envName === 'development',
  isProduction: envName === 'production',
  isStaging: envName === 'staging',
  apiUrl: API_URL,
  appUrl: APP_URL,
  // Webhook URL
  webhookUrl: isProd 
    ? 'https://aicolormedia.app.n8n.cloud/webhook-test/2d2c9a88-ebaf-4f2c-bf03-8f4c4a398e86'
    : 'https://aicolormedia.app.n8n.cloud/webhook-test/2d2c9a88-ebaf-4f2c-bf03-8f4c4a398e86',
}

// Token mặc định khi chưa đăng nhập - được thiết lập thành chuỗi rỗng
// API token sẽ hoàn toàn được quản lý qua cookies HttpOnly từ server
export const DEFAULT_API_TOKEN = "";