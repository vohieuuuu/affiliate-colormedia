import { User } from '@shared/schema';

// Các hằng số định nghĩa các vai trò của hệ thống
export const ADMIN_ROLE = 'ADMIN';
export const KOL_VIP_ROLE = 'KOL_VIP';
export const AFFILIATE_ROLE = 'AFFILIATE';
export const MANAGER_ROLE = 'MANAGER';

// Kiểm tra xem user có tồn tại affiliate_id không
export function hasValidAffiliateId(user: any): boolean {
  return user && user.affiliate_id && user.affiliate_id.trim() !== '';
}

/**
 * Các mapping giữa vai trò và API endpoint tương ứng
 */
const ROLE_API_MAPPING = {
  [ADMIN_ROLE]: {
    affiliate: '/api/affiliate',
    customers: '/api/admin/affiliates',
    statistics: '/api/admin/statistics',
    dashboard: '/dashboard', // Chuyển hướng về dashboard thông thường thay vì admin-dashboard
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
  [ADMIN_ROLE]: '/dashboard', // Thay đổi thành dashboard thông thường 
  [KOL_VIP_ROLE]: '/kol-dashboard',
  [AFFILIATE_ROLE]: '/dashboard',
  [MANAGER_ROLE]: '/dashboard',
};

/**
 * Kiểm tra xem một người dùng có phải là admin hay không
 * @param user Thông tin người dùng
 * @returns true nếu là admin, ngược lại false
 */
export function isAdminRole(user?: any | null): boolean {
  if (!user) return false;
  
  // Chuẩn hóa cả role người dùng và giá trị ADMIN_ROLE thành cùng một định dạng
  const normalizedRole = typeof user.role === 'string' ? user.role.toUpperCase() : String(user.role).toUpperCase();
  const normalizedExpectedRole = ADMIN_ROLE.toUpperCase();
  
  console.log("isAdminRole checking:", { 
    role: user.role,
    normalizedRole, 
    normalizedExpectedRole, 
    isEqual: normalizedRole.includes(normalizedExpectedRole), 
    user_role_type: typeof user.role 
  });
  
  // Sử dụng includes() thay vì so sánh chính xác
  return normalizedRole.includes(normalizedExpectedRole);
}

/**
 * Kiểm tra xem một người dùng có phải là KOL/VIP hay không
 * Giờ đây cũng kiểm tra affiliate_id để đảm bảo có dữ liệu phù hợp
 * @param user Thông tin người dùng
 * @returns true nếu là KOL/VIP, ngược lại false
 */
export function isKolVipRole(user?: any | null): boolean {
  if (!user) return false;
  
  // Chuẩn hóa cả role người dùng và giá trị KOL_VIP_ROLE thành cùng một định dạng
  const normalizedRole = typeof user.role === 'string' ? user.role.toUpperCase() : String(user.role).toUpperCase();
  const normalizedExpectedRole = KOL_VIP_ROLE.toUpperCase();
  
  // Kiểm tra thêm affiliate_id
  const hasAffiliateId = hasValidAffiliateId(user);
  
  console.log("isKolVipRole checking:", { 
    role: user.role,
    normalizedRole, 
    normalizedExpectedRole, 
    isEqual: normalizedRole.includes(normalizedExpectedRole), 
    user_role_type: typeof user.role,
    hasAffiliateId,
    affiliateId: user.affiliate_id
  });
  
  // Sử dụng includes() thay vì so sánh chính xác
  return normalizedRole.includes("KOL") && hasAffiliateId;
}

/**
 * Kiểm tra xem một người dùng có phải là Affiliate thông thường hay không
 * @param user Thông tin người dùng
 * @returns true nếu là Affiliate, ngược lại false
 */
export function isAffiliateRole(user?: any | null): boolean {
  if (!user) return false;
  
  // Chuẩn hóa cả role người dùng và giá trị AFFILIATE_ROLE thành cùng một định dạng
  const normalizedRole = typeof user.role === 'string' ? user.role.toUpperCase() : String(user.role).toUpperCase();
  const normalizedExpectedRole = AFFILIATE_ROLE.toUpperCase();
  
  console.log("isAffiliateRole checking:", { 
    role: user.role,
    normalizedRole, 
    normalizedExpectedRole, 
    isEqual: normalizedRole.includes(normalizedExpectedRole), 
    user_role_type: typeof user.role 
  });
  
  // Sử dụng includes() thay vì so sánh chính xác
  return normalizedRole.includes(normalizedExpectedRole);
}

/**
 * Lấy API endpoint tương ứng với vai trò người dùng
 * @param user Thông tin người dùng
 * @param apiType Loại API cần lấy
 * @returns API endpoint tương ứng hoặc undefined nếu không tìm thấy
 */
export function getApiForRole(user: any | null, apiType: string): string | undefined {
  if (!user) return undefined;
  
  // Chuẩn hóa role thành chữ hoa
  const normalizedRole = typeof user.role === 'string' 
    ? user.role.toUpperCase() 
    : String(user.role).toUpperCase();
  
  console.log("getApiForRole for:", { 
    role: user.role,
    normalizedRole,
    apiType
  });
  
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
export function getDashboardForRole(user: any | null): string {
  if (!user) return '/auth';
  
  // Chuẩn hóa role thành chữ hoa
  const normalizedRole = typeof user.role === 'string' 
    ? user.role.toUpperCase() 
    : String(user.role).toUpperCase();
  
  console.log("getDashboardForRole for:", { 
    role: user.role,
    normalizedRole,
    route: ROLE_ROUTES[normalizedRole as keyof typeof ROLE_ROUTES] || '/dashboard'
  });
  
  // Xử lý trực tiếp dựa trên role đã chuẩn hóa sử dụng includes() thay vì so sánh chính xác
  if (normalizedRole.includes("KOL")) {
    console.log("Returning KOL dashboard path directly for KOL/VIP role:", normalizedRole);
    return '/kol-dashboard';
  } else {
    // Tất cả các vai trò khác (kể cả ADMIN) đều chuyển đến dashboard thông thường
    return '/dashboard';
  }
}

/**
 * Trích xuất thông tin người dùng và chuẩn bị dữ liệu liên quan đến vai trò
 * @param user Thông tin người dùng
 * @returns Thông tin người dùng với dữ liệu liên quan đến vai trò
 */
export function prepareUserWithRoleData(user: any | null) {
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