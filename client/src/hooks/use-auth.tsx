import { createContext, ReactNode, useContext, useState, useCallback, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { LoginSchema, RegisterSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { 
  isAdminRole, 
  isKolVipRole, 
  isAffiliateRole, 
  getDashboardForRole 
} from "../middleware/role-middleware";
import { useLocation } from "wouter";

// Định nghĩa kiểu dữ liệu cho chế độ được chọn
export type SelectedMode = 'normal' | 'kol' | null;

// Định nghĩa kiểu dữ liệu cho API response
interface ApiResponse<T> {
  status: string;
  data: T;
}

// Định nghĩa kiểu dữ liệu cho user từ API
interface ApiUser {
  id: number;
  username: string;
  role: string;
  is_first_login?: boolean;
  affiliate_id?: string; // Thêm affiliate_id để kiểm tra khi đăng nhập
  full_name?: string; // Thêm full_name để hiển thị trong header
}

// Định nghĩa kiểu dữ liệu cho user với thông tin bổ sung
interface User extends ApiUser {
  // Các thuộc tính bổ sung để xác định vai trò
  isAdmin: boolean;
  isKolVip: boolean;
  isAffiliate: boolean;
  dashboardRoute: string;
}

// Định nghĩa kiểu dữ liệu phản hồi từ API đăng nhập
interface LoginResponse {
  user: User;
  token: string;
  requires_password_change: boolean;
}

// Định nghĩa kiểu dữ liệu cho form đăng nhập
type LoginData = z.infer<typeof LoginSchema>;

// Định nghĩa kiểu dữ liệu cho form đăng ký
type RegisterData = Omit<z.infer<typeof RegisterSchema>, "confirmPassword">;

// Định nghĩa kiểu dữ liệu cho context Auth
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  requiresPasswordChange: boolean;
  selectedMode: SelectedMode;
  loginMutation: UseMutationResult<LoginResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  clearPasswordChangeRequirement: () => void;
  selectMode: (mode: SelectedMode) => void;
}

// Khởi tạo context mặc định
const defaultAuthContext: AuthContextType = {
  user: null,
  isLoading: false,
  error: null,
  requiresPasswordChange: false,
  selectedMode: null,
  loginMutation: {} as UseMutationResult<LoginResponse, Error, LoginData>,
  logoutMutation: {} as UseMutationResult<void, Error, void>,
  registerMutation: {} as UseMutationResult<User, Error, RegisterData>,
  clearPasswordChangeRequirement: () => {},
  selectMode: () => {}
};

// Tạo context
export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Kiểm tra xem người dùng có yêu cầu đổi mật khẩu hay không
  const storedRequiresPasswordChange = typeof window !== 'undefined' ? sessionStorage.getItem("requires_password_change") : null;
  const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(
    storedRequiresPasswordChange === "true"
  );
  
  // Lấy chế độ đã chọn từ localStorage
  const storedMode = typeof window !== 'undefined' ? localStorage.getItem("selected_mode") as SelectedMode : null;
  const [selectedMode, setSelectedMode] = useState<SelectedMode>(storedMode);
  
  // Query để lấy thông tin người dùng hiện tại và bổ sung thông tin vai trò
  const {
    data: userRaw,
    error,
    isLoading,
  } = useQuery<ApiResponse<{user: ApiUser}> | ApiUser | null, Error>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Xử lý việc clear thông tin xác thực khi người dùng không đăng nhập
  useEffect(() => {
    // Không cần kiểm tra token từ localStorage nữa, vì giờ đã sử dụng HttpOnly cookie
    // Token sẽ được xử lý tự động bởi API proxy server
    // Tuy nhiên vẫn cần xóa thông tin người dùng trong trường hợp logout hoặc session hết hạn
    
    // Nếu không load user được, xóa thông tin mode đã chọn
    if (!userRaw && !isLoading) {
      if (process.env.NODE_ENV === 'development') {
        console.log("No authenticated user, clearing client-side data");
      }
      localStorage.removeItem("selected_mode");
      sessionStorage.removeItem("requires_password_change");
    }
  }, [userRaw, isLoading]);
  
  // Xử lý cấu trúc phản hồi từ API
  let apiUser: ApiUser | null = null;
  
  if (userRaw) {
    if (typeof userRaw === 'object' && 'status' in userRaw && userRaw.status === "success" 
      && 'data' in userRaw && userRaw.data && typeof userRaw.data === 'object' && 'user' in userRaw.data) {
      // Nếu là cấu trúc phản hồi API
      apiUser = userRaw.data.user;
    } else if ('id' in userRaw && 'username' in userRaw && 'role' in userRaw) {
      // Nếu là trực tiếp thông tin user
      apiUser = userRaw as ApiUser;
    }
  }
  
  // Bổ sung thông tin vai trò cho user
  const user = apiUser ? {
    ...apiUser,
    // Sử dụng includes trực tiếp thay vì gọi các hàm để đảm bảo tính nhất quán
    isAdmin: apiUser.role ? String(apiUser.role).toUpperCase().includes("ADMIN") : false,
    // ADMIN không thể truy cập dashboard KOL/VIP
    isKolVip: apiUser.role ? (String(apiUser.role).toUpperCase().includes("KOL") && 
                             !String(apiUser.role).toUpperCase().includes("ADMIN") && 
                             !!apiUser.affiliate_id) : false,
    isAffiliate: apiUser.role ? (String(apiUser.role).toUpperCase().includes("AFFILIATE") || 
                                String(apiUser.role).toUpperCase().includes("ADMIN")) : false,
    dashboardRoute: getDashboardForRole(apiUser)
  } : null;
  
  // Log thông tin vai trò để debug (chỉ log thông tin vai trò, không log dữ liệu nhạy cảm)
  if (apiUser && process.env.NODE_ENV === 'development') {
    console.log("useAuth: User role information", {
      roleType: typeof apiUser.role,
      hasRole: !!apiUser.role,
      hasAffiliateId: !!apiUser.affiliate_id,
      isAdmin: user?.isAdmin,
      isKolVip: user?.isKolVip,
      isAffiliate: user?.isAffiliate
    });
  }

  // Xử lý lỗi xác thực và kiểm tra lỗi token
  useEffect(() => {
    // Kiểm tra bất kỳ lỗi nào trong quá trình xác thực
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error fetching user data:", error);
      }
      // Xóa bỏ thông tin token đã lưu nếu lỗi 401 hoặc lỗi khác
      if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Auth error detected, clearing session data");
        }
        clearAuthData();
      }
    }
    
    // Kiểm tra nếu quá trình tải hoàn tất mà không có user
    if (!isLoading && !userRaw) {
      if (process.env.NODE_ENV === 'development') {
        console.log("Authentication check completed: No user found, clearing any stale tokens");
      }
      clearAuthData();
    }
  }, [error, isLoading, userRaw]);
  
  // Hàm xóa tất cả dữ liệu xác thực phía client (cookies được xử lý ở backend)
  const clearAuthData = () => {
    if (typeof window !== 'undefined') {
      if (process.env.NODE_ENV === 'development') {
        console.log("Clearing all client auth data");
      }
      // Không còn cần xóa auth_token từ localStorage/sessionStorage
      // vì giờ đã dùng cookies httpOnly 
      localStorage.removeItem("selected_mode");
      sessionStorage.removeItem("requires_password_change");
    }
  };

  // Mutation đăng nhập
  const loginMutation = useMutation<LoginResponse, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      const data = await res.json();
      return {
        user: data.data.user,
        token: data.data.token,
        requires_password_change: data.data.requires_password_change
      };
    },
    onSuccess: (response: LoginResponse) => {
      // Xử lý đăng nhập thành công
      if (process.env.NODE_ENV === 'development') {
        console.log("Login successful, user authenticated");
      }
      
      // Không cần lưu token trong localStorage/sessionStorage nữa
      // Token đã được lưu trong HttpOnly cookie bởi API proxy
        
      // Cập nhật thông tin người dùng trong query cache
      // Đóng gói thông tin người dùng theo đúng định dạng phản hồi từ API
      queryClient.setQueryData(["/api/auth/me"], {
        status: "success",
        data: {
          user: response.user
        }
      });
      
      // Lưu và cập nhật trạng thái yêu cầu đổi mật khẩu
      const needsPasswordChange = response.requires_password_change;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem("requires_password_change", needsPasswordChange.toString());
      }
      setRequiresPasswordChange(needsPasswordChange);
      
      toast({
        title: "Đăng nhập thành công",
        description: `Chào mừng quay trở lại, ${response.user.username}!`,
      });
      
      // Chuyển hướng đến trang dựa vào trạng thái đổi mật khẩu
      if (needsPasswordChange) {
        // Nếu cần đổi mật khẩu, chuyển đến trang đổi mật khẩu trước
        if (process.env.NODE_ENV === 'development') {
          console.log("Login success: redirecting to change-password page");
        }
        // Sử dụng navigate để tránh làm mới trang
        navigate("/change-password");
      } else {
        // Nếu không cần đổi mật khẩu, chuyển đến trang chọn vai trò
        if (process.env.NODE_ENV === 'development') {
          console.log("Login success: redirecting to select-mode page");
        }
        
        // Xóa chế độ đã chọn trước đó (nếu có) khi đăng nhập thành công
        if (typeof window !== 'undefined') {
          localStorage.removeItem("selected_mode");
          setSelectedMode(null);
        }
        
        // Sử dụng navigate thay vì window.location.href để tránh làm mới trang và mất trạng thái
        navigate("/select-mode");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Đăng nhập thất bại",
        description: error.message || "Tên đăng nhập hoặc mật khẩu không chính xác",
        variant: "destructive",
      });
    },
  });

  // Mutation đăng ký
  const registerMutation = useMutation<User, Error, RegisterData>({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", credentials);
      const data = await res.json();
      return data.data.user;
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/auth/me"], user);
      toast({
        title: "Đăng ký thành công",
        description: "Tài khoản của bạn đã được tạo thành công",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Đăng ký thất bại",
        description: error.message || "Có lỗi xảy ra khi đăng ký tài khoản",
        variant: "destructive",
      });
    },
  });

  // Mutation đăng xuất
  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      // Xóa tất cả dữ liệu phiên khi đăng xuất
      if (typeof window !== 'undefined') {
        // Xóa dữ liệu liên quan đến phiên người dùng
        sessionStorage.removeItem("requires_password_change");
        localStorage.removeItem("selected_mode");
        // Không cần xóa auth_token từ localStorage/sessionStorage 
        // vì đã dùng HTTP-only cookie
      }
      setRequiresPasswordChange(false);
      setSelectedMode(null);
      queryClient.setQueryData(["/api/auth/me"], null);
      
      toast({
        title: "Đăng xuất thành công",
        description: "Bạn đã đăng xuất khỏi hệ thống",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Đăng xuất thất bại",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Xóa yêu cầu đổi mật khẩu khi hoàn thành
  const clearPasswordChangeRequirement = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("Clearing password change requirement");
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem("requires_password_change");
    }
    setRequiresPasswordChange(false);
    
    // Chuyển hướng được xử lý tại component ChangePasswordPage
    // để tránh xung đột và đảm bảo đúng luồng
  }, []);
  
  // Xử lý chọn chế độ (mode)
  const selectMode = useCallback((mode: SelectedMode) => {
    if (process.env.NODE_ENV === 'development') {
      console.log("Selecting mode:", mode);
    }
    setSelectedMode(mode);
    
    // Lưu chế độ đã chọn vào localStorage để duy trì giữa các phiên
    if (typeof window !== 'undefined' && mode) {
      localStorage.setItem("selected_mode", mode);
    } else if (typeof window !== 'undefined' && mode === null) {
      localStorage.removeItem("selected_mode");
    }
  }, []);
  
  // Cập nhật AuthContext khi đăng xuất để xóa selected_mode
  useEffect(() => {
    if (typeof window !== 'undefined' && !user) {
      localStorage.removeItem("selected_mode");
      setSelectedMode(null);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        requiresPasswordChange,
        selectedMode,
        loginMutation,
        logoutMutation,
        registerMutation,
        clearPasswordChangeRequirement,
        selectMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}