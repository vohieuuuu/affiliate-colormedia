import { createContext, ReactNode, useContext, useState, useCallback } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { LoginSchema, RegisterSchema } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Định nghĩa kiểu dữ liệu cho user
interface User {
  id: number;
  username: string;
  role: string;
  is_first_login?: boolean;
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
  loginMutation: UseMutationResult<LoginResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  clearPasswordChangeRequirement: () => void;
}

// Khởi tạo context mặc định
const defaultAuthContext: AuthContextType = {
  user: null,
  isLoading: false,
  error: null,
  requiresPasswordChange: false,
  loginMutation: {} as UseMutationResult<LoginResponse, Error, LoginData>,
  logoutMutation: {} as UseMutationResult<void, Error, void>,
  registerMutation: {} as UseMutationResult<User, Error, RegisterData>,
  clearPasswordChangeRequirement: () => {}
};

// Tạo context
export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Kiểm tra xem người dùng có yêu cầu đổi mật khẩu hay không
  const storedRequiresPasswordChange = typeof window !== 'undefined' ? sessionStorage.getItem("requires_password_change") : null;
  const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(
    storedRequiresPasswordChange === "true"
  );
  
  // Query để lấy thông tin người dùng hiện tại
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

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
      queryClient.setQueryData(["/api/auth/me"], response.user);
      
      // Lưu token vào session storage để sử dụng trong các API calls
      if (typeof window !== 'undefined') {
        sessionStorage.setItem("auth_token", response.token);
      }
      
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
        sessionStorage.removeItem("requires_password_change");
        sessionStorage.removeItem("auth_token");
      }
      setRequiresPasswordChange(false);
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
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem("requires_password_change");
    }
    setRequiresPasswordChange(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        requiresPasswordChange,
        loginMutation,
        logoutMutation,
        registerMutation,
        clearPasswordChangeRequirement
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