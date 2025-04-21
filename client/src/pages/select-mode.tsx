import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, PenSquare, ArrowRight } from "lucide-react";

/**
 * SelectModePage - Trang cho phép người dùng chọn chế độ làm việc
 * 
 * Với cải tiến mới, component này cho phép:
 * - Hiển thị các chế độ người dùng có thể truy cập dựa trên vai trò của họ
 * - Người dùng chọn chế độ làm việc (Normal/KOL) khi họ có nhiều vai trò
 * - Lưu trữ chế độ đã chọn để sử dụng cho các lần truy cập tiếp theo
 */
export default function SelectModePage() {
  const [, navigate] = useLocation();
  const { user, isLoading, selectedMode, selectMode } = useAuth();

  // Kiểm tra xem người dùng đã đăng nhập chưa - sửa lại để tránh vòng lặp vô hạn
  useEffect(() => {
    // Chỉ kiểm tra khi không còn đang tải dữ liệu
    if (!isLoading) {
      if (!user) {
        console.log("SelectModePage: User not logged in after loading, redirecting to auth");
        navigate("/auth", { replace: true });
      } else {
        console.log("SelectModePage: User logged in successfully:", user.username);
      }
    }
  }, [user, isLoading, navigate]);

  // Nếu đang tải dữ liệu HOẶC không có user, hiển thị loading
  // Đảm bảo không hiển thị nội dung chính của trang trước khi user được xác thực đầy đủ
  if (isLoading || !user) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="text-muted-foreground">Đang tải thông tin...</p>
      </div>
    );
  }

  // Chuẩn hóa role để so sánh không phân biệt hoa thường
  const normalizedRole = user?.role ? String(user.role).toUpperCase() : '';
  
  console.log("SelectModePage: User role check", {
    role: user?.role,
    normalizedRole,
    roleType: typeof user?.role,
    user: user
  });
  
  // Force log to console để theo dõi vấn đề
  console.warn(`[Debug] user role: "${user?.role}", normalized: "${normalizedRole}"`);
  
  // Sử dụng normalizedRole để kiểm tra vai trò
  // Điều này giúp tránh lỗi khi các thuộc tính isAdmin, isAffiliate, isKolVip chưa được tính toán đúng
  const hasNormalAccess = normalizedRole.includes("AFFILIATE") || normalizedRole.includes("ADMIN");
  // Admin không được truy cập KOL dashboard
  const hasKolAccess = normalizedRole.includes("KOL") && !normalizedRole.includes("ADMIN");
  
  // Thêm log chi tiết về quyết định
  console.warn(`[Debug] Access check: hasNormalAccess=${hasNormalAccess}, hasKolAccess=${hasKolAccess}`);
  
  console.log("SelectModePage: Access check result", {
    hasNormalAccess,
    hasKolAccess,
    showNoAccessMessage: !hasNormalAccess && !hasKolAccess
  });

  // Chọn chế độ và chuyển hướng đến trang chủ
  const handleSelectMode = (mode: 'normal' | 'kol') => {
    console.log("SelectModePage: Selecting mode", mode);
    selectMode(mode);
    
    // Chuyển hướng đến trang chủ để RoleRouter xử lý việc điều hướng tiếp theo
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-blue-500 text-transparent bg-clip-text">
            ColorMedia Affiliate System
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Chọn chế độ bạn muốn truy cập. Tùy theo vai trò của mình, bạn có thể truy cập vào hệ thống Affiliate thông thường hoặc hệ thống KOL/VIP.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
          {/* Chế độ Affiliate thông thường */}
          {hasNormalAccess && (
            <Card className={`shadow-md transition-all ${selectedMode === 'normal' ? 'border-primary ring-2 ring-primary ring-opacity-50' : 'hover:shadow-lg'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  <span>Affiliate Thông thường</span>
                </CardTitle>
                <CardDescription>
                  Quản lý khách hàng được giới thiệu và theo dõi hoa hồng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-500">
                  <p className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 shrink-0 mt-1" />
                    <span>Quản lý thông tin khách hàng được giới thiệu</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 shrink-0 mt-1" />
                    <span>Theo dõi tiến trình từ giới thiệu đến ký hợp đồng</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 shrink-0 mt-1" />
                    <span>Tạo yêu cầu rút tiền hoa hồng</span>
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => handleSelectMode('normal')}
                  variant={selectedMode === 'normal' ? 'default' : 'outline'}
                >
                  {selectedMode === 'normal' ? 'Đang chọn' : 'Chọn chế độ này'}
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Chế độ KOL/VIP */}
          {hasKolAccess && (
            <Card className={`shadow-md transition-all ${selectedMode === 'kol' ? 'border-primary ring-2 ring-primary ring-opacity-50' : 'hover:shadow-lg'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenSquare className="h-5 w-5 text-primary" />
                  <span>KOL/VIP Affiliate</span>
                </CardTitle>
                <CardDescription>
                  Quản lý danh sách liên hệ và theo dõi KPI theo cấp bậc
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-500">
                  <p className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 shrink-0 mt-1" />
                    <span>Quản lý danh sách khách hàng tiềm năng</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 shrink-0 mt-1" />
                    <span>Theo dõi KPI theo cấp bậc KOL</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 shrink-0 mt-1" />
                    <span>Quét danh thiếp để thêm nhanh khách hàng</span>
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => handleSelectMode('kol')}
                  variant={selectedMode === 'kol' ? 'default' : 'outline'}
                >
                  {selectedMode === 'kol' ? 'Đang chọn' : 'Chọn chế độ này'}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
        
        {/* Thông báo nếu không có quyền truy cập vào bất kỳ chế độ nào */}
        {!hasNormalAccess && !hasKolAccess && (
          <div className="text-center p-8">
            <p className="text-red-500 font-medium mb-4">
              Tài khoản của bạn không có quyền truy cập vào bất kỳ chế độ nào.
            </p>
            <Button onClick={() => navigate("/auth")}>
              Quay lại trang đăng nhập
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}