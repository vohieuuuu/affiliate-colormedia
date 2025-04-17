import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Định nghĩa schema validation cho form đăng nhập
const loginSchema = z.object({
  username: z.string().min(3, {
    message: "Tên đăng nhập phải có ít nhất 3 ký tự"
  }),
  password: z.string().min(6, {
    message: "Mật khẩu phải có ít nhất 6 ký tự"
  })
});

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, loginMutation } = useAuth();
  
  // Tạo form đăng nhập
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });
  
  // Nếu người dùng đã đăng nhập, chuyển hướng đến trang chủ
  if (user) {
    setLocation("/");
    return null;
  }
  
  // Xử lý đăng nhập
  const handleLogin = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };
  
  return (
    <div className="flex min-h-screen">
      {/* Cột trái: Giao diện đăng nhập */}
      <div className="flex items-center justify-center w-full lg:w-1/2 px-6 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-500 to-cyan-600 bg-clip-text text-transparent">
              ColorMedia Affiliate
            </h1>
            <p className="text-muted-foreground mt-2">
              Đăng nhập để quản lý dữ liệu affiliate của bạn
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Đăng nhập</CardTitle>
              <CardDescription>
                Nhập thông tin đăng nhập để truy cập vào hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên đăng nhập</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập email hoặc tên đăng nhập" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Nhập mật khẩu" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang đăng nhập...
                      </>
                    ) : (
                      "Đăng nhập"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col items-center space-y-2">
              <div className="text-sm text-muted-foreground">
                Chưa có tài khoản? Vui lòng liên hệ với quản trị viên để được cấp tài khoản.
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Cột phải: Giới thiệu */}
      <div className="hidden lg:flex flex-col items-center justify-center w-1/2 px-12 bg-gradient-to-br from-primary/5 to-primary/20">
        <div className="max-w-xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-primary mb-6">
            Hệ thống quản lý Affiliate ColorMedia
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Quản lý hoa hồng, theo dõi khách hàng đã giới thiệu và tiến độ hợp đồng một cách minh bạch, chi tiết. 
            Tất cả thông tin được cập nhật theo thời gian thực giúp bạn nắm bắt cơ hội kinh doanh tốt nhất.
          </p>
          <div className="grid grid-cols-2 gap-6 text-left">
            <div className="rounded-lg p-4 bg-background/70 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Theo dõi hoa hồng</h3>
              <p className="text-muted-foreground">Theo dõi hoa hồng từ các hợp đồng đã ký kết một cách minh bạch</p>
            </div>
            <div className="rounded-lg p-4 bg-background/70 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Quản lý khách hàng</h3>
              <p className="text-muted-foreground">Quản lý danh sách khách hàng tiềm năng và theo dõi tiến độ hợp đồng</p>
            </div>
            <div className="rounded-lg p-4 bg-background/70 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Rút tiền hoa hồng</h3>
              <p className="text-muted-foreground">Dễ dàng tạo yêu cầu rút tiền hoa hồng và theo dõi trạng thái</p>
            </div>
            <div className="rounded-lg p-4 bg-background/70 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Bảng xếp hạng</h3>
              <p className="text-muted-foreground">Xếp hạng affiliate dựa trên hiệu suất và doanh số</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}