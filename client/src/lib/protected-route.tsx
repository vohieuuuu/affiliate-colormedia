import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, requiresPasswordChange } = useAuth();

  // Hiển thị trạng thái đang tải trong quá trình kiểm tra xác thực
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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