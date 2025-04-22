import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, LockKeyhole, RotateCcw, Mail, AlertTriangle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface KolWithdrawalOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  kolData: any;
  withdrawalData: {
    amount: number;
    note?: string;
    tax_id?: string;
  };
}

export default function KolWithdrawalOtpModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  kolData,
  withdrawalData
}: KolWithdrawalOtpModalProps) {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [otpInput, setOtpInput] = useState<string>("");
  const [attemptsLeft, setAttemptsLeft] = useState<number>(5);
  const [sentOtp, setSentOtp] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Track when the modal is actually visible in the DOM
  const [modalMounted, setModalMounted] = useState<boolean>(false);
  
  // Reset state when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      // Modal is being opened
      setModalMounted(true);
      setSentOtp(false);
      setOtpInput("");
      setError(null);
      setIsLoading(false);
      
      // Mask email for UI display (example: j***@example.com)
      const email = kolData.email;
      const maskedEmail = email ? email.replace(/^(.)(.*)(@.*)$/, "$1***$3") : "your email";
      setMaskedEmail(maskedEmail);
    } else {
      // Reset on close with a delay to avoid UI flicker
      setTimeout(() => {
        setModalMounted(false);
        setSentOtp(false);
        setOtpInput("");
        setError(null);
        setIsLoading(false);
      }, 300);
    }
  }, [isOpen, kolData.email]);
  
  // Send OTP when modal is mounted and visible
  useEffect(() => {
    if (modalMounted && isOpen && !sentOtp) {
      console.log("Modal mounted and visible, sending OTP");
      sendOtp();
    }
  }, [modalMounted, isOpen, sentOtp]);
  
  // Send OTP request
  const { mutate: sendOtp, isPending: isSendingOtp } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      console.log("Sending OTP for amount:", withdrawalData.amount);
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/send-otp",
        {
          amount: withdrawalData.amount,
          note: withdrawalData.note || "",
          tax_id: withdrawalData.tax_id || "",
        }
      );
      const result = await response.json();
      console.log("Send OTP response in OTP Modal:", result);
      return result;
    },
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.status === "success") {
        setSentOtp(true);
        
        toast({
          title: "Mã OTP đã được gửi",
          description: `Mã OTP đã được gửi đến ${maskedEmail}. Mã có hiệu lực trong 5 phút.`,
        });
      } else {
        setError(data.error?.message || "Có lỗi xảy ra khi gửi OTP");
        setSentOtp(false);
      }
    },
    onError: (error: Error) => {
      setIsLoading(false);
      setError(error.message);
      setSentOtp(false);
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Verify OTP and complete withdrawal
  const { mutate: verifyOtp, isPending: isVerifyingOtp } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      console.log("Verifying OTP:", otpInput, "for amount:", withdrawalData.amount);
      
      if (!otpInput || otpInput.length !== 6) {
        throw new Error("Vui lòng nhập đầy đủ mã OTP 6 chữ số");
      }
      
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/verify",
        {
          otp: otpInput,
          amount: withdrawalData.amount,
          note: withdrawalData.note || "",
          tax_id: withdrawalData.tax_id || "",
        }
      );
      
      return await response.json();
    },
    onSuccess: (data) => {
      setIsLoading(false);
      console.log("OTP verification response:", data);
      
      if (data.status === "success") {
        // Invalidate cache to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/kol/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/kol', kolData.affiliate_id, 'financial-summary'] });
        
        // Optionally, you could forward the webhook URL to admin
        if (data.data?.webhook_url) {
          console.log("Webhook URL for admin:", data.data.webhook_url);
        }
        
        toast({
          title: "Thành công",
          description: "Yêu cầu rút tiền đã được xử lý thành công",
        });
        
        onSuccess();
      } else {
        setError(data.error?.message || "Có lỗi xảy ra khi xác thực OTP");
      }
    },
    onError: (error: any) => {
      setIsLoading(false);
      console.error("OTP verification error:", error);
      
      // Check for specific OTP error to show appropriate message
      if (error.response?.data?.error?.code === "INVALID_OTP") {
        const attempts = error.response.data.error.attempts_left || 0;
        setAttemptsLeft(attempts);
        setError(`Mã OTP không hợp lệ. Bạn còn ${attempts} lần thử.`);
      } else {
        setError(error.message);
      }
      
      toast({
        title: "Lỗi xác thực OTP",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Resend OTP
  const { mutate: resendOtp, isPending: isResendingOtp } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      // Reset OTP state
      setSentOtp(false);
      setOtpInput("");
      
      // Sử dụng lại API sendOTP ban đầu
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/send-otp",
        {
          amount: withdrawalData.amount,
          note: withdrawalData.note || "",
          tax_id: withdrawalData.tax_id || "",
        }
      );
      const result = await response.json();
      console.log("Resend OTP response:", result);
      return result;
    },
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.status === "success") {
        // Reset input OTP để người dùng nhập OTP mới
        setOtpInput("");
        setSentOtp(true);
        
        toast({
          title: "Đã gửi lại mã OTP",
          description: `Mã OTP mới đã được gửi đến ${maskedEmail}`,
        });
      } else {
        setError(data.error?.message || "Có lỗi xảy ra khi gửi lại OTP");
        setSentOtp(false);
      }
    },
    onError: (error: Error) => {
      setIsLoading(false);
      setError(error.message);
      setSentOtp(false);
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleOtpVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    verifyOtp();
  };
  
  // Xử lý khi người dùng đóng modal
  const handleClose = () => {
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <DialogTitle>Xác thực OTP</DialogTitle>
          </div>
          <DialogDescription>
            Nhập mã OTP đã được gửi đến email của bạn để xác thực yêu cầu rút tiền
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleOtpVerifySubmit}>
          <div className="grid gap-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <Mail className="h-8 w-8 text-primary" />
                <h3 className="text-lg font-semibold">Xác thực OTP</h3>
                <p className="text-sm text-muted-foreground">
                  Mã xác thực đã được gửi đến email<br/>
                  <span className="font-medium">{maskedEmail}</span>
                </p>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="otp">Mã OTP</Label>
              <div className="relative">
                <Input
                  id="otp"
                  type="text"
                  placeholder="Nhập mã OTP 6 chữ số"
                  value={otpInput}
                  onChange={(e) => {
                    // Only allow numbers and limit to 6 digits
                    const value = e.target.value.replace(/\D/g, '').substring(0, 6);
                    setOtpInput(value);
                  }}
                  required
                  maxLength={6}
                  className="pl-10"
                  disabled={isLoading}
                  autoFocus
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Nhập mã 6 chữ số được gửi đến email của bạn. Mã có hiệu lực trong 5 phút.
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label>Chi tiết yêu cầu rút tiền</Label>
              <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền:</span>
                  <span className="font-medium">{formatCurrency(withdrawalData.amount)} VND</span>
                </div>
                {withdrawalData.amount > 2000000 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Thuế TNCN (10%):</span>
                      <span className="font-medium text-amber-600">-{formatCurrency(withdrawalData.amount * 0.1)} VND</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Thực nhận:</span>
                      <span className="font-medium text-green-600">{formatCurrency(withdrawalData.amount * 0.9)} VND</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngân hàng:</span>
                  <span className="font-medium">{kolData?.bank_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tài khoản:</span>
                  <span className="font-medium">{kolData?.bank_account}</span>
                </div>
                {withdrawalData.note && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ghi chú:</span>
                    <span className="font-medium">{withdrawalData.note}</span>
                  </div>
                )}
                {withdrawalData.tax_id && withdrawalData.amount > 2000000 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MST cá nhân:</span>
                    <span className="font-medium">{withdrawalData.tax_id}</span>
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
          </div>
          
          <DialogFooter className="gap-3 sm:gap-0">
            <Button 
              variant="outline" 
              type="button" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || otpInput.length !== 6}
            >
              {isVerifyingOtp ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LockKeyhole className="mr-2 h-4 w-4" />
              )}
              Xác nhận rút tiền
            </Button>
          </DialogFooter>
          
          <div className="flex flex-col items-center space-y-4 mt-6">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1 text-primary"
              onClick={() => resendOtp()} 
              disabled={isLoading}
            >
              {isResendingOtp ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              Gửi lại mã OTP
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}