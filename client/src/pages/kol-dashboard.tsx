import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  UserCircle, 
  PlusCircle,
  Building, 
  UserCheck,
  Calendar,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  Camera,
  ListFilter,
  Wallet,
  DollarSign,
  LineChart,
  ArrowUp,
  ArrowDown,
  Construction,
  AlertTriangle
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import KolContactsTable from "@/components/kol-vip/kol-contacts-table";
import KpiProgressCard from "@/components/kol-vip/kpi-progress-card";
import KolHeader from "@/components/kol-vip/kol-header";
import KolFooter from "@/components/kol-vip/kol-footer";
import KolVideosSection from "@/components/kol-vip/kol-videos-section";
import KolSalesMaterials from "@/components/kol-vip/kol-sales-materials";
import TransactionHistoryComponent from "@/components/kol-vip/transaction-history";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import AddContactModal from "@/components/kol-vip/add-contact-modal";
import ScanCardModal from "@/components/kol-vip/scan-card-modal";
import { KolVipAffiliate, KolContact, MonthlyKpi, KolVipLevel, KolVipLevelType } from "@shared/schema";

// Hàm kiểm tra xem có đang ở môi trường production hay không
const isProduction = () => {
  // Kiểm tra URL có phải là URL sản xuất không
  return typeof window !== 'undefined' && window.location.hostname.endsWith('.replit.app');
};

const KolDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("contacts");
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showScanCardModal, setShowScanCardModal] = useState(false);
  const [extractedContactData, setExtractedContactData] = useState(null);
  
  // Thêm log để kiểm tra chi tiết user
  console.log("KolDashboard - User info:", {
    user,
    role: user?.role,
    normalizedRole: user?.role ? String(user.role).toUpperCase() : 'unknown'
  });
  
  // Nếu đang ở môi trường production và đang ở tab "finance", hiển thị thông báo "Đang phát triển"
  if (isProduction() && activeTab === "finance") {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Construction className="h-6 w-6 text-yellow-500" />
              Tính năng đang phát triển
            </CardTitle>
            <CardDescription>
              Chức năng quản lý tài chính và rút tiền cho KOL/VIP hiện đang trong quá trình phát triển
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Thông báo quan trọng</AlertTitle>
              <AlertDescription>
                Tính năng tài chính và rút tiền cho KOL/VIP đang được phát triển và sẽ sớm được triển khai. 
                Vui lòng quay lại sau để sử dụng tính năng này.
              </AlertDescription>
            </Alert>
            <p className="mt-2 text-muted-foreground">
              Cảm ơn bạn đã kiên nhẫn chờ đợi. Chúng tôi đang nỗ lực để mang đến trải nghiệm tốt nhất cho bạn.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Kiểm tra quyền truy cập - chỉ cho phép KOL_VIP hoặc ADMIN
  useEffect(() => {
    const isKolVip = user?.isKolVip || false;
    const isAdmin = user?.isAdmin || false;
    
    if (user && !isKolVip && !isAdmin) {
      console.log("KolDashboard: User doesn't have KOL_VIP role, redirecting to /unauthorized");
      // Chuyển hướng đến trang unauthorized
      window.location.href = "/unauthorized";
    }
  }, [user]);
  
  // Đã sử dụng RoleBasedRoute để xử lý chuyển hướng dựa trên vai trò

  // Lấy thông tin KOL hiện tại
  const {
    data: kolInfoResponse,
    isLoading: isLoadingKolInfo,
    error: kolInfoError,
  } = useQuery({
    queryKey: ["/api/kol/me"],
    queryFn: async () => {
      try {
        console.log("Fetching KOL data from /api/kol/me");
        const response = await apiRequest("GET", "/api/kol/me");
        const data = await response.json();
        console.log("Received KOL data:", data);
        return data;
      } catch (error) {
        console.error("Error fetching KOL data:", error);
        // Nếu API /api/kol/me lỗi, thử lấy dữ liệu từ /api/affiliate
        console.log("Fallback: Fetching affiliate data for KOL");
        const affiliateResponse = await apiRequest("GET", "/api/affiliate");
        const affiliateData = await affiliateResponse.json();
        console.log("Received affiliate data for KOL:", affiliateData);
        return { status: "success", data: affiliateData };
      }
    },
    enabled: !!(user), // Bật cho mọi người dùng đã đăng nhập
  });
  
  // Xử lý dữ liệu KOL từ response
  const kolInfo = kolInfoResponse?.status === "success" ? kolInfoResponse.data : kolInfoResponse;

  // Lấy danh sách liên hệ của KOL - sử dụng affiliate_id thay vì id
  const {
    data: contacts,
    isLoading: isLoadingContacts,
    error: contactsError,
  } = useQuery({
    queryKey: ["/api/kol", kolInfo?.affiliate_id, "contacts"],
    queryFn: async () => {
      try {
        console.log("Fetching contacts for KOL with affiliate_id:", kolInfo?.affiliate_id);
        const response = await apiRequest("GET", `/api/kol/${kolInfo?.affiliate_id}/contacts`);
        const data = await response.json();
        console.log("Received contacts data:", data);
        if (data.status === "success") {
          return data.data;
        }
        return data;
      } catch (error) {
        console.error("Error fetching KOL contacts:", error);
        return [];
      }
    },
    enabled: !!kolInfo?.affiliate_id,
  });

  // Lấy thông tin KPI stats - sử dụng affiliate_id thay vì id
  const {
    data: kpiStats,
    isLoading: isLoadingKpiStats,
    error: kpiStatsError,
  } = useQuery({
    queryKey: ["/api/kol", kolInfo?.affiliate_id, "kpi-stats"],
    queryFn: async () => {
      try {
        console.log("Fetching KPI stats for KOL with affiliate_id:", kolInfo?.affiliate_id);
        
        // Kiểm tra affiliate_id tồn tại để đảm bảo có thể lấy dữ liệu
        if (!kolInfo?.affiliate_id) {
          console.error("Missing affiliate_id for KOL when fetching KPI stats");
          throw new Error("Không tìm thấy ID của KOL/VIP để tải thông tin KPI");
        }
        
        const response = await apiRequest("GET", `/api/kol/${kolInfo.affiliate_id}/kpi-stats`);
        const data = await response.json();
        console.log("Received KPI stats:", data);
        if (data.status === "success") {
          return data.data;
        }
        return data;
      } catch (error) {
        console.error("Error fetching KOL KPI stats:", error);
        return { current_month: {}, previous_months: [] };
      }
    },
    enabled: !!kolInfo?.affiliate_id && activeTab === "kpi",
  });
  
  // Lấy dữ liệu tổng quan tài chính
  const {
    data: financialSummary,
    isLoading: isLoadingFinancialSummary,
    error: financialSummaryError,
  } = useQuery({
    queryKey: ["/api/kol", kolInfo?.affiliate_id, "financial-summary"],
    queryFn: async () => {
      try {
        console.log("Fetching financial summary for KOL with affiliate_id:", kolInfo?.affiliate_id);
        
        // Kiểm tra affiliate_id tồn tại để đảm bảo có thể lấy dữ liệu
        if (!kolInfo?.affiliate_id) {
          console.error("Missing affiliate_id for KOL when fetching financial summary");
          throw new Error("Không tìm thấy ID của KOL/VIP để tải thông tin tài chính");
        }
        
        const period = "month"; // Mặc định tính giai đoạn 30 ngày gần nhất
        const response = await apiRequest("GET", `/api/kol/${kolInfo.affiliate_id}/financial-summary?period=${period}`);
        const data = await response.json();
        console.log("Received financial summary:", data);
        if (data.status === "success") {
          return data.data;
        }
        return data;
      } catch (error) {
        console.error("Error fetching financial summary:", error);
        return { 
          currentBalance: 0,
          totalIncome: 0,
          totalExpense: 0,
          netProfit: 0,
          incomeSources: { salary: 0, commission: 0, bonus: 0, other: 0 },
          expenseSources: { withdrawal: 0, tax: 0, other: 0 }
        };
      }
    },
    enabled: !!kolInfo?.affiliate_id && activeTab === "finance",
  });

  // Mutation thêm liên hệ mới - sử dụng affiliate_id
  const addContactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      console.log("Adding contact for KOL with affiliate_id:", kolInfo?.affiliate_id);
      const response = await apiRequest(
        "POST",
        `/api/kol/${kolInfo?.affiliate_id}/contacts`,
        contactData
      );
      return await response.json();
    },
    onSuccess: () => {
      setShowAddContactModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.affiliate_id, "contacts"] });
      toast({
        title: "Thành công",
        description: "Đã thêm liên hệ mới vào danh sách",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Thất bại",
        description: error.message || "Đã xảy ra lỗi khi thêm liên hệ mới",
        variant: "destructive",
      });
    },
  });

  // Mutation cập nhật trạng thái liên hệ - sử dụng affiliate_id
  const updateContactMutation = useMutation({
    mutationFn: async ({ contactId, data }: { contactId: number; data: Partial<KolContact> }) => {
      console.log("Updating contact for KOL with affiliate_id:", kolInfo?.affiliate_id);
      const response = await apiRequest(
        "PUT",
        `/api/kol/${kolInfo?.affiliate_id}/contacts/${contactId}`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.affiliate_id, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.affiliate_id, "kpi-stats"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin liên hệ",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Thất bại",
        description: error.message || "Đã xảy ra lỗi khi cập nhật liên hệ",
        variant: "destructive",
      });
    },
  });

  // Mutation thêm hợp đồng - sử dụng affiliate_id
  const addContractMutation = useMutation({
    mutationFn: async ({ contactId, data }: { contactId: number; data: any }) => {
      console.log("Adding contract for KOL with affiliate_id:", kolInfo?.affiliate_id);
      const response = await apiRequest(
        "POST",
        `/api/kol/${kolInfo?.affiliate_id}/contacts/${contactId}/contract`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.affiliate_id, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.affiliate_id, "kpi-stats"] });
      toast({
        title: "Thành công",
        description: "Đã thêm hợp đồng cho liên hệ",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Thất bại",
        description: error.message || "Đã xảy ra lỗi khi thêm hợp đồng",
        variant: "destructive",
      });
    },
  });

  // Mutation xử lý ảnh card visit - sử dụng affiliate_id
  const processCardImageMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Processing card for KOL with affiliate_id:", kolInfo?.affiliate_id);
      const response = await apiRequest(
        "POST",
        `/api/kol/${kolInfo?.affiliate_id}/scan-card`,
        data
      );
      return await response.json();
    },
    onSuccess: (data) => {
      // Nếu có contact đã được tạo trực tiếp, cập nhật danh sách liên hệ
      if (data?.data?.contact) {
        setShowScanCardModal(false);
        queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.affiliate_id, "contacts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.affiliate_id, "kpi-stats"] });
        toast({
          title: "Thành công",
          description: "Đã thêm liên hệ mới từ card visit",
        });
      } 
      // Nếu chỉ có ảnh, hiển thị dữ liệu trong modal scan card để xác nhận
      else if (data?.data?.contact_data) {
        // Lưu dữ liệu đã trích xuất vào state để hiển thị trong modal hiện tại
        setExtractedContactData(data.data.contact_data);
        toast({
          title: "Đã tải lên ảnh",
          description: "Vui lòng điền thông tin từ card visit",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Thất bại",
        description: error.message || "Đã xảy ra lỗi khi xử lý ảnh card visit",
        variant: "destructive",
      });
    },
  });

  // State đã được khai báo ở trên

  // Xử lý thêm liên hệ - sử dụng affiliate_id thay vì id
  const handleAddContact = (contactData: any) => {
    if (kolInfo?.affiliate_id) {
      addContactMutation.mutate({
        ...contactData,
        kol_id: kolInfo.affiliate_id,
      });
    } else {
      console.error("Không thể thêm liên hệ: Thiếu affiliate_id");
      toast({
        title: "Lỗi",
        description: "Không thể thêm liên hệ do thiếu thông tin KOL",
        variant: "destructive",
      });
    }
  };

  // Xử lý cập nhật trạng thái liên hệ - sử dụng affiliate_id thay vì id
  const handleUpdateContact = (contactId: number, data: Partial<KolContact>) => {
    if (kolInfo?.affiliate_id) {
      updateContactMutation.mutate({
        contactId,
        data,
      });
    } else {
      console.error("Không thể cập nhật liên hệ: Thiếu affiliate_id");
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật liên hệ do thiếu thông tin KOL",
        variant: "destructive",
      });
    }
  };

  // Xử lý thêm hợp đồng - sử dụng affiliate_id thay vì id
  const handleAddContract = (contactId: number, data: { contractValue: number; note: string }) => {
    if (kolInfo?.affiliate_id) {
      addContractMutation.mutate({
        contactId,
        data,
      });
    } else {
      console.error("Không thể thêm hợp đồng: Thiếu affiliate_id");
      toast({
        title: "Lỗi",
        description: "Không thể thêm hợp đồng do thiếu thông tin KOL",
        variant: "destructive",
      });
    }
  };

  // Xử lý xử lý ảnh card visit - sử dụng affiliate_id thay vì id
  const handleProcessCardImage = (data: any) => {
    if (kolInfo?.affiliate_id) {
      processCardImageMutation.mutate(data);
    } else {
      console.error("Không thể xử lý ảnh card: Thiếu affiliate_id");
      toast({
        title: "Lỗi",
        description: "Không thể xử lý ảnh card do thiếu thông tin KOL",
        variant: "destructive",
      });
    }
  };

  // Tính số lượng liên hệ theo trạng thái
  const getContactsCountByStatus = (status: string) => {
    if (!contacts) return 0;
    return contacts.filter((contact: {status: string}) => contact.status === status).length;
  };

  // Tính tổng giá trị hợp đồng
  const getTotalContractValue = () => {
    if (!contacts) return 0;
    return contacts.reduce((total: number, contact: {contract_value?: number}) => 
      total + (contact.contract_value || 0), 0);
  };

  // Kiểm tra nếu có lỗi
  if (kolInfoError && typeof kolInfoError === 'object' && 'message' in kolInfoError) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>
            {(kolInfoError as Error).message || "Không thể tải thông tin KOL/VIP. Vui lòng thử lại sau."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Hiển thị loading
  if (isLoadingKolInfo) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Đang tải thông tin...</p>
      </div>
    );
  }

  /* Đã gỡ bỏ check KOL/VIP tại đây vì đã được xử lý bởi RoleRouter */

  // Hiển thị thông báo nếu thông tin KOL chưa được tải
  if (!kolInfo) {
    return (
      <div className="p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Đang tải thông tin</AlertTitle>
          <AlertDescription>
            Thông tin KOL/VIP đang được tải. Nếu bạn vừa đổi mật khẩu, vui lòng đăng nhập lại để tiếp tục.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#07ADB8]/10 to-white min-h-screen flex flex-col">
      <KolHeader />
      <div className="p-6 max-w-7xl mx-auto flex-1">
        <div className="flex flex-col space-y-6">
          {/* Thông tin cá nhân KOL */}
          <Card className="border-0 shadow-lg overflow-hidden bg-white">
            <div className="absolute inset-0 bg-gradient-to-r from-[#07ADB8]/10 to-[#FFC919]/5" style={{ zIndex: 0 }}></div>
            <CardContent className="p-8 relative" style={{ zIndex: 10 }}>
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex gap-5 items-center">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#07ADB8] to-[#FFC919] text-white shadow-md">
                    <UserCircle className="h-10 w-10" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-[#07ADB8] to-[#FFC919] bg-clip-text text-transparent">{kolInfo.full_name}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      {kolInfo.level === "LEVEL_1" && (
                        <Badge className="bg-gradient-to-r from-[#07ADB8] to-[#07ADB8]/80 text-white border-0 px-3 py-1 text-sm shadow-sm">
                          KOL/VIP - Fresher
                        </Badge>
                      )}
                      {kolInfo.level === "LEVEL_2" && (
                        <Badge className="bg-gradient-to-r from-[#07ADB8] to-[#FFC919]/80 text-white border-0 px-3 py-1 text-sm shadow-sm">
                          KOL/VIP - Advanced
                        </Badge>
                      )}
                      {kolInfo.level === "LEVEL_3" && (
                        <Badge className="bg-gradient-to-r from-[#FFC919] to-[#FFC919]/80 text-white border-0 px-3 py-1 text-sm shadow-sm">
                          KOL/VIP - Elite
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground flex items-center">
                        <Mail className="h-3 w-3 mr-1 inline-block" />
                        {kolInfo.email}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-8 items-center bg-white/50 p-4 rounded-lg backdrop-blur-sm">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium flex items-center">
                      <UserCheck className="h-3 w-3 mr-1 inline-block" />
                      Liên hệ trong tháng
                    </p>
                    <p className="text-2xl font-bold">
                      {contacts ? contacts.length : 0}
                      <span className="text-sm font-normal text-muted-foreground ml-1">liên hệ</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium flex items-center">
                      <Building className="h-3 w-3 mr-1 inline-block" />
                      Hợp đồng đã ký
                    </p>
                    <p className="text-2xl font-bold">
                      {getContactsCountByStatus("Đã chốt hợp đồng")}
                      <span className="text-sm font-normal text-muted-foreground ml-1">hợp đồng</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium flex items-center">
                      <Calendar className="h-3 w-3 mr-1 inline-block" />
                      Tổng giá trị
                    </p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-[#07ADB8] to-[#FFC919] bg-clip-text text-transparent">
                      {formatCurrency(getTotalContractValue())}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs chính */}
          <Tabs defaultValue="contacts" value={activeTab} onValueChange={setActiveTab} className="relative" style={{ zIndex: 20 }}>
            <TabsList className="grid w-full md:w-[600px] grid-cols-3 bg-white/60 backdrop-blur-sm shadow-sm rounded-lg relative" style={{ zIndex: 20 }}>
              <TabsTrigger 
                value="contacts" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#07ADB8] data-[state=active]:to-[#FFC919] data-[state=active]:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
              >
                Danh sách liên hệ
              </TabsTrigger>
              <TabsTrigger 
                value="kpi" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#07ADB8] data-[state=active]:to-[#FFC919] data-[state=active]:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
              >
                Theo dõi KPI
              </TabsTrigger>
              <TabsTrigger 
                value="finance" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#07ADB8] data-[state=active]:to-[#FFC919] data-[state=active]:text-white pointer-events-auto"
                style={{ pointerEvents: 'auto' }}
              >
                <div className="flex items-center gap-1">
                  <Wallet className="h-4 w-4" />
                  <span>Tài chính</span>
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Tab Danh sách liên hệ */}
            <TabsContent value="contacts" className="space-y-4 mt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">Quản lý liên hệ</h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowScanCardModal(true)}
                    className="flex items-center gap-2 pointer-events-auto border-[#07ADB8] hover:bg-[#07ADB8]/10 text-[#07ADB8]"
                    style={{ pointerEvents: 'auto' }}
                    type="button"
                  >
                    <Camera className="h-4 w-4" />
                    Quét card visit
                  </Button>
                  <Button 
                    onClick={() => {
                      setExtractedContactData(null);
                      setShowAddContactModal(true);
                    }}
                    className="flex items-center gap-2 pointer-events-auto bg-gradient-to-r from-[#07ADB8] to-[#FFC919] hover:from-[#07ADB8]/90 hover:to-[#FFC919]/90"
                    style={{ pointerEvents: 'auto' }}
                    type="button"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Thêm liên hệ mới
                  </Button>
                </div>
              </div>

              {contactsError && typeof contactsError === 'object' && 'message' in contactsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Lỗi</AlertTitle>
                  <AlertDescription>
                    {(contactsError as Error).message || "Không thể tải danh sách liên hệ. Vui lòng thử lại sau."}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="col-span-1 shadow-md border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ListFilter className="h-4 w-4" />
                      Tổng quan liên hệ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Tổng số:</span>
                        <Badge variant="outline" className="font-medium">
                          {contacts ? contacts.length : 0}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Mới nhập:</span>
                        <Badge variant="outline" className="bg-gray-50 text-gray-600">
                          {getContactsCountByStatus("Mới nhập")}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Đang tư vấn:</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-600">
                          {getContactsCountByStatus("Đang tư vấn")}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Chờ phản hồi:</span>
                        <Badge variant="outline" className="bg-amber-50 text-amber-600">
                          {getContactsCountByStatus("Chờ phản hồi")}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Đã chốt hợp đồng:</span>
                        <Badge variant="outline" className="bg-green-50 text-green-600">
                          {getContactsCountByStatus("Đã chốt hợp đồng")}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Không tiềm năng:</span>
                        <Badge variant="outline" className="bg-red-50 text-red-600">
                          {getContactsCountByStatus("Không tiềm năng")}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-3 shadow-md border-0">
                  <CardContent className="p-6">
                    <KolContactsTable
                      contacts={contacts || []}
                      isLoading={isLoadingContacts}
                      onAddContact={() => {
                        setExtractedContactData(null);
                        setShowAddContactModal(true);
                      }}
                      onUpdateContact={handleUpdateContact}
                      onAddContract={handleAddContract}
                      kolId={kolInfo?.affiliate_id || ''}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab Theo dõi KPI */}
            <TabsContent value="kpi" className="space-y-6 mt-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Theo dõi KPI & Hiệu suất</h2>
              </div>

              {kpiStatsError && typeof kpiStatsError === 'object' && 'message' in kpiStatsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Lỗi</AlertTitle>
                  <AlertDescription>
                    {(kpiStatsError as Error).message || "Không thể tải thông tin KPI. Vui lòng thử lại sau."}
                  </AlertDescription>
                </Alert>
              )}

              {isLoadingKpiStats ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Tháng hiện tại</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Chuyển đổi dữ liệu từ API mới sang định dạng phù hợp với KpiProgressCard */}
                      <KpiProgressCard
                        level={kolInfo.level as KolVipLevelType}
                        monthlyKpi={kpiStats?.kpi ? {
                          // Tạo đối tượng tương thích với MonthlyKpi từ dữ liệu API
                          year: kpiStats.period?.year || new Date().getFullYear(),
                          month: kpiStats.period?.month || new Date().getMonth() + 1,
                          total_contacts: kpiStats.stats?.totalContacts || 0,
                          potential_contacts: kpiStats.stats?.potentialContacts || 0,
                          signed_contracts: kpiStats.stats?.contractsCount || 0,
                          total_revenue: kpiStats.stats?.contractValue || 0,
                          total_commission: kpiStats.stats?.commission || 0,
                          performance: kpiStats.kpi?.overall?.performance || "PENDING"
                        } : kpiStats?.current_month}
                        isCurrentMonth={true}
                      />
                      <Card className="md:col-span-2 shadow-md border-0">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Thông tin chi tiết</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Tháng đánh giá</p>
                                <p className="font-medium flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {kpiStats?.period ? (
                                    `Tháng ${kpiStats.period.month}/${kpiStats.period.year}`
                                  ) : kpiStats?.current_month ? (
                                    `Tháng ${kpiStats.current_month.month}/${kpiStats.current_month.year}`
                                  ) : (
                                    "Chưa có dữ liệu"
                                  )}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Lương cơ bản</p>
                                <p className="font-medium bg-gradient-to-r from-[#07ADB8] to-[#FFC919] bg-clip-text text-transparent">
                                  {formatCurrency(
                                    kolInfo.level === "LEVEL_1" 
                                      ? 5000000 
                                      : kolInfo.level === "LEVEL_2" 
                                        ? 10000000 
                                        : 15000000
                                  )}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Trạng thái</p>
                                <div>
                                  {(kpiStats?.kpi?.overall?.performance === "ACHIEVED" || kpiStats?.current_month?.performance === "ACHIEVED") ? (
                                    <Badge className="bg-gradient-to-r from-[#07ADB8] to-[#07ADB8]/80 text-white border-0">
                                      Đã đạt KPI
                                    </Badge>
                                  ) : (kpiStats?.kpi?.overall?.performance === "NOT_ACHIEVED" || kpiStats?.current_month?.performance === "NOT_ACHIEVED") ? (
                                    <Badge className="bg-gradient-to-r from-[#FFC919] to-[#FFC919]/80 text-white border-0">
                                      Chưa đạt KPI
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-gradient-to-r from-[#07ADB8]/60 to-[#FFC919]/60 text-white border-0">
                                      Đang tiến hành
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">Liên hệ mới trong tháng</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-2xl font-bold">
                                    {kpiStats?.stats?.totalContacts || kpiStats?.current_month?.total_contacts || 0}
                                  </p>
                                  <p className="text-sm text-muted-foreground">Tổng số liên hệ</p>
                                </div>
                                <div>
                                  <p className="text-2xl font-bold">
                                    {kpiStats?.stats?.potentialContacts || kpiStats?.current_month?.potential_contacts || 0}
                                  </p>
                                  <p className="text-sm text-muted-foreground">Liên hệ tiềm năng</p>
                                </div>
                                <div>
                                  <p className="text-2xl font-bold">
                                    {kpiStats?.stats?.contractsCount || kpiStats?.current_month?.contracts || 0}
                                  </p>
                                  <p className="text-sm text-muted-foreground">Hợp đồng đã ký</p>
                                </div>
                              </div>
                            </div>

                            {kpiStats?.current_month?.note && (
                              <>
                                <Separator />
                                <div className="space-y-2">
                                  <p className="text-sm text-muted-foreground">Ghi chú</p>
                                  <p className="text-sm">{kpiStats.current_month.note}</p>
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {kpiStats?.previous_months && kpiStats.previous_months.length > 0 && (
                    <div className="space-y-4 mt-8">
                      <h3 className="text-lg font-medium">Các tháng trước</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {kpiStats.previous_months.slice(0, 6).map((month: MonthlyKpi, index: number) => (
                          <KpiProgressCard
                            key={`${month.year}-${month.month}`}
                            level={kolInfo.level as KolVipLevelType}
                            monthlyKpi={month}
                            isCurrentMonth={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Tab Tài chính */}
            <TabsContent value="finance" className="space-y-6 mt-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Quản lý tài chính</h2>
              </div>

              {financialSummaryError && typeof financialSummaryError === 'object' && 'message' in financialSummaryError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Lỗi</AlertTitle>
                  <AlertDescription>
                    {(financialSummaryError as Error).message || "Không thể tải thông tin tài chính. Vui lòng thử lại sau."}
                  </AlertDescription>
                </Alert>
              )}

              {isLoadingFinancialSummary ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Tổng quan tài chính */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="md:col-span-1 shadow-md border-0 bg-gradient-to-br from-[#07ADB8]/10 to-white">
                      <CardHeader className="pb-2 px-3 sm:px-6">
                        <CardTitle className="text-lg sm:text-xl flex items-center gap-1 sm:gap-2">
                          <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-[#07ADB8]" />
                          Số dư hiện tại
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 sm:px-6">
                        <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#07ADB8] to-[#FFC919] bg-clip-text text-transparent">
                          {formatCurrency(financialSummary?.currentBalance || kolInfo?.balance || 0)}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2">Số dư khả dụng để rút</p>
                      </CardContent>
                    </Card>

                    <Card className="md:col-span-3 shadow-md border-0">
                      <CardHeader className="pb-2 px-3 sm:px-6">
                        <CardTitle className="text-base sm:text-lg">Thống kê tài chính</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 sm:px-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                          <div className="space-y-1 sm:space-y-2">
                            <p className="text-xs sm:text-sm text-muted-foreground">Tổng thu nhập tháng này</p>
                            <p className="text-xl sm:text-2xl font-semibold text-green-600">
                              {formatCurrency(financialSummary?.totalIncome || 0)}
                            </p>
                            <div className="flex items-center text-xs sm:text-sm">
                              <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
                              <span className="line-clamp-2">Bao gồm lương cơ bản và hoa hồng</span>
                            </div>
                          </div>

                          <div className="space-y-1 sm:space-y-2">
                            <p className="text-xs sm:text-sm text-muted-foreground">Đã rút trong tháng</p>
                            <p className="text-xl sm:text-2xl font-semibold text-amber-600">
                              {formatCurrency(financialSummary?.totalExpense || 0)}
                            </p>
                            <div className="flex items-center text-xs sm:text-sm">
                              <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 mr-1" />
                              <span className="line-clamp-2">Bao gồm thuế thu nhập</span>
                            </div>
                          </div>

                          <div className="space-y-1 sm:space-y-2">
                            <p className="text-xs sm:text-sm text-muted-foreground">Lợi nhuận ròng</p>
                            <p className="text-xl sm:text-2xl font-semibold text-blue-600">
                              {formatCurrency(financialSummary?.netProfit || 0)}
                            </p>
                            <div className="flex items-center text-xs sm:text-sm">
                              <LineChart className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 mr-1" />
                              <span className="line-clamp-2">Thu nhập sau chi phí</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Lịch sử giao dịch */}
                  <div className="mt-6">
                    <TransactionHistoryComponent 
                      kolId={kolInfo?.affiliate_id || ''} 
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal thêm liên hệ mới - Loại bỏ điều kiện && để hiển thị mọi lúc */}
        <AddContactModal
          isOpen={showAddContactModal}
          onClose={() => setShowAddContactModal(false)}
          onSubmit={handleAddContact}
          kolId={kolInfo?.affiliate_id || ''}
          initialData={extractedContactData || undefined}
        />

        {/* Modal quét card visit - Loại bỏ điều kiện && để hiển thị mọi lúc */}
        <ScanCardModal
          isOpen={showScanCardModal}
          onClose={() => setShowScanCardModal(false)}
          onSubmit={handleProcessCardImage}
          kolId={kolInfo?.affiliate_id || ''}
        />
        {/* Thêm các thành phần video và tài liệu bán hàng */}
        <KolVideosSection />
        <KolSalesMaterials />
      </div>
      <KolFooter />
    </div>
  );
};

export default KolDashboard;