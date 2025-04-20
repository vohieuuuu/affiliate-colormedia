import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ListFilter
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import KolContactsTable from "@/components/kol-vip/kol-contacts-table";
import KpiProgressCard from "@/components/kol-vip/kpi-progress-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import AddContactModal from "@/components/kol-vip/add-contact-modal";
import ScanCardModal from "@/components/kol-vip/scan-card-modal";
import { KolVipAffiliate, KolContact, MonthlyKpi, KolVipLevel, KolVipLevelType } from "@shared/schema";

const KolDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("contacts");
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showScanCardModal, setShowScanCardModal] = useState(false);
  
  // Đã sử dụng RoleBasedRoute để xử lý chuyển hướng dựa trên vai trò

  // Lấy thông tin KOL hiện tại
  const {
    data: kolInfo,
    isLoading: isLoadingKolInfo,
    error: kolInfoError,
  } = useQuery({
    queryKey: ["/api/kol/me"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/kol/me");
      return await response.json() as KolVipAffiliate;
    },
    enabled: !!(user && user.role === "KOL_VIP"), // Chỉ kích hoạt khi user đã tải và đúng là KOL/VIP
  });

  // Lấy danh sách liên hệ của KOL
  const {
    data: contacts,
    isLoading: isLoadingContacts,
    error: contactsError,
  } = useQuery({
    queryKey: ["/api/kol", kolInfo?.id, "contacts"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/kol/${kolInfo?.id}/contacts`);
      return await response.json() as KolContact[];
    },
    enabled: !!kolInfo?.id,
  });

  // Lấy thông tin KPI stats
  const {
    data: kpiStats,
    isLoading: isLoadingKpiStats,
    error: kpiStatsError,
  } = useQuery({
    queryKey: ["/api/kol", kolInfo?.id, "kpi-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/kol/${kolInfo?.id}/kpi-stats`);
      return await response.json();
    },
    enabled: !!kolInfo?.id && activeTab === "kpi",
  });

  // Mutation thêm liên hệ mới
  const addContactMutation = useMutation({
    mutationFn: async (contactData: any) => {
      const response = await apiRequest(
        "POST",
        `/api/kol/${kolInfo?.id}/contacts`,
        contactData
      );
      return await response.json();
    },
    onSuccess: () => {
      setShowAddContactModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.id, "contacts"] });
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

  // Mutation cập nhật trạng thái liên hệ
  const updateContactMutation = useMutation({
    mutationFn: async ({ contactId, data }: { contactId: number; data: Partial<KolContact> }) => {
      const response = await apiRequest(
        "PUT",
        `/api/kol/${kolInfo?.id}/contacts/${contactId}`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.id, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.id, "kpi-stats"] });
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

  // Mutation thêm hợp đồng
  const addContractMutation = useMutation({
    mutationFn: async ({ contactId, data }: { contactId: number; data: any }) => {
      const response = await apiRequest(
        "POST",
        `/api/kol/${kolInfo?.id}/contacts/${contactId}/contract`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.id, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.id, "kpi-stats"] });
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

  // Mutation xử lý ảnh card visit
  const processCardImageMutation = useMutation({
    mutationFn: async (data: { image_base64: string }) => {
      const response = await apiRequest(
        "POST",
        `/api/kol/${kolInfo?.id}/scan-card`,
        data
      );
      return await response.json();
    },
    onSuccess: (data) => {
      setShowScanCardModal(false);
      setExtractedContactData(data.contact_data);
      setShowAddContactModal(true);
      toast({
        title: "Thành công",
        description: "Đã trích xuất thông tin từ card visit",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Thất bại",
        description: error.message || "Đã xảy ra lỗi khi trích xuất thông tin từ card visit",
        variant: "destructive",
      });
    },
  });

  // State lưu dữ liệu trích xuất từ card visit
  const [extractedContactData, setExtractedContactData] = useState<Partial<KolContact> | null>(null);

  // Xử lý thêm liên hệ
  const handleAddContact = (contactData: any) => {
    if (kolInfo?.id) {
      addContactMutation.mutate({
        ...contactData,
        kol_id: typeof kolInfo.id === 'string' ? kolInfo.id : kolInfo.id.toString(),
      });
    }
  };

  // Xử lý cập nhật trạng thái liên hệ
  const handleUpdateContact = (contactId: number, data: Partial<KolContact>) => {
    if (kolInfo?.id) {
      updateContactMutation.mutate({
        contactId,
        data,
      });
    }
  };

  // Xử lý thêm hợp đồng
  const handleAddContract = (contactId: number, data: { contractValue: number; note: string }) => {
    if (kolInfo?.id) {
      addContractMutation.mutate({
        contactId,
        data,
      });
    }
  };

  // Xử lý xử lý ảnh card visit
  const handleProcessCardImage = (data: { image_base64: string }) => {
    if (kolInfo?.id) {
      processCardImageMutation.mutate(data);
    }
  };

  // Tính số lượng liên hệ theo trạng thái
  const getContactsCountByStatus = (status: string) => {
    if (!contacts) return 0;
    return contacts.filter(contact => contact.status === status).length;
  };

  // Tính tổng giá trị hợp đồng
  const getTotalContractValue = () => {
    if (!contacts) return 0;
    return contacts.reduce((total, contact) => total + (contact.contract_value || 0), 0);
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

  // Kiểm tra xem người dùng hiện tại có phải là KOL/VIP không
  useEffect(() => {
    if (user && user.role !== "KOL_VIP") {
      console.log("KolDashboard detected non-KOL user, redirecting to normal dashboard");
      window.location.href = "/";
    }
  }, [user]);

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
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col space-y-6">
          {/* Thông tin cá nhân KOL */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 z-0"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex gap-5 items-center">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-blue-500 text-white shadow-md">
                    <UserCircle className="h-10 w-10" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">{kolInfo.full_name}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      {kolInfo.level === "LEVEL_1" && (
                        <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 px-3 py-1 text-sm shadow-sm">
                          KOL/VIP - Fresher
                        </Badge>
                      )}
                      {kolInfo.level === "LEVEL_2" && (
                        <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 px-3 py-1 text-sm shadow-sm">
                          KOL/VIP - Advanced
                        </Badge>
                      )}
                      {kolInfo.level === "LEVEL_3" && (
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 px-3 py-1 text-sm shadow-sm">
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
                    <p className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      {formatCurrency(getTotalContractValue())}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs chính */}
          <Tabs defaultValue="contacts" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full md:w-[400px] grid-cols-2 bg-white/60 backdrop-blur-sm shadow-sm rounded-lg">
              <TabsTrigger 
                value="contacts" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/80 data-[state=active]:to-blue-500/80 data-[state=active]:text-white"
              >
                Danh sách liên hệ
              </TabsTrigger>
              <TabsTrigger 
                value="kpi" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/80 data-[state=active]:to-blue-500/80 data-[state=active]:text-white"
              >
                Theo dõi KPI
              </TabsTrigger>
            </TabsList>

            {/* Tab Danh sách liên hệ */}
            <TabsContent value="contacts" className="space-y-4 mt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">Quản lý liên hệ</h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setShowScanCardModal(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Quét card visit
                  </Button>
                  <Button 
                    onClick={() => {
                      setExtractedContactData(null);
                      setShowAddContactModal(true);
                    }}
                    className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
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
                      kolId={typeof kolInfo.id === 'string' ? kolInfo.id : kolInfo.id.toString()}
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
                      <KpiProgressCard
                        level={kolInfo.level as KolVipLevelType}
                        monthlyKpi={kpiStats?.current_month}
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
                                  {kpiStats?.current_month ? (
                                    `Tháng ${kpiStats.current_month.month}/${kpiStats.current_month.year}`
                                  ) : (
                                    "Chưa có dữ liệu"
                                  )}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Lương cơ bản</p>
                                <p className="font-medium bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
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
                                  {kpiStats?.current_month?.performance === "ACHIEVED" ? (
                                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
                                      Đã đạt KPI
                                    </Badge>
                                  ) : kpiStats?.current_month?.performance === "NOT_ACHIEVED" ? (
                                    <Badge className="bg-gradient-to-r from-red-500 to-pink-600 text-white border-0">
                                      Chưa đạt KPI
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0">
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
                                    {kpiStats?.current_month?.total_contacts || 0}
                                  </p>
                                  <p className="text-sm text-muted-foreground">Tổng số liên hệ</p>
                                </div>
                                <div>
                                  <p className="text-2xl font-bold">
                                    {kpiStats?.current_month?.potential_contacts || 0}
                                  </p>
                                  <p className="text-sm text-muted-foreground">Liên hệ tiềm năng</p>
                                </div>
                                <div>
                                  <p className="text-2xl font-bold">
                                    {kpiStats?.current_month?.contracts || 0}
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
          </Tabs>
        </div>

        {/* Modal thêm liên hệ mới */}
        {showAddContactModal && (
          <AddContactModal
            isOpen={showAddContactModal}
            onClose={() => setShowAddContactModal(false)}
            onSubmit={handleAddContact}
            kolId={typeof kolInfo.id === 'string' ? kolInfo.id : kolInfo.id.toString()}
            initialData={extractedContactData || undefined}
          />
        )}

        {/* Modal quét card visit */}
        {showScanCardModal && (
          <ScanCardModal
            isOpen={showScanCardModal}
            onClose={() => setShowScanCardModal(false)}
            onSubmit={handleProcessCardImage}
          />
        )}
      </div>
    </div>
  );
};

export default KolDashboard;