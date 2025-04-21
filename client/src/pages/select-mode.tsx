import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, UserCircle, Award } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function SelectModePage() {
  const { user, isLoading, selectMode } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Nếu người dùng chưa đăng nhập, chuyển hướng về trang đăng nhập
    if (!isLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleSelectMode = (mode: 'normal' | 'kol') => {
    // Kiểm tra quyền truy cập
    const normalizedRole = user?.role ? String(user.role).toUpperCase() : '';
    
    // Nếu chọn KOL_VIP nhưng không có quyền
    if (mode === 'kol' && normalizedRole !== 'KOL_VIP') {
      return;
    }
    
    // Nếu chọn normal nhưng không có quyền (chỉ có role KOL_VIP)
    if (mode === 'normal' && normalizedRole !== 'AFFILIATE' && normalizedRole !== 'ADMIN') {
      return;
    }
    
    // Lưu mode đã chọn
    selectMode(mode);
    
    // Chuyển hướng đến trang tương ứng
    if (mode === 'kol') {
      navigate('/kol-dashboard', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  // Kiểm tra xem người dùng có quyền truy cập vào chế độ nào
  const canAccessNormal = user?.role && String(user.role).toUpperCase() !== 'KOL_VIP';
  const canAccessKol = user?.role && String(user.role).toUpperCase() === 'KOL_VIP';

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Đang tải thông tin người dùng...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-8 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Chọn chế độ truy cập
        </h1>
        
        <div className="grid gap-6">
          {/* Chế độ Affiliate thường */}
          <Card className={`border-2 ${canAccessNormal ? 'hover:border-primary cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                onClick={() => canAccessNormal && handleSelectMode('normal')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary" />
                Affiliate thường
              </CardTitle>
              <CardDescription>
                Quản lý khách hàng giới thiệu và theo dõi doanh số
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>Theo dõi hoa hồng và doanh số</li>
                  <li>Quản lý khách hàng giới thiệu</li>
                  <li>Rút tiền hoa hồng</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              {!canAccessNormal && (
                <Alert variant="destructive" className="w-full p-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs">Không có quyền truy cập</AlertTitle>
                  <AlertDescription className="text-xs">
                    Bạn không được phân quyền vào chế độ này
                  </AlertDescription>
                </Alert>
              )}
              {canAccessNormal && (
                <Button variant="outline" className="w-full">Chọn chế độ này</Button>
              )}
            </CardFooter>
          </Card>

          {/* Chế độ KOL/VIP */}
          <Card className={`border-2 ${canAccessKol ? 'hover:border-primary cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                onClick={() => canAccessKol && handleSelectMode('kol')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                KOL/VIP Affiliate
              </CardTitle>
              <CardDescription>
                Quản lý KPI và theo dõi hiệu suất theo cấp độ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>Quét card visit tự động</li>
                  <li>Theo dõi KPI hàng tháng</li>
                  <li>Quản lý lộ trình cấp độ (Level)</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              {!canAccessKol && (
                <Alert variant="destructive" className="w-full p-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs">Không có quyền truy cập</AlertTitle>
                  <AlertDescription className="text-xs">
                    Bạn không được phân quyền vào chế độ này
                  </AlertDescription>
                </Alert>
              )}
              {canAccessKol && (
                <Button variant="outline" className="w-full">Chọn chế độ này</Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}