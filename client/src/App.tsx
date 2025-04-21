import { Switch, Route, useLocation } from "wouter";
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
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

// Tạo một component mới để điều hướng người dùng dựa trên vai trò
function RoleRedirector() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    if (user && !isLoading) {
      const normalizedRole = String(user.role).toUpperCase();
      console.log("RoleRedirector - Current role:", normalizedRole, "at location:", location);
      
      // Chỉ chuyển hướng nếu đang ở trang chính '/' hoặc '/dashboard' và là KOL/VIP
      if (normalizedRole === "KOL_VIP" && 
          (location === "/" || location === "/dashboard")) {
        console.log("RoleRedirector - Redirecting KOL/VIP to /kol-dashboard");
        setLocation("/kol-dashboard");
      }
    }
  }, [user, isLoading, location, setLocation]);
  
  return null;
}

function Router() {
  return (
    <Switch>
      {/* Component điều hướng vai trò */}
      <Route path="/:any*">
        <RoleRedirector />
      </Route>
      
      {/* Những route không cần xác thực */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Route đổi mật khẩu được bảo vệ */}
      <ProtectedRoute path="/change-password" component={ChangePasswordPage} />
      
      {/* Route KOL/VIP dashboard đặt TRƯỚC dashboard thường */}
      <ProtectedRoute path="/kol-dashboard" component={KolDashboard} />
      
      {/* Route dashboard thường */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      
      {/* 
        QUAN TRỌNG: Route chính / được đặt TRƯỚC route fallback 
        và sẽ kiểm tra vai trò để hiển thị dashboard phù hợp
      */}
      <ProtectedRoute path="/" component={RoleRouter} />
      
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
