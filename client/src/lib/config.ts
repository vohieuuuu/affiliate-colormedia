/**
 * Cấu hình API endpoint tùy theo môi trường
 */

// Kiểm tra xem ứng dụng đang chạy trên môi trường nào
const isProd = import.meta.env.PROD;

// API URL tùy thuộc vào môi trường
export const API_URL = isProd 
  ? 'https://affclm.replit.app' // URL production đã deployed
  : ''; // URL trống để sử dụng URL tương đối (base URL) trong môi trường development

// Sử dụng token admin đúng cho môi trường phát triển
export const DEFAULT_API_TOKEN = "1ee19664de4bcbd354400cfe0000078cac0618835772f112858183e5ec9b94dc";