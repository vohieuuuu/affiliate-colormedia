import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, useParams } from "wouter";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { isKolVipRole, getDashboardForRole } from "@/middleware/role-middleware";

/**
 * RoleBasedRoute - Component dùng để chuyển hướng người dùng dựa trên vai trò
 * 
 * Luồng xử lý:
 * 1. Kiểm tra người dùng đã đăng nhập hay chưa, nếu chưa thì chuyển hướng đến trang đăng nhập
 * 2. Nếu cần đổi mật khẩu, chuyển hướng đến trang đổi mật khẩu
 * 3. Sau đó kiểm tra vai trò và chuyển hướng đến trang dashboard phù hợp sử dụng middleware mới
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
    isKolVip: user?.isKolVip,
    dashboardRoute: user?.dashboardRoute,
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

  // Sử dụng middleware vai trò để kiểm tra và quyết định chuyển hướng
  console.log(`Using role middleware to determine dashboard route for role: ${user.role}`);
  
  // Chuẩn hóa role thành chữ hoa để kiểm tra chính xác
  const userRole = typeof user.role === 'string' ? user.role.toUpperCase() : String(user.role).toUpperCase();
  console.log("RoleBasedRoute: User role normalized:", userRole);
  
  // Nếu là KOL/VIP, chuyển đến dashboard của KOL 
  // Quan trọng: Sử dụng window.location.href thay vì Redirect để buộc làm mới trang
  if (userRole === "KOL_VIP") {
    console.log("Redirecting KOL/VIP user to KOL dashboard");
    window.location.href = "/kol-dashboard";
    return (
      <div className="flex flex-col gap-2 items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang chuyển hướng đến KOL Dashboard...</p>
      </div>
    );
  } 
  // Ngược lại, chuyển đến dashboard thông thường
  else {
    console.log(`Redirecting regular user to dashboard`);
    window.location.href = "/dashboard";
    return (
      <div className="flex flex-col gap-2 items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang chuyển hướng đến Dashboard...</p>
      </div>
    );
  }
}