import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function KolHeader() {
  const { logoutMutation, user } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Đăng xuất thành công",
          description: "Bạn đã đăng xuất khỏi hệ thống",
        });
        setLocation("/auth");
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Lỗi đăng xuất",
          description: error.message || "Đã có lỗi xảy ra khi đăng xuất",
        });
      },
    });
  };

  return (
    <header className="bg-gradient-to-r from-[#07ADB8]/10 to-[#FFC919]/5 border-b sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center py-3">
        <Link href="/">
          <a className="flex items-center gap-2">
            <img src="/logo-color.png" alt="ColorMedia" className="h-8" />
            <span className="text-lg font-bold bg-gradient-to-r from-[#07ADB8] to-[#FFC919] bg-clip-text text-transparent">KOL/VIP Dashboard</span>
          </a>
        </Link>
        
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/kol-dashboard">
              <a className="text-sm font-medium hover:text-[#07ADB8] transition-colors">Tổng quan</a>
            </Link>
            <Link href="/kol-dashboard/withdrawal">
              <a className="text-sm font-medium hover:text-[#07ADB8] transition-colors">Rút tiền</a>
            </Link>
          </nav>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 border-[#07ADB8] hover:bg-[#07ADB8]/10 text-[#07ADB8]">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline-block">{user?.username}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Tài khoản của bạn</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/change-password">
                  <a className="w-full cursor-pointer">Đổi mật khẩu</a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                {logoutMutation.isPending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-destructive" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang đăng xuất...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <LogOut className="mr-2 h-4 w-4" />
                    Đăng xuất
                  </span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}