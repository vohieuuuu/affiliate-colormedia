import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Affiliate } from "@shared/schema";
import { DollarSign, Key, LockKeyhole, RotateCcw, Mail, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatNumberWithCommas, parseFormattedNumber } from "@/lib/formatters";
import { OtpInput } from "@/components/OtpInput";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  affiliate: Affiliate;
}

type WithdrawalStep = "initial" | "verification";

export default function WithdrawalModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  affiliate 
}: WithdrawalModalProps) {
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
  const withdrawnToday = (affiliate?.withdrawal_history || [])
    .filter(w => {
      const requestDate = new Date(w.request_date).toISOString().split('T')[0];
      return requestDate === today && 
        (w.status === "Completed" || w.status === "Processing" || w.status === "Pending");
    })
    .reduce((sum, w) => sum + w.amount, 0);
  
  // Đã loại bỏ kiểm tra lệnh rút tiền đang chờ xử lý theo yêu cầu
  
  // Số tiền còn có thể rút trong ngày
  const remainingDailyLimit = Math.max(0, DAILY_WITHDRAWAL_LIMIT - withdrawnToday);
  
  // Số tiền tối đa có thể rút (số dư khả dụng, không bị giới hạn bởi giới hạn rút tiền trong ngày)
  const maxAmount = affiliate?.remaining_balance || 0;
  
  // Không cần sử dụng state này vì chúng ta đã kiểm tra trực tiếp khi hiển thị cảnh báo
  
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
      
      const response = await apiRequest("POST", "/api/withdrawal-request/send-otp", {
        amount: amountValue,
        note
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        setWithdrawalData(data.data.withdrawal_data);
        setMaskedEmail(data.data.email_masked);
        setCurrentStep("verification");
        toast({
          title: "Mã OTP đã được gửi",
          description: `Vui lòng kiểm tra email của bạn để lấy mã xác thực`,
          variant: "default"
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
    mutationFn: async (otp: string) => {
      if (!otp || otp.length !== 6) {
        throw new Error("Vui lòng nhập đầy đủ mã OTP");
      }
      
      if (!withdrawalData) {
        throw new Error("Dữ liệu rút tiền không hợp lệ, vui lòng thử lại");
      }
      
      const response = await apiRequest("POST", "/api/withdrawal-request/verify", {
        otp,
        withdrawal_data: withdrawalData
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        toast({
          title: "Thành công",
          description: "Yêu cầu rút tiền đã được xử lý thành công",
          variant: "default"
        });
        resetForm();
        onSuccess();
      }
    },
    onError: (error: any) => {
      if (error.response?.data?.error?.code === "INVALID_OTP") {
        setAttemptsLeft(error.response.data.error.attempts_left || 0);
      }
      setError(error.message);
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Gửi lại mã OTP
  const { mutate: resendOtp, isPending: isResendingOtp } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/withdrawal-request/resend-otp", {});
      return response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        setMaskedEmail(data.data.email_masked);
        setOtpInput("");
        toast({
          title: "Đã gửi lại mã OTP",
          description: `Mã OTP mới đã được gửi đến ${data.data.email_masked}`,
          variant: "default"
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
    requestOtp();
  };
  
  const handleOtpComplete = (otp: string) => {
    setOtpInput(otp);
    verifyOtp(otp);
  };
  
  const handleOtpVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    verifyOtp(otpInput);
  };
  
  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const handleBackToInitial = () => {
    setCurrentStep("initial");
    setError(null);
  };
  
  const isLoading = isRequestingOtp || isVerifyingOtp || isResendingOtp;
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary-500" />
            <DialogTitle>Yêu cầu rút tiền hoa hồng</DialogTitle>
          </div>
          <DialogDescription>
            {currentStep === "initial" 
              ? "Điền thông tin bên dưới để yêu cầu rút tiền hoa hồng"
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
                    Số dư khả dụng: {formatCurrency(affiliate?.remaining_balance || 0)} VND
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
                  {maxAmount <= 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Bạn không thể rút tiền khi số dư hoa hồng tích lũy bằng 0.
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
                  {/* Đã loại bỏ thông báo về lệnh đang chờ xử lý */}
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
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="confirmBankInfo"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Xác nhận thông tin ngân hàng
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Tôi xác nhận thông tin tài khoản ngân hàng của tôi là chính xác và cập nhật.
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Ngân hàng:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {affiliate?.bank_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Số tài khoản:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {affiliate?.bank_account}
                  </span>
                </div>
              </div>
              
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleClose}>
                Hủy
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !amount || Number(amount) <= 0 || parseFloat(amount) > maxAmount || maxAmount <= 0}
              >
                {isLoading ? "Đang xử lý..." : "Tiếp tục"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleOtpVerifySubmit}>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <LockKeyhole className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Xác thực OTP</h3>
                <p className="text-sm text-muted-foreground">
                  Nhập mã 6 chữ số đã được gửi đến <span className="font-medium">{maskedEmail}</span>
                </p>
              </div>
              
              <div className="flex flex-col items-center space-y-4">
                <OtpInput 
                  length={6}
                  onComplete={handleOtpComplete}
                  disabled={isLoading || attemptsLeft <= 0}
                />
                
                <div className="flex items-center space-x-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => resendOtp()}
                    disabled={isLoading}
                  >
                    <RotateCcw className="mr-2 h-3 w-3" />
                    Gửi lại OTP
                  </Button>
                </div>
              </div>
              
              {attemptsLeft < 5 && (
                <Alert variant={attemptsLeft > 0 ? "default" : "destructive"}>
                  <AlertDescription>
                    {attemptsLeft > 0 
                      ? `Bạn còn ${attemptsLeft} lần thử còn lại.` 
                      : "Mã OTP đã bị vô hiệu hóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã mới."}
                  </AlertDescription>
                </Alert>
              )}
              
              <Alert variant="default" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <div className="flex">
                  <Mail className="h-4 w-4 text-blue-500 mr-2" />
                  <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                    Mã OTP sẽ hết hạn sau 5 phút. Nếu bạn không nhận được email, hãy kiểm tra thư mục spam hoặc nhấn "Gửi lại OTP".
                  </AlertDescription>
                </div>
              </Alert>
              
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <h4 className="text-sm font-medium mb-2">Chi tiết yêu cầu rút tiền:</h4>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Số tiền:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(parseFloat(amount))} VND
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Ngân hàng:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {affiliate?.bank_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Số tài khoản:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {affiliate?.bank_account}
                  </span>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={handleBackToInitial}
                disabled={isLoading}
              >
                Quay lại
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !otpInput || otpInput.length !== 6 || attemptsLeft <= 0}
              >
                {isLoading ? "Đang xác thực..." : "Xác nhận rút tiền"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
