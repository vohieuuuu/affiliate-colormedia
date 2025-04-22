import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DollarSign, AlertTriangle, Loader2, Mail, RotateCcw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatNumberWithCommas } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useToastNotification } from "@/components/notification/ToastNotificationProvider";

interface KolWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Optional success callback
  kolData: any;
  balance: number;
}

type WithdrawalStep = "initial";

export default function KolWithdrawalModalFixed({ 
  isOpen, 
  onClose, 
  onSuccess,
  kolData,
  balance 
}: KolWithdrawalModalProps) {
  const { toast } = useToast();
  const { showOtpVerification } = useToastNotification();
  const [amount, setAmount] = useState<string>("");
  const [formattedAmount, setFormattedAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [taxId, setTaxId] = useState<string>("");
  const [confirmBankInfo, setConfirmBankInfo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingLimit, setIsCheckingLimit] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<WithdrawalStep>("initial");
  const [withdrawalData, setWithdrawalData] = useState<any>(null);

  // Giới hạn số tiền có thể rút: Min(20M VND hoặc số dư khả dụng)
  const DAILY_WITHDRAWAL_LIMIT = 20000000; // 20 triệu VND
  
  // Mặc định số dư lấy từ prop
  const maxAmount = balance || 0;
  
  // State cho thông tin giới hạn
  const [withdrawnToday, setWithdrawnToday] = useState<number>(0);
  const [remainingDailyLimit, setRemainingDailyLimit] = useState<number>(DAILY_WITHDRAWAL_LIMIT);

  // Kiểm tra giới hạn rút tiền
  const checkWithdrawalLimit = async () => {
    if (!amount || amount.trim() === '' || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return;
    }
    
    try {
      setIsCheckingLimit(true);
      const response = await apiRequest("POST", "/api/kol/withdrawal-request/check-limit", {
        amount: parseFloat(amount)
      });
      const data = await response.json();
      
      if (data.status === "success") {
        setWithdrawnToday(data.data.totalWithdrawn);
        setRemainingDailyLimit(data.data.remainingLimit);
      }
    } catch (error) {
      console.error("Error checking withdrawal limit:", error);
    } finally {
      setIsCheckingLimit(false);
    }
  };

  // Kiểm tra giới hạn khi số tiền thay đổi
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
        checkWithdrawalLimit();
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [amount]);



  // Gửi yêu cầu OTP
  const { mutate: requestOtp, isPending: isRequestingOtp } = useMutation({
    mutationFn: async () => {
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0 || amountValue > maxAmount) {
        throw new Error(`Vui lòng nhập số tiền hợp lệ (từ 1 đến ${formatCurrency(maxAmount)} VND)`);
      }
      
      if (amountValue > remainingDailyLimit) {
        throw new Error(`Vượt quá giới hạn rút tiền trong ngày. Bạn chỉ có thể rút tối đa ${formatCurrency(remainingDailyLimit)} VND cho đến 9:00 sáng ngày mai.`);
      }
      
      if (!confirmBankInfo) {
        throw new Error("Vui lòng xác nhận thông tin tài khoản ngân hàng của bạn");
      }
      
      const response = await apiRequest("POST", "/api/kol/withdrawal-request/send-otp", {
        amount: amountValue,
        note,
        tax_id: taxId.trim()
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        // Vì số dư được trừ ngay khi tạo yêu cầu rút tiền, làm mới dữ liệu để hiển thị số dư mới
        queryClient.invalidateQueries({ queryKey: ['/api/kol/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/kol/financial-summary'] });
        
        // Force refetch ngay lập tức
        queryClient.refetchQueries({ queryKey: ['/api/kol/me'] });
        queryClient.refetchQueries({ queryKey: ['/api/kol/financial-summary'] });

        // Lưu dữ liệu rút tiền
        setWithdrawalData(data.data.withdrawal_data);
        
        // Hiển thị màn hình xác thực OTP độc lập
        showOtpVerification({
          email: data.data.email,
          otpData: {
            otpExpires: data.data.otpExpires
          },
          verifyEndpoint: "/api/kol/withdrawal-request/verify",
          resendEndpoint: "/api/kol/withdrawal-request/resend-otp",
          requestData: {
            withdrawal_data: data.data.withdrawal_data
          },
          refreshQueries: ['/api/kol/me', '/api/kol/financial-summary'],
          onSuccess: () => {
            toast({
              title: "Thành công",
              description: "Yêu cầu rút tiền đã được xử lý thành công",
              variant: "default"
            });
            resetForm();
            if (onSuccess) onSuccess();
            onClose();
          },
          onCancel: () => {
            toast({
              title: "Hủy xác thực",
              description: "Bạn đã hủy quá trình xác thực rút tiền",
              variant: "default"
            });
          }
        });
        
        // Đóng modal rút tiền
        onClose();
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
  

  
  const resetForm = () => {
    setAmount("");
    setFormattedAmount("");
    setNote("");
    setTaxId("");
    setConfirmBankInfo(false);
    setError(null);
    setCurrentStep("initial");
    setWithdrawalData(null);
  };
  
  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    requestOtp();
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // Khi mở modal, reset form
  useEffect(() => {
    if (isOpen && currentStep === "initial") {
      resetForm();
    }
  }, [isOpen]);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <DialogTitle>
              {currentStep === "initial" ? "Yêu cầu rút tiền" : "Xác thực rút tiền"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {currentStep === "initial" 
              ? "Điền thông tin bên dưới để yêu cầu rút tiền" 
              : "Nhập mã OTP đã được gửi đến email của bạn"}
          </DialogDescription>
        </DialogHeader>
        
        {currentStep === "initial" ? (
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
                    Giới hạn rút tiền mỗi ngày: {formatCurrency(DAILY_WITHDRAWAL_LIMIT)} VND
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
                  {maxAmount <= 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Bạn không thể rút tiền khi số dư bằng 0.
                      </p>
                    </div>
                  )}
                  {parseFloat(amount) > remainingDailyLimit && amount !== "" && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Vượt quá giới hạn rút tiền hàng ngày. Bạn chỉ có thể rút tối đa {formatCurrency(remainingDailyLimit)} VND.
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="italic">Lưu ý: Giới hạn sẽ được đặt lại vào 9:00 sáng mỗi ngày</span>
                  </p>
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
              <Button variant="outline" type="button" onClick={handleClose}>
                Hủy
              </Button>
              <Button 
                type="submit" 
                disabled={
                  isCheckingLimit || 
                  maxAmount <= 0 || 
                  !amount || 
                  amount.trim() === '' || 
                  isNaN(parseFloat(amount)) || 
                  parseFloat(amount) <= 0 || 
                  parseFloat(amount) > maxAmount ||
                  !confirmBankInfo
                }
              >
                {isCheckingLimit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
                Gửi yêu cầu
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="p-4 text-center">
            <p className="text-muted-foreground text-sm">
              Xác thực OTP sẽ xuất hiện trong cửa sổ thông báo riêng biệt.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}