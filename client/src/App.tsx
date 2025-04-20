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
        GIẢI PHÁP MỚI: Sử dụng Dashboard cho tất cả vai trò
        Bên trong dashboard.tsx đã xử lý hiển thị giao diện Admin
        và chuyển hướng người dùng KOL/VIP đến KolDashboard
      */}
      <ProtectedRoute path="/" component={Dashboard} />
      
      {/* Routes đặc biệt cho KOL/VIP */}
      <ProtectedRoute path="/kol-dashboard" component={KolDashboard} />
      
      {/* RoleRouter cho vai trò sau này - có thể bỏ qua, không được sử dụng */}
      <ProtectedRoute path="/role-router" component={RoleRouter} />
      
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
