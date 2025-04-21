import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, useParams } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { queryClient } from "@/lib/queryClient";
import { isKolVipRole, isAdminRole, isAffiliateRole } from "@/middleware/role-middleware";

/**
 * RoleBasedRoute - Component dùng để chuyển hướng người dùng dựa trên vai trò và chế độ đã chọn
 * 
 * Luồng xử lý mới:
 * 1. Kiểm tra người dùng đã đăng nhập hay chưa, nếu chưa thì chuyển hướng đến trang đăng nhập
 * 2. Nếu cần đổi mật khẩu, chuyển hướng đến trang đổi mật khẩu
 * 3. Nếu chưa chọn chế độ, chuyển hướng đến trang chọn chế độ
 * 4. Nếu đã chọn chế độ, kiểm tra quyền truy cập vào chế độ đó và chuyển hướng phù hợp
 */
// Component for handling routes based on user roles
type RoleBasedRouteProps = {
  roles?: string[];
  component?: React.ComponentType<any> | (() => Promise<any>);
};

export function RoleBasedRoute({ roles = [], component: Component }: RoleBasedRouteProps = {}) {
  const { user, isLoading, requiresPasswordChange, selectedMode } = useAuth();
  const params = useParams();
  const shouldRefresh = params.refresh === "refresh";
  
  // Chỉ log thông tin cần thiết, không log dữ liệu nhạy cảm
  console.log("RoleBasedRoute: Checking user for redirection", { 
    userExists: !!user, 
    hasRole: !!user?.role,
    mode: selectedMode,
    isLoading,
    requiresPasswordChange,
    shouldRefresh,
    hasRolesParam: roles.length > 0,
    hasComponent: !!Component
  });

  // Làm mới dữ liệu người dùng nếu có tham số refresh
  useEffect(() => {
    if (shouldRefresh) {
      console.log("Refreshing user data...");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    }
  }, [shouldRefresh]);

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
    console.log("User not authenticated, redirecting to /auth");
    return <Redirect to="/auth" />;
  }

  // Nếu người dùng cần đổi mật khẩu, chuyển hướng đến trang đổi mật khẩu
  if (requiresPasswordChange) {
    console.log("User needs to change password, redirecting to /change-password");
    return <Redirect to="/change-password" />;
  }

  // Chuẩn hóa role để kiểm tra - bảo vệ khỏi lỗi khi user.role là undefined
  // Sử dụng String() trực tiếp và chỉ khi role tồn tại
  const normalizedRole = user.role ? String(user.role).toUpperCase() : '';
  
  console.log("RoleBasedRoute: Processing user role", {
    role: user.role,
    normalizedRole
  });
  
  // Kiểm tra các vai trò của người dùng - lưu ý rằng chúng ta sử dụng includes thay vì so sánh chính xác
  const isKolVip = normalizedRole.includes("KOL") && !normalizedRole.includes("ADMIN");
  const isAffiliate = normalizedRole.includes("AFFILIATE") || normalizedRole.includes("ADMIN");
  const isAdmin = normalizedRole.includes("ADMIN");
  
  console.log("RoleBasedRoute: Role check results", {
    isKolVip,
    isAffiliate,
    isAdmin
  });
  
  // Nếu được chỉ định các vai trò và component, kiểm tra quyền truy cập
  if (roles.length > 0) {
    const hasRequiredRole = roles.some(role => 
      normalizedRole.includes(role.toUpperCase())
    );
    
    if (!hasRequiredRole) {
      console.log(`User does not have any of the required roles: ${roles.join(', ')}`);
      return <Redirect to="/unauthorized" />;
    }
    
    // Nếu người dùng có quyền và component được cung cấp
    if (Component) {
      console.log(`User has required role, rendering component`);
      const LoadedComponent = typeof Component === 'function' && 'then' in Component 
        ? lazy(() => Component()) 
        : Component;
      
      return (
        <Suspense fallback={
          <div className="flex flex-col gap-2 items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Đang tải trang...</p>
          </div>
        }>
          <LoadedComponent />
        </Suspense>
      );
    }
  }
  
  // Nếu không có component được chỉ định, tiếp tục với logic chuyển hướng dựa trên chế độ
  // Kiểm tra chế độ đã chọn
  if (!selectedMode) {
    console.log("No mode selected, redirecting to select-mode page");
    return <Redirect to="/select-mode" />;
  }
  
  // Kiểm tra quyền truy cập vào chế độ đã chọn
  if (selectedMode === 'kol' && !isKolVip) {
    console.log("User does not have access to KOL mode, redirecting to unauthorized");
    return <Redirect to="/unauthorized" />;
  }
  
  if (selectedMode === 'normal' && !isAffiliate) {
    console.log("User does not have access to Normal Affiliate mode, redirecting to unauthorized");
    return <Redirect to="/unauthorized" />;
  }
  
  // Đơn giản hóa chuyển hướng theo yêu cầu - chỉ tập trung vào chế độ Normal và KOL
  if (selectedMode === 'kol') {
    console.log("Selected mode is KOL, redirecting to KOL dashboard");
    return <Redirect to="/kol-dashboard" />;
  } else {
    // Mọi người dùng đều chuyển đến /dashboard khi chọn chế độ normal
    console.log("Selected mode is Normal, redirecting to regular dashboard");
    return <Redirect to="/dashboard" />;
  }
}