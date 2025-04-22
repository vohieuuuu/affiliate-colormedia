import { ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import KolHeader from "@/components/kol-dashboard/KolHeader";
import { 
  Users, 
  DollarSign, 
  BarChart3, 
  Home,
  LayoutDashboard
} from "lucide-react";

interface KolDashboardLayoutProps {
  children: ReactNode;
}

export default function KolDashboardLayout({ children }: KolDashboardLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  
  // Kiểm tra quyền truy cập - chỉ cho phép KOL_VIP hoặc ADMIN
  useEffect(() => {
    const isKolVip = user?.role === "KOL_VIP";
    const isAdmin = user?.role === "ADMIN";
    
    if (user && !isKolVip && !isAdmin) {
      console.log("KolDashboard: User doesn't have KOL_VIP role, redirecting to /unauthorized");
      // Chuyển hướng đến trang unauthorized
      window.location.href = "/unauthorized";
    }
  }, [user]);

  // Danh sách menu cho KOL dashboard
  const navItems = [
    { 
      name: "Trang chủ", 
      path: "/kol-dashboard", 
      icon: <Home className="h-5 w-5" /> 
    },
    { 
      name: "Danh bạ", 
      path: "/kol-dashboard/contacts", 
      icon: <Users className="h-5 w-5" /> 
    },
    { 
      name: "Tài chính", 
      path: "/kol-dashboard/finance", 
      icon: <BarChart3 className="h-5 w-5" /> 
    },
    { 
      name: "Rút tiền", 
      path: "/kol-dashboard/withdrawal", 
      icon: <DollarSign className="h-5 w-5" /> 
    },
    { 
      name: "KPI", 
      path: "/kol-dashboard/kpi", 
      icon: <LayoutDashboard className="h-5 w-5" /> 
    }
  ];
  
  const isActive = (path: string) => {
    if (path === "/kol-dashboard") {
      return location === path;
    }
    return location.startsWith(path);
  };

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <KolHeader />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-64 shrink-0">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  href={item.path}
                >
                  <a className={`flex items-center px-4 py-3 rounded-md text-sm font-medium ${
                    isActive(item.path) 
                      ? 'bg-[#07ADB8] text-white' 
                      : 'bg-white hover:bg-gray-100 text-gray-700'
                  }`}>
                    <span className="mr-3">
                      {item.icon}
                    </span>
                    {item.name}
                  </a>
                </Link>
              ))}
            </nav>
          </aside>
          
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}