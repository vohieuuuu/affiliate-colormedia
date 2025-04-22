import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { WithdrawalForm } from "@/components/kol-dashboard/WithdrawalForm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

export default function WithdrawalPage() {
  const { user } = useAuth();

  // Lấy thông tin KOL/VIP
  const { data: kolData, isLoading: isLoadingKolData } = useQuery({
    queryKey: ["/api/kol/me"],
    enabled: !!user,
  });
  
  // Lấy thông tin tài chính
  const { data: financialSummary, isLoading: isLoadingFinancialSummary } = useQuery({
    queryKey: ["/api/kol", kolData?.affiliate_id, "financial-summary"],
    queryFn: async () => {
      try {
        if (!kolData?.affiliate_id) {
          throw new Error("Không tìm thấy ID của KOL/VIP để tải thông tin tài chính");
        }
        
        const period = "month"; // Mặc định tính giai đoạn 30 ngày gần nhất
        const response = await apiRequest("GET", `/api/kol/${kolData.affiliate_id}/financial-summary?period=${period}`);
        const data = await response.json();
        if (data.status === "success") {
          return data.data;
        }
        return null;
      } catch (error) {
        console.error("Error fetching financial summary:", error);
        return null;
      }
    },
    enabled: !!kolData?.affiliate_id,
  });

  // Kiểm tra trạng thái tải dữ liệu
  const isLoading = isLoadingKolData || isLoadingFinancialSummary;
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Yêu cầu rút tiền</h1>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!kolData) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Yêu cầu rút tiền</h1>
        <Card>
          <CardHeader>
            <CardTitle>Lỗi tải dữ liệu</CardTitle>
            <CardDescription>
              Không thể tải thông tin KOL/VIP. Vui lòng thử lại sau.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Filter và sắp xếp lịch sử rút tiền theo thời gian gần nhất
  const withdrawalHistory = [...(kolData.withdrawal_history || [])].sort((a, b) => {
    return new Date(b.request_date).getTime() - new Date(a.request_date).getTime();
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Quản lý rút tiền</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Tabs defaultValue="request" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="request">Tạo yêu cầu mới</TabsTrigger>
              <TabsTrigger value="history">Lịch sử rút tiền</TabsTrigger>
            </TabsList>
            <TabsContent value="request" className="mt-6">
              <WithdrawalForm kolData={kolData} />
            </TabsContent>
            <TabsContent value="history" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Lịch sử rút tiền</CardTitle>
                  <CardDescription>
                    Theo dõi các yêu cầu rút tiền đã thực hiện
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {withdrawalHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Bạn chưa thực hiện yêu cầu rút tiền nào
                    </div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left font-medium py-3 px-2">Ngày</th>
                            <th className="text-left font-medium py-3 px-2">Số tiền</th>
                            <th className="text-left font-medium py-3 px-2">Sau thuế</th>
                            <th className="text-left font-medium py-3 px-2">Trạng thái</th>
                            <th className="text-left font-medium py-3 px-2">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {withdrawalHistory.map((item, index) => (
                            <tr
                              key={index}
                              className="border-b hover:bg-muted/50 transition-colors"
                            >
                              <td className="py-3 px-2">
                                {formatDate(new Date(item.request_date))}
                              </td>
                              <td className="py-3 px-2">
                                {formatCurrency(item.amount)}
                              </td>
                              <td className="py-3 px-2">
                                {item.has_tax ? (
                                  formatCurrency(item.amount_after_tax)
                                ) : (
                                  formatCurrency(item.amount)
                                )}
                              </td>
                              <td className="py-3 px-2">
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    item.status === "Completed"
                                      ? "bg-green-100 text-green-800"
                                      : item.status === "Pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : item.status === "Processing"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {item.status === "Completed"
                                    ? "Hoàn thành"
                                    : item.status === "Pending"
                                    ? "Đang chờ"
                                    : item.status === "Processing"
                                    ? "Đang xử lý"
                                    : "Bị từ chối"}
                                </span>
                              </td>
                              <td className="py-3 px-2">{item.note || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Thông tin rút tiền</CardTitle>
              <CardDescription>
                Thông tin tài khoản & số dư hiện tại
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="grid grid-cols-2 items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Họ và tên:
                  </span>
                  <span className="text-sm font-medium">
                    {kolData.full_name}
                  </span>
                </div>
                <div className="grid grid-cols-2 items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Số tài khoản:
                  </span>
                  <span className="text-sm font-medium">
                    {kolData.bank_account}
                  </span>
                </div>
                <div className="grid grid-cols-2 items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Ngân hàng:
                  </span>
                  <span className="text-sm font-medium">
                    {kolData.bank_name}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Số dư tích lũy:
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {formatCurrency(financialSummary?.currentBalance || kolData.remaining_balance || 0)}
                  </span>
                </div>
                <div className="grid grid-cols-2 items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Đã rút:
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(financialSummary?.expenseSources?.withdrawal || kolData.paid_balance || 0)}
                  </span>
                </div>
                <div className="grid grid-cols-2 items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Tổng thu nhập:
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(financialSummary?.totalIncome || 
                      ((kolData.remaining_balance || 0) + (kolData.paid_balance || 0))
                    )}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm text-muted-foreground mb-1">
                  Lưu ý khi rút tiền:
                </div>
                <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Mỗi ngày chỉ được rút tối đa 20.000.000 VND</li>
                  <li>
                    Các yêu cầu từ 2.000.000 VND trở lên sẽ bị khấu trừ 10% thuế
                    thu nhập cá nhân
                  </li>
                  <li>
                    Vui lòng kiểm tra kỹ thông tin tài khoản trước khi tạo yêu
                    cầu rút tiền
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}