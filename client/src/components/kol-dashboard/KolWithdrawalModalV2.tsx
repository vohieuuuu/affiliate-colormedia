import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DollarSign, AlertTriangle, Loader2, Mail, RotateCcw, LockKeyhole } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatNumberWithCommas } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface KolWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Optional success callback
  kolData: any;
  balance: number;
}

type WithdrawalStep = "initial" | "verification";

export default function KolWithdrawalModalV2({ 
  isOpen, 
  onClose, 
  onSuccess, 
  kolData,
  balance
}: KolWithdrawalModalProps) {
  const { toast } = useToast();
  // Form states
  const [amount, setAmount] = useState<string>("");
  const [formattedAmount, setFormattedAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [taxId, setTaxId] = useState<string>("");
  const [confirmBankInfo, setConfirmBankInfo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // OTP verification states
  const [currentStep, setCurrentStep] = useState<WithdrawalStep>("initial");
  const [otpInput, setOtpInput] = useState<string>("");
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [withdrawalData, setWithdrawalData] = useState<any>(null);
  const [otpTimer, setOtpTimer] = useState<number>(300); // 5 minutes

  // OTP timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentStep === "verification" && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentStep, otpTimer]);

  // Daily limits
  const DAILY_WITHDRAWAL_LIMIT = 20000000; // 20 million VND
  const today = new Date().toISOString().split('T')[0];
  const withdrawnToday = (kolData?.withdrawal_history || [])
    .filter((w: any) => {
      const requestDate = new Date(w.request_date).toISOString().split('T')[0];
      return requestDate === today && 
        (w.status === "Completed" || w.status === "Processing" || w.status === "Pending");
    })
    .reduce((sum: number, w: any) => sum + w.amount, 0);
  
  // Remaining available amount to withdraw today
  const remainingDailyLimit = Math.max(0, DAILY_WITHDRAWAL_LIMIT - withdrawnToday);
  const maxAmount = balance || 0;
  
  // Kiểm tra giới hạn rút tiền
  const { mutate: checkLimit, isPending: isCheckingLimit } = useMutation({
    mutationFn: async (amount: number) => {
      console.log("Checking withdrawal limit:", amount);
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/check-limit",
        { amount }
      );
      const result = await response.json();
      console.log("Check limit response:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Check limit success:", data);
      if (data.status === "success") {
        // Chuyển sang bước gửi OTP nếu không vượt quá giới hạn
        if (!data.data.exceeds) {
          // Nếu kiểm tra thành công, gửi OTP
          sendOtp();
        } else {
          const errorMsg = `Vượt quá giới hạn rút tiền trong ngày. Bạn đã rút ${formatCurrency(data.data.totalWithdrawn)} VND và chỉ có thể rút thêm ${formatCurrency(data.data.remainingLimit)} VND cho đến 9:00 sáng ngày mai.`;
          console.log("Limit exceeded:", errorMsg);
          setError(errorMsg);
          toast({
            variant: "destructive",
            title: "Vượt quá giới hạn rút tiền",
            description: `Bạn đã rút ${formatCurrency(data.data.totalWithdrawn)} VND trong ngày hôm nay. Hạn mức còn lại: ${formatCurrency(data.data.remainingLimit)} VND`,
          });
        }
      } else if (data.error) {
        // Handle error from API
        setError(data.error.message || "Lỗi kiểm tra hạn mức rút tiền");
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: data.error.message || "Lỗi kiểm tra hạn mức rút tiền",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Check limit error:", error);
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
          note: note || "",
          tax_id: taxId || ""
        }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Send OTP success:", data);
      if (data.status === "success") {
        // Vì số dư được trừ ngay khi tạo yêu cầu rút tiền, làm mới dữ liệu để hiển thị số dư mới
        queryClient.invalidateQueries({ queryKey: ['/api/kol/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/kol', kolData.affiliate_id, 'financial-summary'] });
        
        setWithdrawalData(data);
        setMaskedEmail(data.data.email_masked);
        setCurrentStep("verification");
        setOtpTimer(300); // Set timer to 5 minutes
        toast({
          title: "Mã OTP đã được gửi",
          description: `${data.data.message}. Mã OTP có hiệu lực đến ${new Date(data.data.otpExpires).toLocaleTimeString()}`,
        });
      }
    },
    onError: (error: Error) => {
      console.error("Send OTP error:", error);
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
          note: note || "",
          tax_id: taxId || ""
        }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Verify OTP success:", data);
      if (data.status === "success") {
        // Làm mới dữ liệu sau khi xác thực OTP thành công
        queryClient.invalidateQueries({ queryKey: ['/api/kol/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/kol', kolData.affiliate_id, 'financial-summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/kol', kolData.affiliate_id, 'transactions'] });
        
        toast({
          title: "Yêu cầu rút tiền thành công",
          description: data.data.message || "Yêu cầu rút tiền của bạn đã được tạo thành công và đang chờ xử lý.",
        });
        
        // Đóng modal và gọi callback thành công nếu có
        resetForm();
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }
    },
    onError: (error: Error) => {
      console.error("Verify OTP error:", error);
      setError(error.message);
      toast({
        title: "Lỗi xác thực OTP",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Gửi lại OTP
  const { mutate: resendOtp, isPending: isResendingOtp } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/resend-otp",
        { amount: parseFloat(amount) }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Resend OTP success:", data);
      if (data.status === "success") {
        setOtpInput("");
        setMaskedEmail(data.data.email_masked);
        setOtpTimer(300); // Reset timer
        
        toast({
          title: "Đã gửi lại mã OTP",
          description: `${data.data.message}. Mã OTP có hiệu lực đến ${new Date(data.data.otpExpires).toLocaleTimeString()}`,
        });
      }
    },
    onError: (error: Error) => {
      console.error("Resend OTP error:", error);
      setError(error.message);
      toast({
        title: "Lỗi gửi lại OTP",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Reset form
  const resetForm = () => {
    setAmount("");
    setFormattedAmount("");
    setNote("");
    setTaxId("");
    setConfirmBankInfo(false);
    setError(null);
    setCurrentStep("initial");
    setOtpInput("");
    setMaskedEmail("");
    setWithdrawalData(null);
  };
  
  // Form submission handlers
  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Đảm bảo amount là chuỗi hợp lệ
    if (!amount || amount.trim() === '') {
      setError(`Vui lòng nhập số tiền rút`);
      return;
    }
    
    // Chuyển đổi an toàn sang số
    const amountValue = parseFloat(amount);
    console.log("Amount parsed:", amountValue, "from string:", amount);
    
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
    
    console.log("Form submitted, checking limit for withdrawal:", amountValue);
    
    // Kiểm tra limit trước
    checkLimit(amountValue);
  };
  
  // UI event handlers
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  // Reset form when modal opens
  useEffect(() => {
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
          <div className="grid gap-4 py-4">
            <div className="grid gap-1 text-center">
              <Mail className="w-8 h-8 mx-auto text-primary" />
              <p className="text-sm">
                Mã OTP đã được gửi đến email {maskedEmail}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="otp" className="text-center">Nhập mã OTP 6 chữ số</Label>
              <div className="flex justify-center">
                <Input
                  id="otp"
                  type="text"
                  className="w-40 text-center text-xl tracking-widest font-mono"
                  value={otpInput}
                  onChange={(e) => {
                    // Giới hạn 6 chữ số
                    const value = e.target.value.replace(/\D/g, '').substring(0, 6);
                    setOtpInput(value);
                    
                    // Tự động xác thực khi nhập đủ 6 chữ số
                    if (value.length === 6) {
                      verifyOtp();
                    }
                  }}
                  maxLength={6}
                  placeholder="______"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {otpTimer > 0 ? (
                  <span>Mã OTP sẽ hết hạn sau {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}</span>
                ) : (
                  <span className="text-red-500">Mã OTP đã hết hạn</span>
                )}
              </p>
              
              <div className="flex justify-center mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resendOtp()}
                  disabled={isResendingOtp || otpTimer > 240} // Cho phép gửi lại sau 1 phút
                >
                  {isResendingOtp ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Gửi lại mã OTP
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Chi tiết yêu cầu:</p>
              <div className="bg-muted/50 rounded-md p-3">
                <div className="flex justify-between">
                  <span className="text-sm">Số tiền:</span>
                  <span className="text-sm font-medium">{formatCurrency(parseFloat(amount))} VND</span>
                </div>
                {note && (
                  <div className="flex justify-between mt-1">
                    <span className="text-sm">Ghi chú:</span>
                    <span className="text-sm">{note}</span>
                  </div>
                )}
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
            
            <DialogFooter className="gap-3 sm:gap-0">
              <Button variant="outline" type="button" onClick={handleClose}>
                Hủy
              </Button>
              <Button 
                onClick={() => verifyOtp()}
                disabled={isVerifyingOtp || otpInput.length !== 6}
              >
                {isVerifyingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
                Xác nhận
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}