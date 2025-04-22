import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import KolWithdrawalModalV2 from "./KolWithdrawalModalV2";

interface FinancialSummary {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  expenseSources: {
    withdrawal: number;
    tax: number;
    other: number;
  };
}

interface WithdrawalHistory {
  request_date: string;
  amount: number;
  amount_after_tax?: number;
  has_tax?: boolean;
  status: string;
  note?: string;
}

export default function DirectWithdrawalPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kolData, setKolData] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch KOL data directly using fetch
  useEffect(() => {
    const fetchKolData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/kol/me", {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include" // Includes cookies automatically
        });
        
        if (!response.ok) {
          throw new Error("Không thể tải thông tin KOL/VIP");
        }
        
        const data = await response.json();
        if (data.status === "success") {
          console.log("KOL data loaded successfully:", data.data);
          setKolData(data.data);
          
          // Fetch financial summary once we have kolData
          if (data.data && data.data.affiliate_id) {
            await fetchFinancialSummary(data.data.affiliate_id);
          }
        } else {
          throw new Error(data.error?.message || "Không thể tải thông tin KOL/VIP");
        }
      } catch (err) {
        console.error("Error fetching KOL data:", err);
        setError(err instanceof Error ? err.message : "Lỗi không xác định");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchKolData();
    }
  }, [user]);
  
  // Fetch financial summary directly
  const fetchFinancialSummary = async (affiliateId: string) => {
    try {
      const response = await fetch(`/api/kol/${affiliateId}/financial-summary?period=month`, {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include" // Includes cookies automatically
      });
      
      if (!response.ok) {
        throw new Error("Không thể tải thông tin tài chính");
      }
      
      const data = await response.json();
      console.log("Financial summary API direct response:", data);
      
      if (data.status === "success") {
        console.log("Financial summary loaded successfully. Current balance:", data.data.currentBalance);
        setFinancialSummary(data.data);
      } else {
        throw new Error(data.error?.message || "Không thể tải thông tin tài chính");
      }
    } catch (err) {
      console.error("Error fetching financial summary:", err);
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    }
  };
  
  // Set withdrawal history from kolData
  useEffect(() => {
    if (kolData && kolData.withdrawal_history) {
      // Sort by date descending
      const sortedHistory = [...kolData.withdrawal_history].sort((a, b) => {
        return new Date(b.request_date).getTime() - new Date(a.request_date).getTime();
      });
      setWithdrawalHistory(sortedHistory);
    }
  }, [kolData]);
  
  // Modal handlers
  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleSuccess = () => {
    setModalOpen(false);
    // Reload data after successful withdrawal request
    if (kolData && kolData.affiliate_id) {
      fetchFinancialSummary(kolData.affiliate_id);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Quản lý rút tiền</h1>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !kolData) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Quản lý rút tiền</h1>
        <Card>
          <CardHeader>
            <CardTitle>Lỗi tải dữ liệu</CardTitle>
            <CardDescription>
              {error || "Không thể tải thông tin KOL/VIP. Vui lòng thử lại sau."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentBalance = financialSummary?.currentBalance || 0;

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
              <Card>
                <CardHeader>
                  <CardTitle>Tạo yêu cầu rút tiền</CardTitle>
                  <CardDescription>
                    Tạo yêu cầu rút tiền hoa hồng về tài khoản ngân hàng của bạn
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-sm text-muted-foreground">
                      <p>
                        Để rút tiền hoa hồng, vui lòng nhấn vào nút "Tạo yêu cầu rút tiền" bên dưới.
                        Quá trình rút tiền sẽ yêu cầu xác thực qua mã OTP được gửi tới email của bạn.
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-y">
                      <span className="font-medium">Số dư khả dụng:</span>
                      <span className="font-bold text-primary text-lg">
                        {formatCurrency(currentBalance)}
                      </span>
                    </div>
                    
                    <Button 
                      onClick={handleOpenModal} 
                      className="w-full"
                      disabled={currentBalance <= 0}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Tạo yêu cầu rút tiền
                    </Button>
                    
                    {currentBalance <= 0 && (
                      <div className="text-xs text-amber-600">
                        Bạn không thể tạo yêu cầu rút tiền khi số dư bằng 0.
                      </div>
                    )}
                    
                    {modalOpen && (
                      <KolWithdrawalModalV2
                        isOpen={modalOpen}
                        onClose={handleCloseModal}
                        onSubmit={handleSuccess}
                        kolData={kolData || {}}
                        balance={currentBalance || 0}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
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
                                {formatDate(item.request_date)}
                              </td>
                              <td className="py-3 px-2">
                                {formatCurrency(item.amount)}
                              </td>
                              <td className="py-3 px-2">
                                {item.has_tax ? (
                                  formatCurrency(item.amount_after_tax || item.amount * 0.9)
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
                    {formatCurrency(currentBalance)}
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
                    Tổng thu nhập:
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(financialSummary?.totalIncome || 0)}
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