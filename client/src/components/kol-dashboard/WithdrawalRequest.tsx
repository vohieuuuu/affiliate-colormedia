import { useState, useEffect, startTransition } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatNumberWithCommas } from "@/lib/utils";

interface WithdrawalRequestProps {
  kolData: any;
  balance: number;
}

export function WithdrawalRequest({ kolData, balance: initialBalance }: WithdrawalRequestProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number>(initialBalance);
  
  // Form states
  const [amount, setAmount] = useState<string>("");
  const [formattedAmount, setFormattedAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [taxId, setTaxId] = useState<string>("");
  const [confirmBankInfo, setConfirmBankInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sử dụng dữ liệu từ trang cha thay vì gọi API lại
  const queryClient = useQueryClient();
  
  const { data: financialData, isLoading: isLoadingFinancial } = useQuery({
    queryKey: ["/api/kol", kolData?.affiliate_id, "financial-summary", "month"],
    queryFn: async () => {
      try {
        // Sử dụng dữ liệu có sẵn từ cache nếu có
        const cachedData = queryClient.getQueryData(["/api/kol", kolData?.affiliate_id, "financial-summary", "month"]);
        if (cachedData) {
          console.log("Using cached financial data");
          return cachedData;
        }
        
        // Nếu không có trong cache, gọi API
        console.log("Fetching financial summary as no cached data found");
        const response = await apiRequest(
          "GET", 
          `/api/kol/${kolData.affiliate_id}/financial-summary?period=month`
        );
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
    staleTime: 5 * 60 * 1000, // 5 phút cache
  });

  // Kiểm tra giới hạn rút tiền
  const { mutate: checkLimit, isPending: isCheckingLimit } = useMutation({
    mutationFn: async (amountValue: number) => {
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/check-limit",
        { amount: amountValue }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        if (!data.data.exceeds) {
          // Nếu không vượt quá giới hạn, gửi yêu cầu rút tiền
          createWithdrawalRequest();
        } else {
          // Hiển thị lỗi vượt quá giới hạn
          const errorMsg = `Vượt quá giới hạn rút tiền trong ngày. Bạn đã rút ${formatCurrency(data.data.totalWithdrawn)} VND và chỉ có thể rút thêm ${formatCurrency(data.data.remainingLimit)} VND cho đến 9:00 sáng ngày mai.`;
          setError(errorMsg);
          toast({
            variant: "destructive",
            title: "Vượt quá giới hạn rút tiền",
            description: `Bạn đã rút ${formatCurrency(data.data.totalWithdrawn)} VND trong ngày hôm nay. Hạn mức còn lại: ${formatCurrency(data.data.remainingLimit)} VND`,
          });
        }
      } else if (data.error) {
        setError(data.error.message || "Lỗi kiểm tra hạn mức rút tiền");
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: data.error.message || "Lỗi kiểm tra hạn mức rút tiền",
        });
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Tạo yêu cầu rút tiền
  const { mutate: createRequest, isPending: isCreatingRequest } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/create",
        {
          amount: parseFloat(amount),
          note: note || "",
          tax_id: taxId || "",
        }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        setModalOpen(false);
        toast({
          title: "Yêu cầu rút tiền đã được tạo",
          description: "Vui lòng xác thực OTP để hoàn tất quy trình rút tiền.",
        });
        
        // Chuyển hướng đến trang xác thực OTP với các tham số cần thiết sử dụng startTransition để tránh lỗi suspense
        startTransition(() => {
          navigate(`/kol/otp-verification?amount=${amount}&affiliateId=${kolData.affiliate_id}&requestId=${data.data.requestId}`);
        });
      } else if (data.error) {
        setError(data.error.message || "Lỗi tạo yêu cầu rút tiền");
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: data.error.message || "Lỗi tạo yêu cầu rút tiền",
        });
      }
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Khi form submit được gọi
  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!confirmBankInfo) {
      setError("Vui lòng xác nhận thông tin ngân hàng của bạn trước khi tiếp tục");
      return;
    }
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError("Vui lòng nhập số tiền hợp lệ lớn hơn 0");
      return;
    }
    
    if (amountValue > currentBalance) {
      setError(`Số tiền không thể vượt quá số dư khả dụng (${formatCurrency(currentBalance)} VND)`);
      return;
    }
    
    // Kiểm tra giới hạn rút tiền trước khi tạo yêu cầu
    checkLimit(amountValue);
  };

  // Hàm trợ giúp để tạo yêu cầu rút tiền sau khi kiểm tra giới hạn
  const createWithdrawalRequest = () => {
    createRequest();
  };

  // Update current balance when data changes
  useEffect(() => {
    if (financialData && typeof financialData.currentBalance === 'number') {
      console.log("Setting current balance from financial data:", financialData.currentBalance);
      setCurrentBalance(financialData.currentBalance);
    } else if (initialBalance && typeof initialBalance === 'number') {
      console.log("Using initial balance:", initialBalance);
      setCurrentBalance(initialBalance);
    }
  }, [financialData, initialBalance]);

  // Tính toán giới hạn rút tiền hàng ngày
  const dailyWithdrawalLimit = 20000000; // 20 million VND
  const withdrawnToday = (kolData?.withdrawal_history || [])
    .filter((w: any) => {
      const today = new Date().toISOString().split('T')[0];
      const requestDate = new Date(w.request_date).toISOString().split('T')[0];
      return requestDate === today && 
        (w.status === "Completed" || w.status === "Processing" || w.status === "Pending");
    })
    .reduce((sum: number, w: any) => sum + w.amount, 0);
  
  const remainingDailyLimit = Math.max(0, dailyWithdrawalLimit - withdrawnToday);
  const maxAmount = currentBalance || 0;
  const isPending = isCheckingLimit || isCreatingRequest;

  const handleOpenModal = () => {
    setModalOpen(true);
    // Reset form
    setAmount("");
    setFormattedAmount("");
    setNote("");
    setTaxId("");
    setConfirmBankInfo(false);
    setError(null);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
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
          {isLoadingFinancial ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            formatCurrency(currentBalance)
          )}
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
      
      {/* Modal nhập thông tin rút tiền */}
      <Dialog open={modalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <DialogTitle>Yêu cầu rút tiền</DialogTitle>
            </div>
            <DialogDescription>
              Điền thông tin bên dưới để yêu cầu rút tiền
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleInitialSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Số tiền (VND)</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="text"
                    placeholder="0"
                    value={formattedAmount}
                    onChange={(e) => {
                      // Only allow numbers and commas
                      const inputValue = e.target.value.replace(/[^\d,]/g, '');
                      setFormattedAmount(formatNumberWithCommas(inputValue));
                      // Store the actual numeric value without commas for processing
                      setAmount(inputValue.replace(/,/g, ''));
                    }}
                    className="text-right pr-14"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">VND</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className={`text-xs ${maxAmount > 0 ? 'text-gray-500 dark:text-gray-400' : 'text-red-600 dark:text-red-400 font-medium'}`}>
                    Số dư khả dụng: {formatCurrency(maxAmount)} VND
                    {maxAmount <= 0 && " (không thể rút tiền)"}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Giới hạn rút tiền mỗi ngày: {formatCurrency(dailyWithdrawalLimit)} VND
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Đã rút hôm nay: {formatCurrency(withdrawnToday)} VND
                  </p>
                  <p className={`text-xs ${remainingDailyLimit > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400 font-medium'}`}>
                    Còn có thể rút hôm nay: {formatCurrency(remainingDailyLimit)} VND
                    {remainingDailyLimit <= 0 && " (đã đạt giới hạn)"}
                  </p>
                  
                  {amount && parseFloat(amount) > 2000000 && (
                    <>
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Chi tiết số tiền thực nhận:</p>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Số tiền yêu cầu:</p>
                          <p className="text-xs font-medium">{formatCurrency(parseFloat(amount))} VND</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Thuế TNCN (10%):</p>
                          <p className="text-xs font-medium text-amber-600">- {formatCurrency(parseFloat(amount) * 0.1)} VND</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Thực nhận:</p>
                          <p className="text-xs font-medium text-green-600">{formatCurrency(parseFloat(amount) * 0.9)} VND</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="note">Ghi chú (không bắt buộc)</Label>
                <Textarea
                  id="note"
                  placeholder="Thêm ghi chú cho yêu cầu rút tiền"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              
              {parseFloat(amount) > 2000000 && (
                <div className="grid gap-2">
                  <Label htmlFor="taxId">Mã số thuế cá nhân (nếu có)</Label>
                  <Input
                    id="taxId"
                    type="text"
                    placeholder="Nhập MST cá nhân nếu có"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nhập mã số thuế cá nhân (nếu có) để thuận tiện cho việc kê khai thuế TNCN.
                    <br />Không bắt buộc nhưng được khuyến khích khi số tiền rút trên 2 triệu VND.
                  </p>
                </div>
              )}
              
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="confirmBankInfo"
                  checked={confirmBankInfo}
                  onCheckedChange={(checked) => setConfirmBankInfo(checked as boolean)}
                />
                <div className="grid gap-1 leading-none">
                  <Label
                    htmlFor="confirmBankInfo"
                    className="text-sm font-medium leading-none"
                  >
                    Xác nhận thông tin ngân hàng
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Số tài khoản: <span className="font-medium">{kolData?.bank_account}</span>
                    <br/>
                    Ngân hàng: <span className="font-medium">{kolData?.bank_name}</span>
                  </p>
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <DialogFooter className="gap-3 sm:gap-0">
              <Button variant="outline" type="button" onClick={handleCloseModal}>
                Hủy
              </Button>
              <Button 
                type="submit" 
                disabled={isPending || maxAmount <= 0 || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount}
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                Tiếp tục
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}