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
  const { user, isLoading, requiresPasswordChange } = useAuth();
  const [, setLocation] = useLocation();

  // Kiểm tra và điều hướng dựa trên vai trò
  useEffect(() => {
    if (user && !isLoading && !requiresPasswordChange) {
      // Chuyển hướng KOL/VIP đến trang KOL dashboard từ trang chính
      if (user.role === "KOL_VIP" && path === "/" && window.location.pathname === "/") {
        setLocation("/kol-dashboard");
      }
      
      // Chuyển hướng affiliate thường đến trang dashboard từ trang KOL
      if (user.role !== "KOL_VIP" && path === "/kol-dashboard" && window.location.pathname === "/kol-dashboard") {
        setLocation("/");
      }
    }
  }, [user, isLoading, requiresPasswordChange, path, setLocation]);

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

  // Nếu người dùng không được xác thực, chuyển hướng đến trang đăng nhập
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Nếu người dùng cần đổi mật khẩu và đang không ở trang đổi mật khẩu, 
  // chuyển hướng đến trang đổi mật khẩu
  if (requiresPasswordChange && path !== "/change-password") {
    return (
      <Route path={path}>
        <Redirect to="/change-password" />
      </Route>
    );
  }

  // Nếu người dùng đã đăng nhập, hiển thị component được bảo vệ
  return <Route path={path} component={Component} />;
}