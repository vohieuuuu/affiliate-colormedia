import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

/**
 * RoleBasedRoute - Component dùng để chuyển hướng người dùng dựa trên vai trò
 * 
 * Luồng xử lý:
 * 1. Kiểm tra người dùng đã đăng nhập hay chưa, nếu chưa thì chuyển hướng đến trang đăng nhập
 * 2. Nếu cần đổi mật khẩu, chuyển hướng đến trang đổi mật khẩu
 * 3. Sau đó kiểm tra vai trò và chuyển hướng đến trang dashboard phù hợp
 */
export function RoleBasedRoute() {
  const { user, isLoading, requiresPasswordChange } = useAuth();
  console.log("RoleBasedRoute: Checking user role for redirection", { 
    userExists: !!user, 
    userRole: user?.role,
    isLoading,
    requiresPasswordChange
  });

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
    return <Redirect to="/kol-dashboard" />;
  } else {
    return <Redirect to="/" />;
  }
}