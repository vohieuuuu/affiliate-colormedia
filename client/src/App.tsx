import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import KolDashboard from "@/pages/kol-dashboard";
import DirectWithdrawalPage from "@/components/kol-dashboard/DirectWithdrawalPage";
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
import { useEffect, Suspense, lazy, startTransition } from "react";
import { TransitionBoundary } from "@/lib/transition-boundary-fixed";
import { Loader2 } from "lucide-react";

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
  
  // Tạo danh sách các routes không cần xác thực
  const publicRoutes = ["/auth"];
  
  // Tạo danh sách các routes yêu cầu xác thực nhưng không yêu cầu chọn mode
  const authOnlyRoutes = ["/change-password", "/select-mode", "/unauthorized"];
  
  // Tạo danh sách các routes đặc biệt
  const specialRoutes = ["/role-redirect"];
  
  // LUÔN KIỂM TRA XÁC THỰC TRƯỚC - quan trọng: ngay cả khi isLoading=true 
  // Ưu tiên cao nhất: Nếu chưa đăng nhập, luôn chuyển hướng về trang đăng nhập
  const isAuthenticated = !!user;
  const isPublicRoute = publicRoutes.includes(location);
  
  console.log("Authentication check:", { isAuthenticated, isPublicRoute, isLoading, location });
  
  if (!isAuthenticated && !isPublicRoute) {
    console.log("AuthenticatedRoutes: No user and trying to access protected route, redirecting to /auth");
    return <Redirect to="/auth" />;
  }
  
  // Nếu đang kiểm tra xác thực và route hiện tại không phải là route công khai,
  // hiển thị trạng thái loading
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="text-muted-foreground">Đang tải thông tin...</p>
      </div>
    );
  }
  
  // 3. Kiểm tra nếu cần đổi mật khẩu
  if (user && requiresPasswordChange && location !== "/change-password") {
    console.log("AuthenticatedRoutes: Password change required, redirecting to /change-password");
    return <Redirect to="/change-password" />;
  }
  
  // 4. Nếu đã đăng nhập nhưng chưa chọn chế độ, chuyển đến trang chọn chế độ
  // Lưu ý: Áp dụng cho tất cả các trang NGOẠI TRỪ các trang đặc biệt không cần chọn chế độ
  const skipModeCheckRoutes = [
    "/select-mode", 
    "/auth", 
    "/change-password", 
    "/unauthorized",
    ...specialRoutes
  ];
  
  if (user && !requiresPasswordChange && !selectedMode && !skipModeCheckRoutes.includes(location)) {
    console.log("AuthenticatedRoutes: Mode selection required, redirecting to /select-mode");
    return <Redirect to="/select-mode" />;
  }
  
  // Khi đã vượt qua tất cả các điều kiện bảo vệ, hiển thị các routes
  return (
    <Switch>
      {/* Những route công khai - không cần xác thực */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Route chỉ yêu cầu xác thực nhưng không yêu cầu chọn chế độ */}
      <ProtectedRoute path="/change-password" component={ChangePasswordPage} />
      <ProtectedRoute path="/select-mode" component={SelectModePage} />
      <ProtectedRoute path="/unauthorized" component={UnauthorizedPage} />
      
      {/* Route đặc biệt */}
      <Route path="/role-redirect/:refresh?" component={RoleBasedRoute} />
      
      {/* Các routes cần xác thực và có thể cần chọn chế độ */}
      <ProtectedRoute path="/" component={RoleRouter} />
      <ProtectedRoute path="/kol-dashboard" component={KolDashboard} />
      <ProtectedRoute path="/kol-dashboard/withdrawal" component={DirectWithdrawalPage} />
      {/* Sử dụng OtpVerificationPage trực tiếp (không lazy) để tránh các vấn đề với loading */}
      <Route path="/kol/otp-verification">
        <TransitionBoundary>
          <ProtectedRoute 
            path="/kol/otp-verification" 
            component={() => {
              // Import trực tiếp để tránh mọi vấn đề với lazy loading
              const OtpVerificationPage = require("@/pages/kol-dashboard/OtpVerificationPage").default;
              return <OtpVerificationPage />;
            }}
          />
        </TransitionBoundary>
      </Route>
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      
      {/* Admin routes */}
      <ProtectedRoute 
        path="/admin/commission" 
        component={() => {
          // Sử dụng dynamic import để lazy load trang quản lý hoa hồng
          const CommissionManagement = lazy(() => import("@/pages/admin/commission-management"));
          
          return (
            <Suspense fallback={
              <div className="flex flex-col gap-2 items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Đang tải trang quản lý hoa hồng...</p>
              </div>
            }>
              <RoleBasedRoute 
                roles={["ADMIN"]} 
                component={CommissionManagement} 
              />
            </Suspense>
          );
        }} 
      />
      
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
        {/* Bọc toàn bộ ứng dụng trong TransitionBoundary để ngăn lỗi suspense */}
        <TransitionBoundary>
          <Router />
        </TransitionBoundary>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;