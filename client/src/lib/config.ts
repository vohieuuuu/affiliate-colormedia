/**
 * Cấu hình API endpoint tùy theo môi trường
 */

// Kiểm tra xem ứng dụng đang chạy trên môi trường nào
const isProd = import.meta.env.PROD;

// API URL tùy thuộc vào môi trường
export const API_URL = isProd 
  ? 'https://affclm.replit.app' // URL production đã deployed
  : ''; // URL trống để sử dụng URL tương đối (base URL) trong môi trường development

// API token mặc định - Dùng token admin cho môi trường phát triển
export const DEFAULT_API_TOKEN = "45fcc47d347e08f4cf4cf871ba30afcbd3274fd23dec9c54ca3b4503ada60d60";