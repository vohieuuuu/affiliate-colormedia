import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function UnauthorizedPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <AlertTriangle className="h-16 w-16 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4 text-gray-900">
          Không có quyền truy cập
        </h1>
        
        <p className="text-gray-600 mb-8">
          Bạn không có quyền truy cập vào trang này. Vui lòng quay lại trang chọn chế độ hoặc liên hệ quản trị viên nếu đây là lỗi.
        </p>
        
        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => navigate("/select-mode")}
            className="w-full"
          >
            Quay lại trang chọn chế độ
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate("/")}
            className="w-full"
          >
            Về trang chủ
          </Button>
        </div>
      </div>
    </div>
  );
}