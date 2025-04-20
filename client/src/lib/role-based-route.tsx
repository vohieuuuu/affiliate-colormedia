import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, useParams } from "wouter";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

/**
 * RoleBasedRoute - Component dùng để chuyển hướng người dùng dựa trên vai trò
 * 
 * Luồng xử lý:
 * 1. Kiểm tra người dùng đã đăng nhập hay chưa, nếu chưa thì chuyển hướng đến trang đăng nhập
 * 2. Nếu cần đổi mật khẩu, chuyển hướng đến trang đổi mật khẩu
 * 3. Sau đó kiểm tra vai trò và chuyển hướng đến trang dashboard phù hợp
 * 
 * Thêm tham số refresh để làm mới dữ liệu người dùng
 */
export function RoleBasedRoute() {
  const { user, isLoading, requiresPasswordChange } = useAuth();
  const params = useParams();
  const shouldRefresh = params.refresh === "refresh";
  
  console.log("RoleBasedRoute: Checking user role for redirection", { 
    userExists: !!user, 
    userRole: user?.role,
    isLoading,
    requiresPasswordChange,
    shouldRefresh
  });

  // Làm mới dữ liệu người dùng nếu có tham số refresh
  useEffect(() => {
    if (shouldRefresh) {
      console.log("Refreshing user data...");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    }
  }, [shouldRefresh]);

  // Hiển thị trạng thái đang tải trong quá trình kiểm tra xác thực
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang tải thông tin người dùng...</p>
      </div>
    );
  }

  // Nếu người dùng không được xác thực, chuyển hướng đến trang đăng nhập
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Nếu người dùng cần đổi mật khẩu, chuyển hướng đến trang đổi mật khẩu
  if (requiresPasswordChange) {
    return <Redirect to="/change-password" />;
  }

  // Dựa vào vai trò người dùng, chuyển hướng đến trang dashboard tương ứng
  if (user.role === "KOL_VIP") {
    console.log("Redirecting KOL/VIP user to KOL dashboard");
    return <Redirect to="/kol-dashboard" />;
  } else {
    console.log("Redirecting regular user to normal dashboard");
    return <Redirect to="/" />;
  }
}