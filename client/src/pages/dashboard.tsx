import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import DashboardInfoBar from "@/components/affiliate-dashboard/DashboardInfoBar";
import StatisticsGrid from "@/components/affiliate-dashboard/StatisticsGrid";
import StatisticsByPeriod from "@/components/affiliate-dashboard/StatisticsByPeriod";
import LeaderboardSection from "@/components/affiliate-dashboard/LeaderboardSection";
import ReferredCustomersSection from "@/components/affiliate-dashboard/ReferredCustomersSection";
import FilterableCustomersSection from "@/components/affiliate-dashboard/FilterableCustomersSection";
import WithdrawalHistorySection from "@/components/affiliate-dashboard/WithdrawalHistorySection";
import VideosSection from "@/components/affiliate-dashboard/VideosSection";
import TimelineModal from "@/components/affiliate-dashboard/TimelineModal";
import WithdrawalModal from "@/components/affiliate-dashboard/WithdrawalModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReferredCustomer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ReferredCustomer | null>(null);
  
  // Đảm bảo người dùng KOL/VIP không thể xem trang Dashboard thông thường
  // Chức năng này đã được thay thế bởi RoleRouter, nên có thể bỏ qua
  // RoleRouter sẽ quyết định hiển thị Dashboard hay KolDashboard
  useEffect(() => {
    if (user && user.role === "ADMIN") {
      console.log("Dashboard: User is ADMIN, no need to access affiliate dashboard");
      // Không chuyển hướng ở đây vì RoleRouter sẽ xử lý
    }
  }, [user]);

  // Fetch affiliate data với polling 15 giây để giảm tải cho backend
  const { data: apiAffiliateResponse, isLoading: isAffiliateLoading, error: affiliateError, refetch: refetchAffiliate } = useQuery({
    queryKey: ['/api/affiliate'],
    refetchInterval: 15000, // Polling mỗi 15 giây để giảm tải cho BE
    staleTime: 5000, // Đặt staleTime 5 giây để vẫn có thể invalidate nhưng giảm số lượng requests
    refetchOnMount: "always", // Luôn refetch khi component được mount (quan trọng sau khi rút tiền)
    enabled: !!(user && user.role !== "KOL_VIP"), // Chỉ lấy dữ liệu nếu user đã load và không phải là KOL/VIP
    refetchOnWindowFocus: true, // Refetch khi cửa sổ được focus
  });
  
  // Extract affiliate data from response
  const affiliateData = apiAffiliateResponse && typeof apiAffiliateResponse === 'object' && 'status' in apiAffiliateResponse && apiAffiliateResponse.status === "success" 
    ? (apiAffiliateResponse as any).data 
    : undefined;

  // Fetch top affiliates với caching dài hơn (ít thay đổi)
  const { data: apiTopAffiliatesResponse, isLoading: isTopAffiliatesLoading, error: topAffiliatesError } = useQuery({
    queryKey: ['/api/affiliates/top'],
    staleTime: 5 * 60 * 1000, // 5 phút, vì top affiliates ít thay đổi
    refetchInterval: 5 * 60 * 1000, // Refresh mỗi 5 phút
  });
  
  // Extract top affiliates data from response
  const topAffiliates = apiTopAffiliatesResponse && typeof apiTopAffiliatesResponse === 'object' && 'status' in apiTopAffiliatesResponse && apiTopAffiliatesResponse.status === "success" 
    ? (apiTopAffiliatesResponse as any).data 
    : [];

  // Handle timeline view click
  const handleViewTimeline = (customer: ReferredCustomer) => {
    setSelectedCustomer(customer);
    setIsTimelineModalOpen(true);
  };

  // Handle withdrawal request modal
  const handleWithdrawalRequest = () => {
    setIsWithdrawalModalOpen(true);
  };

  // Handle success notification for withdrawal request
  const handleWithdrawalSuccess = () => {
    toast({
      title: "Thành công!",
      description: "Yêu cầu rút tiền của bạn đã được gửi thành công.",
      variant: "default",
    });
    setIsWithdrawalModalOpen(false);
  };

  // Kiểm tra vai trò để điều hướng theo yêu cầu
  if (user?.role && String(user.role).toUpperCase().includes("KOL")) {
    console.log("Dashboard rendering KOL/VIP redirect message");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Đang chuyển hướng...</h1>
          <p className="text-gray-600">Bạn là thành viên KOL/VIP. Đang chuyển đến trang KOL Dashboard.</p>
          <button 
            onClick={() => window.location.href = "/kol-dashboard"}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Đi đến KOL Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  // Hiển thị thông báo đặc biệt cho ADMIN
  if (user?.role === "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-primary mb-4">Trang quản trị Admin</h1>
          <p className="text-gray-700 mb-6">
            Bạn đã đăng nhập với tài khoản Admin. 
            Để truy cập dashboard thông thường, vui lòng đăng nhập với tài khoản affiliate.
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
  }

  // Hiển thị lỗi nếu không phải là KOL/VIP hoặc ADMIN và có lỗi khi tải dữ liệu
  if (affiliateError && user?.role !== "KOL_VIP" && user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Lỗi tải dữ liệu</h1>
          <p className="text-gray-600">{(affiliateError as Error).message}</p>
          <p className="mt-2 text-sm text-gray-500">Bạn đang đăng nhập với vai trò: {user?.role}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        fullName={affiliateData?.full_name} 
        affiliateId={affiliateData?.affiliate_id}
      />
      
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAffiliateLoading ? (
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        ) : (
          <>
            <DashboardInfoBar 
              affiliate={affiliateData} 
              onWithdrawalRequest={handleWithdrawalRequest} 
            />
            
            <Tabs defaultValue="overall" className="mt-8">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="overall">Tổng quan</TabsTrigger>
                <TabsTrigger value="by-period">Theo thời gian</TabsTrigger>
              </TabsList>
              <TabsContent value="overall" className="mt-4 space-y-6">
                <StatisticsGrid affiliate={affiliateData} />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                  <LeaderboardSection 
                    topAffiliates={topAffiliates} 
                    isLoading={isTopAffiliatesLoading} 
                  />
                  
                  <div className="lg:col-span-2 space-y-8">
                    <ReferredCustomersSection 
                      referredCustomers={affiliateData?.referred_customers} 
                      onViewTimeline={handleViewTimeline} 
                    />
                    
                    <WithdrawalHistorySection 
                      withdrawalHistory={affiliateData?.withdrawal_history} 
                    />
                    
                    <VideosSection />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="by-period" className="mt-4 space-y-6">
                <StatisticsByPeriod defaultPeriod="month" />
                
                <div className="grid grid-cols-1 gap-8 mt-8">
                  <FilterableCustomersSection 
                    onViewTimeline={handleViewTimeline} 
                  />
                  
                  <WithdrawalHistorySection 
                    withdrawalHistory={affiliateData?.withdrawal_history} 
                  />
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      
      <Footer />
      
      {/* Modals */}
      {selectedCustomer && (
        <TimelineModal 
          isOpen={isTimelineModalOpen} 
          onClose={() => setIsTimelineModalOpen(false)}
          customer={selectedCustomer}
        />
      )}
      
      {affiliateData && (
        <WithdrawalModal 
          isOpen={isWithdrawalModalOpen}
          onClose={() => setIsWithdrawalModalOpen(false)}
          onSuccess={handleWithdrawalSuccess}
          affiliate={affiliateData}
        />
      )}
    </div>
  );
}
