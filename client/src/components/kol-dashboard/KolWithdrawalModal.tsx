import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DollarSign, Key, LockKeyhole, RotateCcw, Mail, AlertTriangle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatNumberWithCommas } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface KolWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  kolData: any;
  balance: number;
}

type WithdrawalStep = "initial" | "verification";

export default function KolWithdrawalModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  kolData,
  balance
}: KolWithdrawalModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>("");
  const [formattedAmount, setFormattedAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [confirmBankInfo, setConfirmBankInfo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<WithdrawalStep>("initial");
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [withdrawalData, setWithdrawalData] = useState<any>(null);
  const [otpInput, setOtpInput] = useState<string>("");
  const [attemptsLeft, setAttemptsLeft] = useState<number>(5);
  
  // Giới hạn số tiền có thể rút: Min(20M VND hoặc số dư khả dụng)
  const DAILY_WITHDRAWAL_LIMIT = 20000000; // 20 triệu VND
  
  // Tính toán số tiền đã rút trong ngày hôm nay
  const today = new Date().toISOString().split('T')[0]; // format YYYY-MM-DD
  const withdrawnToday = (kolData?.withdrawal_history || [])
    .filter((w: any) => {
      const requestDate = new Date(w.request_date).toISOString().split('T')[0];
      return requestDate === today && 
        (w.status === "Completed" || w.status === "Processing" || w.status === "Pending");
    })
    .reduce((sum: number, w: any) => sum + w.amount, 0);
  
  // Số tiền còn có thể rút trong ngày
  const remainingDailyLimit = Math.max(0, DAILY_WITHDRAWAL_LIMIT - withdrawnToday);
  
  // Số tiền tối đa có thể rút (số dư khả dụng)
  const maxAmount = balance || 0;
  
  // Kiểm tra giới hạn rút tiền
  const { mutate: checkLimit, isPending: isCheckingLimit } = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/check-limit",
        { amount }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        // Chuyển sang bước gửi OTP nếu không vượt quá giới hạn
        if (!data.data.exceeds) {
          // Nếu kiểm tra thành công, gửi OTP
          sendOtp();
        } else {
          setError(`Vượt quá giới hạn rút tiền trong ngày. Bạn đã rút ${formatCurrency(data.data.totalWithdrawn)} VND và chỉ có thể rút thêm ${formatCurrency(data.data.remainingLimit)} VND cho đến 9:00 sáng ngày mai.`);
          toast({
            variant: "destructive",
            title: "Vượt quá giới hạn rút tiền",
            description: `Bạn đã rút ${formatCurrency(data.data.totalWithdrawn)} VND trong ngày hôm nay. Hạn mức còn lại: ${formatCurrency(data.data.remainingLimit)} VND`,
          });
        }
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
  
  // Gửi yêu cầu OTP
  const { mutate: sendOtp, isPending: isSendingOtp } = useMutation({
    mutationFn: async () => {
      const amountValue = parseFloat(amount);
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/send-otp",
        {
          amount: amountValue,
          note,
        }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        // Vì số dư được trừ ngay khi tạo yêu cầu rút tiền, làm mới dữ liệu để hiển thị số dư mới
        queryClient.invalidateQueries({ queryKey: ['/api/kol/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/kol', kolData.affiliate_id, 'financial-summary'] });
        
        setWithdrawalData(data);
        setMaskedEmail(data.data.email_masked);
        setCurrentStep("verification");
        toast({
          title: "Mã OTP đã được gửi",
          description: `${data.data.message}. Mã OTP có hiệu lực đến ${new Date(data.data.otpExpires).toLocaleTimeString()}`,
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
  
  // Xác thực OTP và hoàn tất yêu cầu rút tiền
  const { mutate: verifyOtp, isPending: isVerifyingOtp } = useMutation({
    mutationFn: async () => {
      if (!otpInput || otpInput.length !== 6) {
        throw new Error("Vui lòng nhập đầy đủ mã OTP 6 chữ số");
      }
      
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/verify",
        {
          otp: otpInput,
          amount: parseFloat(amount),
          note,
        }
      );
      
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        // Invalidate cache và buộc refresh để cập nhật số dư mới
        queryClient.invalidateQueries({ queryKey: ['/api/kol/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/kol', kolData.affiliate_id, 'financial-summary'] });
        
        toast({
          title: "Thành công",
          description: "Yêu cầu rút tiền đã được xử lý thành công",
        });
        resetForm();
        onSuccess();
      }
    },
    onError: (error: any) => {
      setError(error.message);
      toast({
        title: "Lỗi xác thực OTP",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Gửi lại mã OTP
  const { mutate: resendOtp, isPending: isResendingOtp } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/resend-otp",
        {}
      );
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        setMaskedEmail(data.data.email_masked);
        setOtpInput("");
        toast({
          title: "Đã gửi lại mã OTP",
          description: `Mã OTP mới đã được gửi đến ${data.data.email_masked}`,
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
  
  const resetForm = () => {
    setAmount("");
    setFormattedAmount("");
    setNote("");
    setConfirmBankInfo(false);
    setError(null);
    setCurrentStep("initial");
    setMaskedEmail("");
    setWithdrawalData(null);
    setOtpInput("");
    setAttemptsLeft(5);
  };
  
  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0 || amountValue > maxAmount) {
      setError(`Vui lòng nhập số tiền hợp lệ (từ 1 đến ${formatCurrency(maxAmount)} VND)`);
      return;
    }
    
    if (amountValue > remainingDailyLimit) {
      setError(`Vượt quá giới hạn rút tiền trong ngày. Bạn chỉ có thể rút tối đa ${formatCurrency(remainingDailyLimit)} VND cho đến 9:00 sáng ngày mai.`);
      return;
    }
    
    if (!confirmBankInfo) {
      setError("Vui lòng xác nhận thông tin tài khoản ngân hàng của bạn");
      return;
    }
    
    // Kiểm tra giới hạn trước khi gửi OTP
    checkLimit(amountValue);
  };
  
  const handleOtpVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    verifyOtp();
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const handleBackToInitial = () => {
    setCurrentStep("initial");
    setError(null);
  };
  
  const isLoading = isCheckingLimit || isSendingOtp || isVerifyingOtp || isResendingOtp;
  
  useEffect(() => {
    // Reset form khi modal mở
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <DialogTitle>Yêu cầu rút tiền</DialogTitle>
          </div>
          <DialogDescription>
            {currentStep === "initial" 
              ? "Điền thông tin bên dưới để yêu cầu rút tiền"
              : "Nhập mã OTP đã được gửi đến email của bạn để xác thực yêu cầu rút tiền"}
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
                      // Chỉ cho phép nhập số và dấu phẩy
                      const inputValue = e.target.value.replace(/[^\d,]/g, '');
                      setFormattedAmount(formatNumberWithCommas(inputValue));
                      // Lưu giá trị số thực không có dấu phẩy để xử lý
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
                  isLoading || 
                  parseFloat(amount) <= 0 || 
                  parseFloat(amount) > maxAmount ||
                  parseFloat(amount) > remainingDailyLimit ||
                  !confirmBankInfo
                }
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tiếp tục
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleOtpVerifySubmit}>
            <div className="grid gap-4 py-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Mã OTP đã được gửi đến email {maskedEmail || "của bạn"}. Vui lòng kiểm tra hộp thư và nhập mã OTP vào ô bên dưới.
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-2">
                <Label htmlFor="otp">Mã OTP (6 chữ số)</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Nhập mã OTP 6 chữ số"
                  value={otpInput}
                  onChange={(e) => {
                    // Chỉ cho phép nhập 6 chữ số
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpInput(value);
                  }}
                  className="text-center text-lg tracking-widest"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
              
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <div>Mã OTP có hiệu lực trong 5 phút</div>
                <div>{attemptsLeft} lần thử còn lại</div>
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
            
            <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-0">
              <div className="order-1 sm:order-none">
                <Button variant="outline" type="button" onClick={handleBackToInitial} disabled={isLoading}>
                  Quay lại
                </Button>
              </div>
              <div className="flex gap-3 sm:gap-2">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => resendOtp()} 
                  disabled={isLoading}
                >
                  {isResendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Gửi lại OTP
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || otpInput.length !== 6}
                >
                  {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Xác nhận
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}