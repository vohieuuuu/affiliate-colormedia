/**
 * Cấu hình API endpoint tùy theo môi trường
 */

// Kiểm tra xem ứng dụng đang chạy trên môi trường nào
const isProd = import.meta.env.PROD;

// API URL tùy thuộc vào môi trường
export const API_URL = isProd 
  ? 'https://affclm.replit.app' // URL production đã deployed
  : ''; // URL trống để sử dụng URL tương đối (base URL) trong môi trường development

// API token mặc định
export const DEFAULT_API_TOKEN = "vzzvc36lTcb7Pcean8QwndSX";