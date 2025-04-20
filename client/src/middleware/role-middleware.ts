import { User } from '@shared/schema';

// Các hằng số định nghĩa các vai trò của hệ thống
export const ADMIN_ROLE = 'ADMIN';
export const KOL_VIP_ROLE = 'KOL_VIP';
export const AFFILIATE_ROLE = 'AFFILIATE';
export const MANAGER_ROLE = 'MANAGER';

/**
 * Các mapping giữa vai trò và API endpoint tương ứng
 */
const ROLE_API_MAPPING = {
  [ADMIN_ROLE]: {
    affiliate: '/api/affiliate',
    customers: '/api/admin/affiliates',
    statistics: '/api/admin/statistics',
    dashboard: '/admin-dashboard',
  },
  [KOL_VIP_ROLE]: {
    profile: '/api/kol/me',
    contacts: '/api/kol/:kolId/contacts',
    kpiStats: '/api/kol/:kolId/kpi-stats',
    dashboard: '/kol-dashboard',
  },
  [AFFILIATE_ROLE]: {
    profile: '/api/affiliate',
    customers: '/api/customers',
    statistics: '/api/affiliate/customer-statistics',
    timeSeries: '/api/affiliate/time-series',
    dashboard: '/dashboard',
  },
  [MANAGER_ROLE]: {
    profile: '/api/affiliate',
    customers: '/api/customers',
    statistics: '/api/affiliate/customer-statistics',
    timeSeries: '/api/affiliate/time-series',
    dashboard: '/dashboard',
  }
};

/**
 * Các route cho mỗi vai trò
 */
const ROLE_ROUTES = {
  [ADMIN_ROLE]: '/admin-dashboard',
  [KOL_VIP_ROLE]: '/kol-dashboard',
  [AFFILIATE_ROLE]: '/dashboard',
  [MANAGER_ROLE]: '/dashboard',
};

/**
 * Kiểm tra xem một người dùng có phải là admin hay không
 * @param user Thông tin người dùng
 * @returns true nếu là admin, ngược lại false
 */
export function isAdminRole(user?: User | null): boolean {
  if (!user) return false;
  // Chuyển đổi chuỗi thành chữ hoa để so sánh không phân biệt chữ hoa/thường
  const role = typeof user.role === 'string' ? user.role.toUpperCase() : user.role;
  return role === ADMIN_ROLE || role === 'ADMIN';
}

/**
 * Kiểm tra xem một người dùng có phải là KOL/VIP hay không
 * @param user Thông tin người dùng
 * @returns true nếu là KOL/VIP, ngược lại false
 */
export function isKolVipRole(user?: User | null): boolean {
  if (!user) return false;
  // Chuyển đổi chuỗi thành chữ hoa để so sánh không phân biệt chữ hoa/thường
  const role = typeof user.role === 'string' ? user.role.toUpperCase() : user.role;
  console.log("isKolVipRole checking:", { 
    role, 
    KOL_VIP_ROLE, 
    isEqual: role === KOL_VIP_ROLE, 
    user_role_type: typeof user.role 
  });
  return role === KOL_VIP_ROLE;
}

/**
 * Kiểm tra xem một người dùng có phải là Affiliate thông thường hay không
 * @param user Thông tin người dùng
 * @returns true nếu là Affiliate, ngược lại false
 */
export function isAffiliateRole(user?: User | null): boolean {
  if (!user) return false;
  // Chuyển đổi chuỗi thành chữ hoa để so sánh không phân biệt chữ hoa/thường
  const role = typeof user.role === 'string' ? user.role.toUpperCase() : user.role;
  return role === AFFILIATE_ROLE;
}

/**
 * Lấy API endpoint tương ứng với vai trò người dùng
 * @param user Thông tin người dùng
 * @param apiType Loại API cần lấy
 * @returns API endpoint tương ứng hoặc undefined nếu không tìm thấy
 */
export function getApiForRole(user: User | null, apiType: string): string | undefined {
  if (!user) return undefined;
  
  // Chuẩn hóa role thành chữ hoa
  const normalizedRole = typeof user.role === 'string' 
    ? user.role.toUpperCase() 
    : user.role;
  
  // Lấy mapping API cho role
  const apiMapping = ROLE_API_MAPPING[normalizedRole as keyof typeof ROLE_API_MAPPING];
  
  if (apiMapping) {
    return apiMapping[apiType as keyof typeof apiMapping];
  }
  
  return undefined;
}

/**
 * Lấy route tương ứng với vai trò người dùng
 * @param user Thông tin người dùng
 * @returns Route tương ứng hoặc '/dashboard' nếu không tìm thấy
 */
export function getDashboardForRole(user: User | null): string {
  if (!user) return '/auth';
  
  // Chuẩn hóa role thành chữ hoa
  const normalizedRole = typeof user.role === 'string' 
    ? user.role.toUpperCase() 
    : user.role;
  
  return ROLE_ROUTES[normalizedRole as keyof typeof ROLE_ROUTES] || '/dashboard';
}

/**
 * Trích xuất thông tin người dùng và chuẩn bị dữ liệu liên quan đến vai trò
 * @param user Thông tin người dùng
 * @returns Thông tin người dùng với dữ liệu liên quan đến vai trò
 */
export function prepareUserWithRoleData(user: User | null) {
  if (!user) return null;
  
  // Chuẩn bị thông tin API endpoints và route dựa trên vai trò
  const dashboardRoute = getDashboardForRole(user);
  
  // Kiểm tra các loại vai trò
  const isAdmin = isAdminRole(user);
  const isKolVip = isKolVipRole(user);
  const isAffiliate = isAffiliateRole(user);
  
  return {
    ...user,
    isAdmin,
    isKolVip,
    isAffiliate,
    dashboardRoute,
  };
}