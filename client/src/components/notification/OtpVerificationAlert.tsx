import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/OtpInput";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw, LockKeyhole, AlertTriangle, CheckCircle2 } from "lucide-react";

interface OtpVerificationAlertProps {
  email: string;
  otpData: {
    otpExpires?: string;
  };
  onVerificationSuccess: () => void;
  onVerificationCancel: () => void;
  verifyEndpoint: string;
  resendEndpoint: string;
  requestData: any;
  refreshQueries: string[];
}

export function OtpVerificationAlert({
  email,
  otpData,
  onVerificationSuccess,
  onVerificationCancel,
  verifyEndpoint,
  resendEndpoint,
  requestData,
  refreshQueries = []
}: OtpVerificationAlertProps) {
  const { toast } = useToast();
  const [otp, setOtp] = useState<string>("");
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const [otpTimer, setOtpTimer] = useState<number>(300); // 5 minutes default
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Mask email for display
  useEffect(() => {
    if (email) {
      const atIndex = email.indexOf('@');
      if (atIndex > 1) {
        const firstChar = email.charAt(0);
        const domain = email.substring(atIndex);
        setMaskedEmail(`${firstChar}${'*'.repeat(atIndex - 1)}${domain}`);
      } else {
        setMaskedEmail(email);
      }
    }
  }, [email]);

  // Handle OTP timer
  useEffect(() => {
    if (otpData?.otpExpires) {
      const expiryTime = new Date(otpData.otpExpires).getTime();
      const now = new Date().getTime();
      const remainingTime = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setOtpTimer(remainingTime);
    }

    const timer = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [otpData]);

  // Verify OTP
  const { mutate: verifyOtp, isPending: isVerifying } = useMutation({
    mutationFn: async () => {
      if (!otp || otp.length !== 6) {
        throw new Error("Vui lòng nhập đầy đủ mã OTP 6 chữ số");
      }

      const response = await apiRequest("POST", verifyEndpoint, {
        ...requestData,
        otp
      });

      return await response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        setSuccess(true);
        setError(null);

        // Invalidate queries to refresh data
        refreshQueries.forEach(query => {
          queryClient.invalidateQueries({ queryKey: [query] });
        });

        toast({
          title: "Xác thực thành công",
          description: "Yêu cầu của bạn đã được xử lý",
        });

        // Notify parent component
        setTimeout(() => {
          onVerificationSuccess();
        }, 1500);
      } else {
        setError(data.error?.message || "Có lỗi xảy ra khi xác thực OTP");
      }
    },
    onError: (error: any) => {
      console.error("OTP verification error:", error);
      setError(error.message || "Có lỗi xảy ra khi xác thực OTP");
      
      toast({
        title: "Lỗi xác thực",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Resend OTP
  const { mutate: resendOtp, isPending: isResending } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", resendEndpoint, requestData);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        setOtp("");
        
        // Reset timer if new expiry provided
        if (data.data?.otpExpires) {
          const expiryTime = new Date(data.data.otpExpires).getTime();
          const now = new Date().getTime();
          const remainingTime = Math.max(0, Math.floor((expiryTime - now) / 1000));
          setOtpTimer(remainingTime);
        } else {
          // Default to 5 minutes if no expiry provided
          setOtpTimer(300);
        }
        
        toast({
          title: "Đã gửi lại mã OTP",
          description: `Mã OTP mới đã được gửi đến ${maskedEmail}`,
        });
      } else {
        setError(data.error?.message || "Có lỗi xảy ra khi gửi lại OTP");
      }
    },
    onError: (error: any) => {
      setError(error.message || "Có lỗi xảy ra khi gửi lại OTP");
      
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Format timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    verifyOtp();
  };

  return (
    <Alert className="relative p-6 border-2 border-primary/20 bg-card shadow-lg">
      {success ? (
        <div className="flex flex-col items-center gap-4 py-3 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <AlertDescription className="text-lg font-medium">
            Xác thực OTP thành công!
          </AlertDescription>
          <p className="text-sm text-muted-foreground">
            Yêu cầu của bạn đang được xử lý...
          </p>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center mb-2 text-center">
            <LockKeyhole className="h-10 w-10 text-primary mb-2" />
            <AlertDescription className="text-lg font-medium mb-1">
              Nhập mã OTP
            </AlertDescription>
            <p className="text-sm text-muted-foreground">
              Mã xác thực đã được gửi đến email <span className="font-medium">{maskedEmail}</span>
            </p>
            {otpTimer > 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                Mã OTP sẽ hết hạn sau {formatTime(otpTimer)}
              </p>
            ) : (
              <p className="text-xs text-destructive mt-1">
                Mã OTP đã hết hạn, vui lòng gửi lại mã mới
              </p>
            )}
          </div>
          
          <div className="w-full py-2">
            <OtpInput
              length={6}
              onComplete={setOtp}
              disabled={isVerifying}
              className="justify-center gap-2"
              inputClassName="w-10 h-12 text-center text-lg"
            />
          </div>
          
          {error && (
            <div className="flex items-center gap-1 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="flex flex-col items-center gap-3 mt-2">
            <Button
              type="submit"
              disabled={isVerifying || otp.length !== 6 || otpTimer <= 0}
              className="w-full"
            >
              {isVerifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LockKeyhole className="mr-2 h-4 w-4" />
              )}
              Xác nhận
            </Button>
            
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onVerificationCancel}
                disabled={isVerifying || isResending}
              >
                Hủy
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => resendOtp()}
                disabled={isResending || otpTimer > 240}
              >
                {isResending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Gửi lại mã
              </Button>
            </div>
          </div>
        </form>
      )}
    </Alert>
  );
}