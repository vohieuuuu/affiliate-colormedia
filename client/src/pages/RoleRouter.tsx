import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import Dashboard from "@/pages/dashboard";
import KolDashboard from "@/pages/kol-dashboard";

/**
 * RoleRouter - Component mới thay thế cả hai component Dashboard và KolDashboard
 * 
 * - Bước đầu tiên kiểm tra vai trò người dùng
 * - Sau đó render component tương ứng dựa vào vai trò
 * - Đảm bảo không có sự xung đột giữa các component con
 */
export default function RoleRouter() {
  const { user, isLoading, error } = useAuth();

  // Ghi log thông tin debug
  console.log("RoleRouter: Rendering with user role", {
    isLoading,
    userRole: user?.role,
    error: error?.message
  });

  // Hiển thị trạng thái loading
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Đang tải thông tin...</p>
      </div>
    );
  }

  // Hiển thị lỗi nếu có
  if (error) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Lỗi xác thực</h1>
          <p className="text-gray-700">{error.message}</p>
          <button
            onClick={() => window.location.href = "/auth"}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Đăng nhập lại
          </button>
        </div>
      </div>
    );
  }

  // Kiểm tra nếu người dùng không tồn tại
  if (!user) {
    useEffect(() => {
      console.log("No user detected, redirecting to auth page");
      window.location.href = "/auth";
    }, []);

    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Đang chuyển hướng đến trang đăng nhập...</p>
      </div>
    );
  }

  // Render dashboard tương ứng với vai trò
  console.log("RoleRouter: Rendering dashboard for role:", user.role);
  
  if (user.role === "KOL_VIP") {
    return <KolDashboard />;
  } else {
    return <Dashboard />;
  }
}