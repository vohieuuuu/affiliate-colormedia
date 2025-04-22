import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import KolWithdrawalFlow from "@/components/withdrawal/KolWithdrawalFlow";

export default function WithdrawalPage() {
  const { user } = useAuth();
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

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
        console.log("Fetching financial summary in WithdrawalPage with affiliate_id:", kolData?.affiliate_id);
        if (!kolData?.affiliate_id) {
          throw new Error("Không tìm thấy ID của KOL/VIP để tải thông tin tài chính");
        }
        
        const period = "month"; // Mặc định tính giai đoạn 30 ngày gần nhất
        const response = await apiRequest("GET", `/api/kol/${kolData.affiliate_id}/financial-summary?period=${period}`);
        const data = await response.json();
        console.log("Financial summary API response in WithdrawalPage:", data);
        if (data.status === "success") {
          console.log("Current balance in summary:", data.data.currentBalance);
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
  
  // Xử lý rút tiền thành công
  const handleWithdrawalSuccess = () => {
    // Đóng modal
    setShowWithdrawalModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (!kolData || !financialSummary) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Không tìm thấy thông tin KOL/VIP hoặc tài chính</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Quản lý rút tiền</h2>
        <p className="text-muted-foreground">
          Quản lý yêu cầu rút tiền và xem lịch sử các giao dịch
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">Số dư</span>
          <span className="text-3xl font-bold">
            {formatCurrency(financialSummary.currentBalance || 0)} VND
          </span>
        </div>
        <Button
          onClick={() => setShowWithdrawalModal(true)}
          disabled={!financialSummary.currentBalance || financialSummary.currentBalance <= 0}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Tạo yêu cầu rút tiền
        </Button>
      </div>

      <Tabs defaultValue="tab1" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tab1">Tạo yêu cầu mới</TabsTrigger>
          <TabsTrigger value="tab2">Lịch sử rút tiền</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
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
                      {formatCurrency(financialSummary?.currentBalance || 0)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Đã rút:
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(financialSummary?.expenseSources?.withdrawal || 0)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Thuế đã đóng:
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(financialSummary?.expenseSources?.tax || 0)}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Lưu ý khi rút tiền:
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                    <li>Mỗi ngày chỉ có thể rút tối đa 20.000.000 VND</li>
                    <li>Các khoản rút trên 2.000.000 VND sẽ bị khấu trừ 10% thuế TNCN</li>
                    <li>Vui lòng kiểm tra thông tin tài khoản ngân hàng trước khi yêu cầu rút tiền</li>
                    <li>Yêu cầu rút tiền sẽ được xác thực qua mã OTP gửi về email của bạn</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>Đề xuất rút tiền mới</CardTitle>
                <CardDescription>
                  Tạo yêu cầu rút tiền hoa hồng về tài khoản của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <p className="mb-4 text-muted-foreground">
                    Sử dụng nút "Tạo yêu cầu rút tiền" ở trên để bắt đầu quá trình rút tiền an toàn với xác thực OTP.
                  </p>
                  <Button
                    onClick={() => setShowWithdrawalModal(true)}
                    disabled={!financialSummary.currentBalance || financialSummary.currentBalance <= 0}
                    className="w-full"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Tạo yêu cầu rút tiền
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="tab2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử rút tiền</CardTitle>
              <CardDescription>
                Các yêu cầu rút tiền và trạng thái hiện tại
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium">
                          Ngày yêu cầu
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium">
                          Số tiền (VND)
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium">
                          Thực nhận (VND)
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium">
                          Trạng thái
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium">
                          Ghi chú
                        </th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {kolData.withdrawal_history && kolData.withdrawal_history.length > 0 ? (
                        [...kolData.withdrawal_history]
                          .sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime())
                          .map((withdrawal, index) => (
                            <tr
                              key={index}
                              className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                            >
                              <td className="p-4 align-middle">
                                {formatDate(new Date(withdrawal.request_date))}
                              </td>
                              <td className="p-4 align-middle font-medium">
                                {formatCurrency(withdrawal.amount)}
                              </td>
                              <td className="p-4 align-middle font-medium">
                                {formatCurrency(
                                  withdrawal.amount > 2000000
                                    ? withdrawal.amount * 0.9
                                    : withdrawal.amount
                                )}
                              </td>
                              <td className="p-4 align-middle">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    withdrawal.status === "Completed"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                      : withdrawal.status === "Processing"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                      : withdrawal.status === "Pending"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                      : withdrawal.status === "Rejected"
                                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                  }`}
                                >
                                  {withdrawal.status === "Completed"
                                    ? "Đã hoàn thành"
                                    : withdrawal.status === "Processing"
                                    ? "Đang xử lý"
                                    : withdrawal.status === "Pending"
                                    ? "Chờ xử lý"
                                    : withdrawal.status === "Rejected"
                                    ? "Đã từ chối"
                                    : withdrawal.status === "Cancelled"
                                    ? "Đã hủy"
                                    : withdrawal.status}
                                </span>
                              </td>
                              <td className="p-4 align-middle text-muted-foreground">
                                {withdrawal.note || "-"}
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-muted-foreground">
                            Chưa có yêu cầu rút tiền nào
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sử dụng component KolWithdrawalFlow mới để xử lý rút tiền */}
      {showWithdrawalModal && (
        <KolWithdrawalFlow
          isOpen={showWithdrawalModal}
          onClose={() => setShowWithdrawalModal(false)}
          onSuccess={handleWithdrawalSuccess}
          kolData={kolData || {}}
          balance={financialSummary?.currentBalance || 0}
        />
      )}
    </div>
  );
}