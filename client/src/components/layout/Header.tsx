import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, User, BarChart3, LogOut, Book, FileText } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  fullName?: string;
  affiliateId?: string;
}

export default function Header({ fullName, affiliateId }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { logoutMutation, user } = useAuth();
  
  // Ưu tiên sử dụng full_name từ prop, nếu không có thì lấy từ user context
  const displayName = fullName || user?.full_name || user?.username || "Affiliate User";
  const [mounted, setMounted] = useState(false);
  
  // After mounting, we have access to the theme
  useEffect(() => setMounted(true), []);
  
  return (
    <header className="bg-gradient-to-r from-[#07ADB8] to-[#05868f] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <div className="flex items-center cursor-pointer">
                  <div className="bg-white p-1.5 rounded-md">
                    <BarChart3 className="h-7 w-7 text-[#07ADB8]" />
                  </div>
                  <span className="text-white font-bold text-xl ml-3 tracking-tight">
                    ColorMedia <span className="text-[#FFC919]">Affiliate</span>
                  </span>
                </div>
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="bg-white/10 text-white hover:bg-white/20 hidden md:flex"
                >
                  <Book className="h-4 w-4 mr-2" />
                  <span>Thông tin</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/affiliate-policy" className="flex items-center w-full cursor-pointer">
                    <Book className="h-4 w-4 mr-2" />
                    <span>Chính sách Affiliate</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <a 
                    href="https://colormedia.sg.larksuite.com/wiki/LQxvwbgBjixFpfkGeUolFnMjgnb" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    <span>Hướng dẫn đăng ký</span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="bg-white/10 text-white hover:bg-white/20"
              >
                {theme === "dark" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>
            )}
            
            <div className="relative">
              <div className="flex items-center bg-white/10 rounded-full pl-2 pr-4 py-2">
                <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div className="ml-3">
                  <span className="text-sm font-medium text-white block">
                    {displayName}
                  </span>
                  <span className="text-xs text-white/80">
                    ID: {affiliateId || "---"}
                  </span>
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="bg-white/10 text-white hover:bg-white/20"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              title="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
