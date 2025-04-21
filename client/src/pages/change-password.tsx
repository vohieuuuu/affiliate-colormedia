import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Định nghĩa schema validation cho form đổi mật khẩu
const changePasswordSchema = z.object({
  current_password: z.string().min(6, {
    message: "Mật khẩu hiện tại phải có ít nhất 6 ký tự"
  }),
  new_password: z.string().min(6, {
    message: "Mật khẩu mới phải có ít nhất 6 ký tự"
  }),
  confirm_password: z.string().min(6, {
    message: "Xác nhận mật khẩu phải có ít nhất 6 ký tự"
  }),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Mật khẩu mới không khớp với xác nhận mật khẩu",
  path: ["confirm_password"],
});

type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const { user, clearPasswordChangeRequirement } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  
  // Tạo form
  const form = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: ""
    }
  });
  
  // Mutation đổi mật khẩu
  const changePasswordMutation = useMutation({
    mutationFn: async (data: Omit<ChangePasswordData, "confirm_password">) => {
      const { confirm_password, ...passwordData } = data as any;
      const res = await apiRequest("POST", "/api/auth/change-password", {
        old_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      return await res.json();
    },
    onSuccess: (response) => {
      // Xóa flag đổi mật khẩu nếu thành công
      clearPasswordChangeRequirement();
      
      // Lấy token mới nếu server trả về
      if (response?.data?.token) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem("auth_token", response.data.token);
        }
      }
      
      // Tải lại thông tin người dùng
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      toast({
        title: "Đổi mật khẩu thành công",
        description: "Mật khẩu của bạn đã được cập nhật, bạn sẽ được chuyển hướng đến trang chính.",
      });
      
      // Chuyển hướng về trang chọn vai trò sau khi đổi mật khẩu
      setTimeout(() => {
        try {
          // Đánh dấu không còn yêu cầu đổi mật khẩu
          clearPasswordChangeRequirement();
          
          // Xóa chế độ đã chọn trước đó (nếu có) sau khi đổi mật khẩu
          if (typeof window !== 'undefined') {
            localStorage.removeItem("selected_mode");
          }
          
          console.log("Change password success: redirecting to select-mode page");
          
          // Chuyển hướng đến trang chọn chế độ thay vì dashboard cụ thể
          window.location.href = "/select-mode";
        } catch (error) {
          console.error("Error during redirect:", error);
          // Fallback nếu có lỗi
          window.location.href = "/";
        }
      }, 2000);
    },
    onError: (error: Error) => {
      setError(error.message || "Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại.");
      toast({
        title: "Đổi mật khẩu thất bại",
        description: error.message || "Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại.",
        variant: "destructive"
      });
    }
  });
  
  // Xử lý submit form
  const onSubmit = (data: ChangePasswordData) => {
    setError(null);
    const { confirm_password, ...passwordData } = data;
    changePasswordMutation.mutate(passwordData);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Đổi mật khẩu</CardTitle>
            <CardDescription>
              {user?.is_first_login 
                ? "Đây là lần đăng nhập đầu tiên của bạn. Vui lòng đổi mật khẩu để tiếp tục sử dụng hệ thống." 
                : "Cập nhật mật khẩu tài khoản của bạn"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="current_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu hiện tại</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Nhập mật khẩu hiện tại" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="new_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu mới</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Nhập mật khẩu mới" {...field} />
                      </FormControl>
                      <FormDescription>
                        Mật khẩu cần có ít nhất 6 ký tự
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Xác nhận mật khẩu</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Nhập lại mật khẩu mới" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    "Đổi mật khẩu"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center pt-0">
            <p className="text-sm text-muted-foreground">
              Nếu đây là lần đầu tiên đăng nhập, bạn sẽ phải đổi mật khẩu để tiếp tục.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}