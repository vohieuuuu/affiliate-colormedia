import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, 
  UserPlus, 
  BadgeCheck, 
  AlertCircle,
  PieChart,
  Users,
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  Building,
  Calendar
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import KolContactsTable from "@/components/kol-vip/kol-contacts-table";
import KpiProgressCard from "@/components/kol-vip/kpi-progress-card";
import { KolContact, CustomerStatusType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import AddContactModal from "@/components/kol-vip/add-contact-modal";
import ScanCardModal from "@/components/kol-vip/scan-card-modal";

// Định nghĩa kiểu dữ liệu cho KPI data
interface KpiData {
  contacts: {
    current: number;
    target: number;
    percentage: number;
  };
  potentialContacts: {
    current: number;
    target: number;
    percentage: number;
  };
  contracts: {
    current: number;
    target: number;
    percentage: number;
  };
  overall: {
    achieved: boolean;
    performance: "ACHIEVED" | "NOT_ACHIEVED" | "PENDING";
    lastEvaluated?: string;
  };
}

// Định nghĩa kiểu dữ liệu cho API response
interface KpiStatsResponse {
  status: string;
  data: {
    kolVip: {
      id: number;
      affiliate_id: string;
      full_name: string;
      level: string;
      current_base_salary: number;
    };
    period: {
      year: number;
      month: number;
    };
    kpi: KpiData;
    stats: {
      totalContacts: number;
      potentialContacts: number;
      contractsCount: number;
      contractValue: number;
      commission: number;
      baseSalary: number;
      totalIncome: number;
    };
    contacts: KolContact[];
  };
}

const KolDashboard = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isScanCardModalOpen, setIsScanCardModalOpen] = useState(false);
  
  // Lấy thông tin affiliate từ API
  const { data: kolData, isLoading, isError, refetch } = useQuery<{
    status: string;
    data: {
      id: number;
      user_id: number;
      affiliate_id: string;
      full_name: string;
      email: string;
      phone: string;
      level: string;
      current_base_salary: number;
      join_date: string;
      total_contacts: number;
      potential_contacts: number;
      total_contracts: number;
      contract_value: number;
      received_balance: number;
      paid_balance: number;
      remaining_balance: number;
    }
  }>({
    queryKey: ['/api/kol/me'],
    retry: 1,
  });

  // Lấy thông tin KPI từ API
  const { data: kpiStats, isLoading: isKpiLoading, refetch: refetchKpi } = useQuery<KpiStatsResponse>({
    queryKey: ['/api/kol/stats'],
    queryFn: async () => {
      if (!kolData?.data?.affiliate_id) {
        throw new Error("KOL ID not available");
      }
      
      const res = await fetch(`/api/kol/${kolData.data.affiliate_id}/kpi-stats`);
      if (!res.ok) {
        throw new Error("Failed to fetch KPI stats");
      }
      
      return res.json();
    },
    enabled: !!kolData?.data?.affiliate_id,
    retry: 1,
  });

  // Lấy danh sách contacts từ API
  const { data: contactsData, isLoading: isContactsLoading, refetch: refetchContacts } = useQuery<{
    status: string;
    data: KolContact[];
  }>({
    queryKey: ['/api/kol/contacts'],
    queryFn: async () => {
      if (!kolData?.data?.affiliate_id) {
        throw new Error("KOL ID not available");
      }
      
      const res = await fetch(`/api/kol/${kolData.data.affiliate_id}/contacts`);
      if (!res.ok) {
        throw new Error("Failed to fetch contacts");
      }
      
      return res.json();
    },
    enabled: !!kolData?.data?.affiliate_id,
    retry: 1,
  });

  useEffect(() => {
    // Redirect to auth page if not authenticated
    // Thêm logic ở đây nếu cần
  }, [navigate]);

  // Handler khi thêm contact mới
  const handleAddContact = async (newContactData: any) => {
    if (!kolData?.data?.affiliate_id) {
      toast({
        title: "Lỗi",
        description: "Không thể xác định KOL ID",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/kol/${kolData.data.affiliate_id}/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newContactData)
      });

      if (!response.ok) {
        throw new Error("Không thể thêm liên hệ mới");
      }

      // Refresh data
      refetchContacts();
      refetchKpi();
      
      toast({
        title: "Thành công",
        description: "Đã thêm liên hệ mới",
      });
      
      setIsAddContactModalOpen(false);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra khi thêm liên hệ mới",
        variant: "destructive"
      });
    }
  };

  // Handler khi quét card visit
  const handleScanCard = async (scannedData: any) => {
    if (!kolData?.data?.affiliate_id) {
      toast({
        title: "Lỗi",
        description: "Không thể xác định KOL ID",
        variant: "destructive"
      });
      return;
    }

    try {
      // Gửi dữ liệu quét lên API
      const response = await fetch(`/api/kol/${kolData.data.affiliate_id}/scan-card`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(scannedData)
      });

      if (!response.ok) {
        throw new Error("Không thể quét card visit");
      }

      const result = await response.json();
      
      // Tự động mở modal thêm contact với dữ liệu đã quét
      // Set state và mở modal
      setIsAddContactModalOpen(true);
      
      toast({
        title: "Quét thành công",
        description: "Đã quét thông tin từ card visit",
      });
      
      setIsScanCardModalOpen(false);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.message || "Có lỗi xảy ra khi quét card visit",
        variant: "destructive"
      });
    }
  };

  // Hiển thị tên tháng từ số tháng
  const getMonthName = (month: number) => {
    const months = [
      "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
      "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
    ];
    return months[month - 1] || "Không xác định";
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: CustomerStatusType }) => {
    const statusMap: Record<CustomerStatusType, { color: string, icon: React.ReactNode }> = {
      "Mới nhập": { color: "bg-blue-100 text-blue-800", icon: <Clock className="w-3 h-3 mr-1" /> },
      "Đang tư vấn": { color: "bg-orange-100 text-orange-800", icon: <Users className="w-3 h-3 mr-1" /> },
      "Chờ phản hồi": { color: "bg-purple-100 text-purple-800", icon: <Clock className="w-3 h-3 mr-1" /> },
      "Đã chốt hợp đồng": { color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-3 h-3 mr-1" /> },
      "Không tiềm năng": { color: "bg-red-100 text-red-800", icon: <XCircle className="w-3 h-3 mr-1" /> },
    };

    const { color, icon } = statusMap[status] || { color: "bg-gray-100 text-gray-800", icon: null };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {icon}
        {status}
      </span>
    );
  };

  // Performance badge component
  const PerformanceBadge = ({ performance }: { performance: "ACHIEVED" | "NOT_ACHIEVED" | "PENDING" }) => {
    const performanceMap = {
      "ACHIEVED": { color: "bg-green-100 text-green-800", text: "Đạt", icon: <CheckCircle className="w-3 h-3 mr-1" /> },
      "NOT_ACHIEVED": { color: "bg-red-100 text-red-800", text: "Không đạt", icon: <XCircle className="w-3 h-3 mr-1" /> },
      "PENDING": { color: "bg-orange-100 text-orange-800", text: "Đang đánh giá", icon: <Clock className="w-3 h-3 mr-1" /> },
    };

    const { color, text, icon } = performanceMap[performance] || performanceMap.PENDING;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {icon}
        {text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary"></div>
      </div>
    );
  }

  if (isError || !kolData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Lỗi khi tải dữ liệu</h1>
        <p className="text-gray-500 mb-6">Không thể tải thông tin KOL/VIP. Vui lòng thử lại sau.</p>
        <Button onClick={() => refetch()}>Tải lại</Button>
      </div>
    );
  }

  const kol = kolData.data;
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const periodText = kpiStats?.data?.period 
    ? `${getMonthName(kpiStats.data.period.month)}/${kpiStats.data.period.year}`
    : `${getMonthName(currentMonth)}/${currentYear}`;

  return (
    <div className="container p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{kol.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            KOL/VIP ID: {kol.affiliate_id} | 
            Level: {kol.level === "LEVEL_1" ? "1 (Fresher)" : 
                   kol.level === "LEVEL_2" ? "2 (Advanced)" : 
                   kol.level === "LEVEL_3" ? "3 (Elite)" : kol.level}
          </p>
        </div>
        <div className="flex gap-3 mt-3 md:mt-0">
          <Button 
            variant="outline"
            onClick={() => setIsScanCardModalOpen(true)}
          >
            <BadgeCheck className="mr-2 h-4 w-4" />
            Quét Card Visit
          </Button>
          <Button onClick={() => setIsAddContactModalOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Thêm Liên Hệ
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="dashboard">Tổng quan</TabsTrigger>
          <TabsTrigger value="contacts">Quản lý liên hệ</TabsTrigger>
          <TabsTrigger value="kpi">KPI & Thu nhập</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tổng số liên hệ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="mr-2 rounded-full p-2 bg-blue-100">
                    <Users className="h-4 w-4 text-blue-700" />
                  </div>
                  <div className="text-2xl font-bold">{kol.total_contacts || 0}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Liên hệ tiềm năng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="mr-2 rounded-full p-2 bg-green-100">
                    <BadgeCheck className="h-4 w-4 text-green-700" />
                  </div>
                  <div className="text-2xl font-bold">{kol.potential_contacts || 0}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Hợp đồng đã ký
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="mr-2 rounded-full p-2 bg-purple-100">
                    <FileCheck className="h-4 w-4 text-purple-700" />
                  </div>
                  <div className="text-2xl font-bold">{kol.total_contracts || 0}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPI Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Tiến độ KPI {periodText}</CardTitle>
              <CardDescription>
                Tiến độ đạt KPI level {kol.level === "LEVEL_1" ? "1 (Fresher)" : 
                              kol.level === "LEVEL_2" ? "2 (Advanced)" : 
                              kol.level === "LEVEL_3" ? "3 (Elite)" : kol.level}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isKpiLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-10 h-10 border-4 border-dashed rounded-full animate-spin border-primary"></div>
                </div>
              ) : kpiStats ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Số liên hệ</span>
                        <span className="text-sm font-medium">
                          {kpiStats.data.kpi.contacts.current}/{kpiStats.data.kpi.contacts.target}
                        </span>
                      </div>
                      <Progress value={kpiStats.data.kpi.contacts.percentage} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Liên hệ tiềm năng</span>
                        <span className="text-sm font-medium">
                          {kpiStats.data.kpi.potentialContacts.current}/{kpiStats.data.kpi.potentialContacts.target}
                        </span>
                      </div>
                      <Progress value={kpiStats.data.kpi.potentialContacts.percentage} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Hợp đồng đã ký</span>
                        <span className="text-sm font-medium">
                          {kpiStats.data.kpi.contracts.current}/{kpiStats.data.kpi.contracts.target}
                        </span>
                      </div>
                      <Progress value={kpiStats.data.kpi.contracts.percentage} />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div>
                      <span className="text-sm font-medium mr-2">Tổng đánh giá:</span>
                      <PerformanceBadge performance={kpiStats.data.kpi.overall.performance} />
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/kol-kpi">
                        Xem chi tiết <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Không có dữ liệu KPI
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Contacts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Liên hệ gần đây</CardTitle>
                <CardDescription>
                  Danh sách 5 liên hệ mới nhất của bạn
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/kol-contacts">
                  Xem tất cả <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isContactsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-10 h-10 border-4 border-dashed rounded-full animate-spin border-primary"></div>
                </div>
              ) : contactsData && contactsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên liên hệ</TableHead>
                      <TableHead>Công ty</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Ngày thêm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactsData.data
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 5)
                      .map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">{contact.contact_name}</TableCell>
                          <TableCell>{contact.company || "-"}</TableCell>
                          <TableCell>
                            <StatusBadge status={contact.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            {new Date(contact.created_at).toLocaleDateString("vi-VN")}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Chưa có liên hệ nào. Thêm liên hệ đầu tiên của bạn ngay!
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Quản lý liên hệ</CardTitle>
              <CardDescription>
                Quản lý tất cả các liên hệ của bạn
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KolContactsTable 
                onRefresh={() => {
                  refetchContacts();
                  refetchKpi();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI Tab */}
        <TabsContent value="kpi">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>KPI {periodText}</CardTitle>
                  <CardDescription>
                    Chi tiết tiến độ KPI của bạn trong tháng này
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isKpiLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="w-10 h-10 border-4 border-dashed rounded-full animate-spin border-primary"></div>
                    </div>
                  ) : kpiStats ? (
                    <>
                      <KpiProgressCard 
                        title="Số liên hệ" 
                        icon={<Users className="h-5 w-5" />}
                        current={kpiStats.data.kpi.contacts.current}
                        target={kpiStats.data.kpi.contacts.target}
                        percentage={kpiStats.data.kpi.contacts.percentage}
                      />
                      
                      <KpiProgressCard 
                        title="Liên hệ tiềm năng" 
                        icon={<BadgeCheck className="h-5 w-5" />}
                        current={kpiStats.data.kpi.potentialContacts.current}
                        target={kpiStats.data.kpi.potentialContacts.target}
                        percentage={kpiStats.data.kpi.potentialContacts.percentage}
                      />
                      
                      <KpiProgressCard 
                        title="Hợp đồng đã ký" 
                        icon={<FileCheck className="h-5 w-5" />}
                        current={kpiStats.data.kpi.contracts.current}
                        target={kpiStats.data.kpi.contracts.target}
                        percentage={kpiStats.data.kpi.contracts.percentage}
                      />
                      
                      <div className="flex justify-between items-center pt-4 border-t">
                        <div className="flex items-center">
                          <PieChart className="h-5 w-5 mr-2 text-primary" />
                          <span className="font-medium">Kết quả đánh giá:</span>
                          <div className="ml-2">
                            <PerformanceBadge performance={kpiStats.data.kpi.overall.performance} />
                          </div>
                        </div>
                        {kpiStats.data.kpi.overall.lastEvaluated && (
                          <div className="text-xs text-muted-foreground">
                            Đánh giá lần cuối: {new Date(kpiStats.data.kpi.overall.lastEvaluated).toLocaleDateString("vi-VN")}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Không có dữ liệu KPI
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Thu nhập</CardTitle>
                  <CardDescription>
                    Chi tiết thu nhập tháng {periodText}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isKpiLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="w-10 h-10 border-4 border-dashed rounded-full animate-spin border-primary"></div>
                    </div>
                  ) : kpiStats ? (
                    <>
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Lương cơ bản:</span>
                        <span>{formatCurrency(kpiStats.data.stats.baseSalary)}</span>
                      </div>
                      
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Hoa hồng:</span>
                        <span>{formatCurrency(kpiStats.data.stats.commission)}</span>
                      </div>
                      
                      <div className="flex justify-between py-2 font-bold">
                        <span>Tổng thu nhập:</span>
                        <span>{formatCurrency(kpiStats.data.stats.totalIncome)}</span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        <Calendar className="inline-block h-3 w-3 mr-1" />
                        Lương được tính dựa trên kết quả KPI đánh giá vào cuối tháng
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Không có dữ liệu thu nhập
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Thông tin KOL/VIP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <div className="flex items-center text-sm">
                          <Building className="mr-1 h-4 w-4 text-muted-foreground" />
                          <p className="truncate text-sm font-medium text-muted-foreground">Level:</p>
                        </div>
                        <p className="truncate text-sm font-medium">
                          {kol.level === "LEVEL_1" ? "1 - Fresher (5M/tháng)" : 
                          kol.level === "LEVEL_2" ? "2 - Advanced (10M/tháng)" : 
                          kol.level === "LEVEL_3" ? "3 - Elite (15M/tháng)" : 
                          kol.level}
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center text-sm">
                          <Phone className="mr-1 h-4 w-4 text-muted-foreground" />
                          <p className="truncate text-sm font-medium text-muted-foreground">Số điện thoại:</p>
                        </div>
                        <p className="truncate text-sm font-medium">{kol.phone}</p>
                      </div>
                      
                      <div>
                        <div className="flex items-center text-sm">
                          <Mail className="mr-1 h-4 w-4 text-muted-foreground" />
                          <p className="truncate text-sm font-medium text-muted-foreground">Email:</p>
                        </div>
                        <p className="truncate text-sm font-medium">{kol.email}</p>
                      </div>
                      
                      <div>
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-1 h-4 w-4 text-muted-foreground" />
                          <p className="truncate text-sm font-medium text-muted-foreground">Ngày tham gia:</p>
                        </div>
                        <p className="truncate text-sm font-medium">
                          {kol.join_date ? new Date(kol.join_date).toLocaleDateString("vi-VN") : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Add Contact Modal */}
      <AddContactModal 
        isOpen={isAddContactModalOpen} 
        onClose={() => setIsAddContactModalOpen(false)}
        onSubmit={handleAddContact}
        kolId={kolData.data?.affiliate_id}
      />
      
      {/* Scan Card Modal */}
      <ScanCardModal
        isOpen={isScanCardModalOpen}
        onClose={() => setIsScanCardModalOpen(false)}
        onSubmit={handleScanCard}
      />
    </div>
  );
};

export default KolDashboard;