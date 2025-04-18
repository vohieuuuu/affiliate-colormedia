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
import { KolVipAffiliate, KolContact, MonthlyKpi, KolVipLevel } from "@shared/schema";

const KolDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("contacts");
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showScanCardModal, setShowScanCardModal] = useState(false);

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
    enabled: !!user,
  });

  // Lấy danh sách liên hệ
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

  // Lấy thống kê KPI
  const {
    data: kpiStats,
    isLoading: isLoadingKpiStats,
    error: kpiStatsError,
  } = useQuery({
    queryKey: ["/api/kol", kolInfo?.id, "kpi-stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/kol/${kolInfo?.id}/kpi-stats`);
      return await response.json() as {
        current_month: MonthlyKpi;
        previous_months: MonthlyKpi[];
      };
    },
    enabled: !!kolInfo?.id,
  });

  // Mutation thêm liên hệ mới
  const addContactMutation = useMutation({
    mutationFn: async (contactData: Omit<KolContact, "id" | "created_at">) => {
      const response = await apiRequest(
        "POST",
        `/api/kol/${kolInfo?.id}/contacts`,
        contactData
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thêm liên hệ thành công",
        description: "Liên hệ mới đã được thêm vào danh sách của bạn",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.id, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.id, "kpi-stats"] });
      setShowAddContactModal(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Không thể thêm liên hệ",
        description: error.message || "Đã xảy ra lỗi khi thêm liên hệ mới",
        variant: "destructive",
      });
    },
  });

  // Mutation cập nhật trạng thái liên hệ
  const updateContactMutation = useMutation({
    mutationFn: async ({ 
      contactId, 
      data 
    }: { 
      contactId: number; 
      data: Partial<KolContact> 
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/kol/${kolInfo?.id}/contacts/${contactId}`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cập nhật thành công",
        description: "Thông tin liên hệ đã được cập nhật",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.id, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.id, "kpi-stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Không thể cập nhật",
        description: error.message || "Đã xảy ra lỗi khi cập nhật liên hệ",
        variant: "destructive",
      });
    },
  });

  // Mutation thêm hợp đồng
  const addContractMutation = useMutation({
    mutationFn: async ({ 
      contactId, 
      data 
    }: { 
      contactId: number; 
      data: { contractValue: number; note: string } 
    }) => {
      const response = await apiRequest(
        "POST",
        `/api/kol/${kolInfo?.id}/contacts/${contactId}/contract`,
        data
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thêm hợp đồng thành công",
        description: "Hợp đồng đã được thêm và liên hệ đã được cập nhật trạng thái",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.id, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kol", kolInfo?.id, "kpi-stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Không thể thêm hợp đồng",
        description: error.message || "Đã xảy ra lỗi khi thêm hợp đồng",
        variant: "destructive",
      });
    },
  });

  // Mutation xử lý ảnh card visit
  const processCardImageMutation = useMutation({
    mutationFn: async (imageData: { image_base64: string }) => {
      const response = await apiRequest(
        "POST",
        `/api/kol/${kolInfo?.id}/scan-card`,
        imageData
      );
      return await response.json() as Partial<KolContact>;
    },
    onSuccess: (extractedData) => {
      toast({
        title: "Xử lý ảnh thành công",
        description: "Đã trích xuất thông tin từ card visit",
      });
      setShowScanCardModal(false);
      setShowAddContactModal(true); // Mở modal thêm liên hệ với dữ liệu đã trích xuất
      setExtractedContactData(extractedData);
    },
    onError: (error: Error) => {
      toast({
        title: "Không thể xử lý ảnh",
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
        kol_id: kolInfo.id,
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

  // Hiển thị thông báo nếu không phải là KOL/VIP
  if (!kolInfo) {
    return (
      <div className="p-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Không có quyền truy cập</AlertTitle>
          <AlertDescription>
            Bạn không phải là thành viên KOL/VIP của ColorMedia. Vui lòng liên hệ với quản trị viên để biết thêm thông tin.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col space-y-6">
        {/* Thông tin cá nhân KOL */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex gap-4 items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <UserCircle className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{kolInfo.full_name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-600 border-blue-200"
                    >
                      KOL/VIP - {kolInfo.level === "LEVEL_1" ? "Fresher" : kolInfo.level === "LEVEL_2" ? "Advanced" : "Elite"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {kolInfo.email}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-muted-foreground text-sm">Liên hệ trong tháng</p>
                  <p className="text-2xl font-bold">
                    {contacts ? contacts.length : 0}
                    <span className="text-sm font-normal text-muted-foreground ml-1">liên hệ</span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Hợp đồng đã ký</p>
                  <p className="text-2xl font-bold">
                    {getContactsCountByStatus("Đã chốt hợp đồng")}
                    <span className="text-sm font-normal text-muted-foreground ml-1">hợp đồng</span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Tổng giá trị</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(getTotalContractValue())}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs chính */}
        <Tabs defaultValue="contacts" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="contacts">Danh sách liên hệ</TabsTrigger>
            <TabsTrigger value="kpi">Theo dõi KPI</TabsTrigger>
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
                <Button onClick={() => {
                  setExtractedContactData(null);
                  setShowAddContactModal(true);
                }}>
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
              <Card className="col-span-1">
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

              <Card className="col-span-1 md:col-span-3">
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
                    kolId={kolInfo.id}
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
                      level={kolInfo.level as KolVipLevel}
                      monthlyKpi={kpiStats?.current_month}
                      isCurrentMonth={true}
                    />
                    <Card className="md:col-span-2">
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
                              <p className="font-medium text-primary">
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
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                    Đã đạt KPI
                                  </Badge>
                                ) : kpiStats?.current_month?.performance === "NOT_ACHIEVED" ? (
                                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                                    Chưa đạt KPI
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
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
                      {kpiStats.previous_months.slice(0, 6).map((month, index) => (
                        <KpiProgressCard
                          key={`${month.year}-${month.month}`}
                          level={kolInfo.level as KolVipLevel}
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
          kolId={kolInfo.id}
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
  );
};

export default KolDashboard;