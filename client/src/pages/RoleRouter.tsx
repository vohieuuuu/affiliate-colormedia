import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

/**
 * RoleRouter - Component điều hướng người dùng dựa vào vai trò
 * 
 * Dựa trên hướng dẫn từ tài liệu, component này sẽ:
 * - Kiểm tra trạng thái loading trước khi thực hiện điều hướng
 * - Điều hướng đến dashboard phù hợp dựa trên vai trò người dùng
 * - Sử dụng replace: true để tránh lỗi quay lại / rồi redirect lại
 */
export default function RoleRouter() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();

  // Log thông tin debug
  console.log("RoleRouter: Rendering with user data", {
    isLoading,
    user,
    userRole: user?.role,
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

    // Chuẩn hóa role để so sánh không phân biệt hoa thường
    const normalizedRole = String(user.role).toUpperCase();
    console.log("RoleRouter: Normalized role for redirection", normalizedRole);

    // ✅ Nếu role là KOL/VIP, chuyển về kol-dashboard
    if (normalizedRole === "KOL_VIP") {
      console.log("RoleRouter: KOL/VIP user detected, redirecting to /kol-dashboard");
      navigate("/kol-dashboard", { replace: true });
    } 
    // ✅ Nếu role là ADMIN, chuyển về admin-dashboard
    else if (normalizedRole === "ADMIN") {
      console.log("RoleRouter: Admin user detected, redirecting to /admin-dashboard");
      navigate("/admin-dashboard", { replace: true });
    }
    // ✅ Nếu là role bình thường (AFFILIATE, MANAGER), chuyển về dashboard
    else {
      console.log("RoleRouter: Normal affiliate detected, redirecting to /dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Hiển thị loading trong lúc chờ hoặc đang chuyển hướng
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Đang tải thông tin...</p>
    </div>
  );
}