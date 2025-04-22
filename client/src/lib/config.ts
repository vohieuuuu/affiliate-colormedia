/**
 * Cấu hình API endpoint tùy theo môi trường
 */

// Kiểm tra xem ứng dụng đang chạy trên môi trường nào
const isProd = import.meta.env.PROD;

// API URL tùy thuộc vào môi trường
export const API_URL = isProd 
  ? '' // Để trống để sử dụng URL tương đối (gọi API từ cùng origin với ứng dụng)
  : ''; // URL trống để sử dụng URL tương đối (base URL) trong môi trường development

// Token mặc định khi chưa đăng nhập - được thiết lập thành chuỗi rỗng
// API token sẽ hoàn toàn được quản lý qua cookies HttpOnly từ server
export const DEFAULT_API_TOKEN = "";