import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

/**
 * RoleRouter - Component điều hướng người dùng dựa vào vai trò và chế độ đã chọn
 * 
 * Với cải tiến mới, component này sẽ:
 * - Kiểm tra trạng thái loading trước khi thực hiện điều hướng
 * - Điều hướng đến dashboard phù hợp dựa trên vai trò người dùng và chế độ đã chọn
 * - Chuyển hướng đến trang chọn chế độ nếu người dùng chưa chọn
 * - Sử dụng replace: true để tránh lỗi quay lại / rồi redirect lại
 */
export default function RoleRouter() {
  const [, navigate] = useLocation();
  const { user, isLoading, selectedMode } = useAuth();

  // Log thông tin debug
  console.log("RoleRouter: Rendering with user data", {
    isLoading,
    user,
    userRole: user?.role,
    selectedMode
  });

  useEffect(() => {
    // ✅ Nếu dữ liệu user chưa load xong, không redirect
    if (isLoading) {
      console.log("RoleRouter: Still loading user data, not redirecting yet");
      return;
    }

    // ❌ Nếu user null => chưa đăng nhập => chuyển về login
    if (!user) {
      console.log("RoleRouter: No user, redirecting to auth page");
      navigate("/auth", { replace: true });
      return;
    }

    // Nếu người dùng chưa chọn chế độ, điều hướng đến trang chọn chế độ
    if (!selectedMode) {
      console.log("RoleRouter: No mode selected, redirecting to select-mode page");
      navigate("/select-mode", { replace: true });
      return;
    }

    // Chuẩn hóa role để so sánh không phân biệt hoa thường
    const normalizedRole = user?.role ? String(user.role).toUpperCase() : '';
    console.log("RoleRouter: Normalized role for redirection", normalizedRole, "Selected mode:", selectedMode);

    // Kiểm tra xem chế độ đã chọn có phù hợp với vai trò không
    // Nếu chọn chế độ KOL nhưng không có quyền KOL_VIP và không phải ADMIN
    if (selectedMode === 'kol' && normalizedRole !== "KOL_VIP" && normalizedRole !== "ADMIN") {
      console.log("RoleRouter: User does not have KOL_VIP role but selected KOL mode, redirecting to unauthorized");
      navigate("/unauthorized", { replace: true });
      return;
    }
    
    // Nếu chọn chế độ normal nhưng không có quyền AFFILIATE hoặc ADMIN
    if (selectedMode === 'normal' && normalizedRole !== "AFFILIATE" && normalizedRole !== "ADMIN" && normalizedRole !== "MANAGER") {
      console.log("RoleRouter: User selected normal mode but doesn't have permission, redirecting to unauthorized");
      navigate("/unauthorized", { replace: true });
      return;
    }

    // Điều hướng dựa trên chế độ đã chọn
    if (selectedMode === 'kol') {
      console.log("RoleRouter: KOL mode selected, redirecting to /kol-dashboard");
      navigate("/kol-dashboard", { replace: true });
    } else if (selectedMode === 'normal') {
      // Chuyển tất cả người dùng đến /dashboard khi chọn chế độ normal
      console.log("RoleRouter: Normal mode selected, redirecting to /dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [user, isLoading, navigate, selectedMode]);

  // Hiển thị loading trong lúc chờ hoặc đang chuyển hướng
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Đang tải thông tin...</p>
    </div>
  );
}