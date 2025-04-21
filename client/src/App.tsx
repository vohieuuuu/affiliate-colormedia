import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import KolDashboard from "@/pages/kol-dashboard";
import SelectModePage from "@/pages/select-mode";
import UnauthorizedPage from "@/pages/unauthorized";
import AuthPage from "@/pages/auth-page";
import ChangePasswordPage from "@/pages/change-password";
import RoleRouter from "@/pages/RoleRouter";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { RoleBasedRoute } from "@/lib/role-based-route";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { useEffect } from "react";

// Thêm một component mới để xử lý điều hướng một cách thông minh
// Component này sẽ giúp điều hướng người dùng đúng cách dựa trên trạng thái hiện tại
function AuthenticatedRoutes() {
  const { user, isLoading, requiresPasswordChange, selectedMode } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Log trạng thái hiện tại cho mục đích debug
  useEffect(() => {
    console.log("AuthenticatedRoutes: Current state", { 
      user,
      isLoading,
      requiresPasswordChange,
      selectedMode,
      location
    });
  }, [user, isLoading, requiresPasswordChange, selectedMode, location]);
  
  // Thêm việc xử lý các trường hợp đặc biệt
  
  // 1. Nếu đang tải dữ liệu, hiển thị trạng thái loading thay vì chuyển hướng
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="text-muted-foreground">Đang tải thông tin...</p>
      </div>
    );
  }
  
  // 2. Nếu không có user (chưa đăng nhập) và không phải ở trang đăng nhập, chuyển hướng đến trang đăng nhập
  if (!user && location !== "/auth") {
    console.log("AuthenticatedRoutes: No user, redirecting to auth page");
    return <Redirect to="/auth" />;
  }
  
  // 3. Nếu yêu cầu đổi mật khẩu và không đang ở trang đổi mật khẩu, chuyển hướng đến trang đổi mật khẩu
  if (user && requiresPasswordChange && location !== "/change-password") {
    console.log("AuthenticatedRoutes: Password change required, redirecting");
    return <Redirect to="/change-password" />;
  }
  
  // 4. Nếu đã đăng nhập và không cần đổi mật khẩu nhưng chưa chọn chế độ và không đang ở trang chọn chế độ
  // hoặc trong các routes được bảo vệ
  const protectedRoutes = ["/select-mode", "/auth", "/change-password", "/role-redirect"];
  if (user && !requiresPasswordChange && !selectedMode && !protectedRoutes.includes(location)) {
    console.log("AuthenticatedRoutes: Mode selection required, redirecting to select-mode");
    return <Redirect to="/select-mode" />;
  }
  
  // Khi đã vượt qua tất cả các điều kiện, hiển thị Switch bình thường với các routes
  return (
    <Switch>
      {/* Những route không cần xác thực */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Route đổi mật khẩu được bảo vệ */}
      <ProtectedRoute path="/change-password" component={ChangePasswordPage} />
      
      {/* Route điều hướng vai trò - giữ lại để tương thích với code cũ */}
      <Route path="/role-redirect/:refresh?" component={RoleBasedRoute} />
      
      {/* Trang chọn chế độ - cần xác thực nhưng không cần kiểm tra vai trò */}
      <ProtectedRoute path="/select-mode" component={SelectModePage} />
      
      {/* Trang không có quyền truy cập */}
      <ProtectedRoute path="/unauthorized" component={UnauthorizedPage} />
      
      {/* 
        GIẢI PHÁP MỚI: Sử dụng RoleRouter để quyết định hiển thị Dashboard nào
        dựa trên vai trò người dùng. RoleRouter sẽ kiểm tra vai trò và 
        hiển thị giao diện phù hợp cho mỗi loại người dùng
      */}
      <ProtectedRoute path="/" component={RoleRouter} />
      
      {/* Đặt route cụ thể cho KOL/VIP và Dashboard thông thường SAU route chính để 
         đảm bảo RoleRouter được ưu tiên cao hơn khi truy cập route / */}
      <ProtectedRoute path="/kol-dashboard" component={KolDashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      
      {/* Đã loại bỏ route admin-dashboard, mọi admin sẽ sử dụng dashboard thông thường */}
      
      {/* Route mặc định nếu không tìm thấy trang */}
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  return <AuthenticatedRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
