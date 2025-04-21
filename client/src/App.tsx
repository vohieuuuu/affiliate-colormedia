import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import KolDashboard from "@/pages/kol-dashboard";
import SelectModePage from "@/pages/select-mode";
import AuthPage from "@/pages/auth-page";
import ChangePasswordPage from "@/pages/change-password";
import RoleRouter from "@/pages/RoleRouter";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { RoleBasedRoute } from "@/lib/role-based-route";

function Router() {
  return (
    <Switch>
      {/* Những route không cần xác thực */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Route đổi mật khẩu được bảo vệ */}
      <ProtectedRoute path="/change-password" component={ChangePasswordPage} />
      
      {/* Route điều hướng vai trò - giữ lại để tương thích với code cũ */}
      <Route path="/role-redirect/:refresh?" component={RoleBasedRoute} />
      
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
      
      {/* Route mặc định nếu không tìm thấy trang */}
      <Route component={NotFound} />
    </Switch>
  );
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
