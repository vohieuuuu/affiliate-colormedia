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
  
  if (user.role === "ADMIN") {
    // Hiển thị một trang quản trị hoặc một thông báo cho admin
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-primary mb-4">Trang quản trị Admin</h1>
          <p className="text-gray-700 mb-6">
            Bạn đã đăng nhập với tài khoản Admin. 
            Sử dụng các API Admin để quản lý hệ thống.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                window.location.href = "/auth";
              }}
              className="p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <h3 className="font-medium mb-1">Đăng nhập lại</h3>
              <p className="text-sm text-muted-foreground">Đăng nhập với tài khoản khác</p>
            </button>
            
            <button
              onClick={() => {
                // Tạo tài khoản KOL/VIP cho testing
                fetch("/api/admin/kol/create", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${sessionStorage.getItem("auth_token")}`
                  },
                  body: JSON.stringify({
                    email: "mutnhata@gmail.com",
                    full_name: "Test KOL Account",
                    phone: "0987654321"
                  })
                })
                .then(res => res.json())
                .then(data => {
                  alert("Đã tạo tài khoản KOL/VIP thành công: " + data.data.user.username);
                })
                .catch(err => {
                  alert("Lỗi khi tạo tài khoản: " + err.message);
                });
              }}
              className="p-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <h3 className="font-medium mb-1">Tạo tài khoản KOL/VIP</h3>
              <p className="text-sm text-primary-foreground">Tạo tài khoản KOL/VIP mới cho testing</p>
            </button>
          </div>
        </div>
      </div>
    );
  } else if (user.role === "KOL_VIP") {
    return <KolDashboard />;
  } else {
    return <Dashboard />;
  }
}