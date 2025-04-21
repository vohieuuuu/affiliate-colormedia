import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, requiresPasswordChange, selectedMode } = useAuth();
  const [, setLocation] = useLocation();

  // Phần này đã được thay thế bằng RoleRouter, nên không cần thiết logic điều hướng vai trò ở đây
  // Chỉ ghi log thông tin để debug
  useEffect(() => {
    if (user && !isLoading && !requiresPasswordChange) {
      console.log("ProtectedRoute: user authenticated", {
        userRole: user.role,
        path,
        currentPath: window.location.pathname,
        mode: selectedMode
      });
    }
  }, [user, isLoading, requiresPasswordChange, path, selectedMode]);

  // Hiển thị trạng thái đang tải trong quá trình kiểm tra xác thực
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex flex-col gap-2 items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Đang tải thông tin...</p>
        </div>
      </Route>
    );
  }

  // Ưu tiên #1: Nếu người dùng không được xác thực, chuyển hướng đến trang đăng nhập
  if (!user) {
    console.log("ProtectedRoute: User not authenticated, redirecting to auth for path:", path);
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Ưu tiên #2: Nếu người dùng cần đổi mật khẩu và đang không ở trang đổi mật khẩu, 
  // chuyển hướng đến trang đổi mật khẩu
  if (requiresPasswordChange && path !== "/change-password") {
    return (
      <Route path={path}>
        <Redirect to="/change-password" />
      </Route>
    );
  }
  
  // Ưu tiên #3: Nếu người dùng chưa chọn chế độ và không phải đang ở các trang đặc biệt,
  // chuyển hướng đến trang chọn chế độ
  const skipModeCheckRoutes = ["/select-mode", "/change-password", "/unauthorized"];
  if (!requiresPasswordChange && !selectedMode && !skipModeCheckRoutes.includes(path)) {
    console.log("ProtectedRoute: Mode selection required for path:", path);
    return (
      <Route path={path}>
        <Redirect to="/select-mode" />
      </Route>
    );
  }

  // Nếu người dùng đã đăng nhập, hiển thị component được bảo vệ
  return <Route path={path} component={Component} />;
}