import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import KolDashboard from "@/pages/kol-dashboard";
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
        dựa trên vai trò người dùng. Điều này ngăn chặn việc cố gắng tải
        sai dữ liệu từ Dashboard thông thường khi người dùng là KOL/VIP
      */}
      <ProtectedRoute path="/" component={RoleRouter} />
      
      {/* Routes cũ - giữ lại để tương thích với các tính năng khác 
          nhưng không còn được sử dụng trực tiếp từ điều hướng */}
      <ProtectedRoute path="/kol-dashboard" component={KolDashboard} />
      
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
