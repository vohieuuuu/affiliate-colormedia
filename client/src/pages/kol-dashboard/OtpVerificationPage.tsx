import { useState, useEffect, startTransition } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OtpInput } from "@/components/OtpInput";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Key, AlertTriangle, Check, RotateCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function OtpVerificationPage() {
  const [location, navigate] = useLocation();
  const [otpInput, setOtpInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Xử lý URL query params bên ngoài useEffect để tránh lỗi tải hai lần
  const getQueryParams = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const amountParam = params.get("amount") || "";
      const affiliateIdParam = params.get("affiliateId") || "";
      const requestIdParam = params.get("requestId") || "";
      
      // Check if we have required params
      const hasParams = !!amountParam && !!affiliateIdParam && !!requestIdParam;
      
      return {
        amount: amountParam,
        affiliateId: affiliateIdParam,
        requestId: requestIdParam,
        hasRequiredParams: hasParams
      };
    } catch (error) {
      console.error("Error parsing URL parameters:", error);
      return {
        amount: "",
        affiliateId: "",
        requestId: "",
        hasRequiredParams: false
      };
    }
  };
  
  // Lấy dữ liệu từ URL chỉ một lần khi component khởi tạo
  const { amount, affiliateId, requestId, hasRequiredParams } = getQueryParams();
  
  // Log kết quả phân tích URL cho mục đích debug
  console.log("OTP Verification page initialized with params:", {
    amount,
    affiliateId,
    requestId,
    hasRequiredParams
  });
  
  // Verify OTP
  const { mutate: verifyOtp, isPending: isVerifying } = useMutation({
    mutationFn: async (otp: string) => {
      console.log("Verifying OTP:", otp);
      console.log("Sending OTP verification request with params:", {
        otp,
        requestId,
        amount // Thêm tham số amount từ URL
      });
      
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/verify",
        {
          otp,
          requestId,
          amount: parseFloat(amount) // Thêm số tiền từ URL query param
        }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("OTP verification response:", data);
      if (data.status === "success") {
        // Show success toast
        toast({
          title: "Yêu cầu rút tiền đã được xác nhận",
          description: "Yêu cầu rút tiền của bạn đã được xác nhận và đang được xử lý.",
          variant: "default"
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/kol/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/kol", affiliateId, "financial-summary"] });
        
        // Chuyển hướng đến trang dashboard KOL bằng window.location thay vì Navigate của React Router
        console.log("Navigating to KOL dashboard after successful verification");
        
        // Sử dụng window.location để tránh các vấn đề với React routing
        window.location.href = "/kol-dashboard";
      } else if (data.error) {
        setError(data.error.message || "Mã OTP không chính xác");
        toast({
          variant: "destructive",
          title: "Lỗi xác thực",
          description: data.error.message || "Mã OTP không chính xác",
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
  
  // Resend OTP
  const { mutate: resendOtp, isPending: isResending } = useMutation({
    mutationFn: async () => {
      console.log("Resending OTP for request ID:", requestId);
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/send-otp",
        { requestId }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Resend OTP response:", data);
      if (data.status === "success") {
        // Update masked email if available
        if (data.data?.email_masked) {
          setMaskedEmail(data.data.email_masked);
        }
        
        toast({
          title: "Mã OTP mới đã được gửi",
          description: `Mã OTP mới đã được gửi đến ${maskedEmail || "email của bạn"}. Mã có hiệu lực trong 5 phút.`,
        });
      } else if (data.error) {
        setError(data.error.message || "Không thể gửi lại mã OTP");
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: data.error.message || "Không thể gửi lại mã OTP",
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
  
  // Handle OTP submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.length === 6) {
      setError(null);
      verifyOtp(otpInput);
    } else {
      setError("Vui lòng nhập đủ 6 chữ số OTP");
    }
  };
  
  // Effect to handle missing parameters and fetch user data - runs only once on mount
  useEffect(() => {
    // Define a flag to track if component is mounted
    let isMounted = true;
    
    const handleInitialization = async () => {
      // Check if we have all required params
      if (!hasRequiredParams && isMounted) {
        toast({
          title: "Lỗi tham số",
          description: "Thiếu thông tin cần thiết để xác thực OTP. Vui lòng thử lại từ đầu.",
          variant: "destructive"
        });
        
        // Redirect back to withdrawal page after delay
        const timeout = setTimeout(() => {
          if (isMounted) {
            startTransition(() => {
              navigate("/kol-withdrawal");
            });
          }
        }, 3000);
        
        return () => {
          clearTimeout(timeout);
          isMounted = false;
        };
      }
      
      // Only continue if we have required params
      if (isMounted) {
        // Try to get email from data stored during the withdrawal process
        const withdrawalData = queryClient.getQueryData<any>(["kolWithdrawalData"]);
        if (withdrawalData?.maskedEmail && isMounted) {
          setMaskedEmail(withdrawalData.maskedEmail);
        } else {
          // Mask email format if we have user data
          const userData = queryClient.getQueryData<any>(["/api/kol/me"]);
          if (userData?.email && isMounted) {
            const email = userData.email;
            setMaskedEmail(email.replace(/^(.)(.*)(@.*)$/, "$1***$3"));
          }
        }
      }
    };
    
    handleInitialization();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - run only once on mount
  
  // Cancel verification and go back
  const handleCancel = () => {
    startTransition(() => {
      navigate("/kol-withdrawal");
    });
  };
  
  if (!hasRequiredParams) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Thiếu thông tin xác thực</h2>
        <p className="text-muted-foreground text-center max-w-md mb-4">
          Không tìm thấy thông tin cần thiết để xác thực OTP. 
          Bạn sẽ được chuyển hướng về trang rút tiền trong vài giây.
        </p>
        <Button onClick={() => startTransition(() => navigate("/kol-withdrawal"))}>
          Quay lại trang rút tiền
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 max-w-md">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Xác thực OTP</CardTitle>
          </div>
          <CardDescription>
            Nhập mã OTP đã được gửi đến email của bạn để xác thực yêu cầu rút tiền
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <Mail className="h-8 w-8 text-primary" />
                <h3 className="text-lg font-semibold">Xác thực OTP</h3>
                <p className="text-sm text-muted-foreground">
                  Mã xác thực đã được gửi đến email<br/>
                  <span className="font-medium">{maskedEmail || "của bạn"}</span>
                </p>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="otp">Mã OTP</Label>
              <div className="flex flex-col items-center space-y-3">
                <OtpInput 
                  length={6}
                  onComplete={(value) => {
                    console.log("OTP completed:", value);
                    setOtpInput(value);
                  }}
                  disabled={isVerifying}
                  className="justify-center"
                />
                <div className="flex items-center text-sm text-muted-foreground">
                  <Key className="h-4 w-4 mr-1" />
                  <span>Vui lòng nhập đủ 6 chữ số OTP</span>
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
                  <span className="font-medium">{formatCurrency(parseFloat(amount))} VND</span>
                </div>
                {parseFloat(amount) > 2000000 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Thuế TNCN (10%):</span>
                      <span className="font-medium text-amber-600">- {formatCurrency(parseFloat(amount) * 0.1)} VND</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Thực nhận:</span>
                      <span className="font-medium text-green-600">{formatCurrency(parseFloat(amount) * 0.9)} VND</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-1"
                onClick={() => resendOtp()}
                disabled={isResending || isVerifying}
              >
                {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Gửi lại mã
              </Button>
              
              <Button
                type="submit"
                className="flex items-center gap-1"
                disabled={isVerifying || otpInput.length !== 6}
              >
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Xác nhận
              </Button>
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-4">
          <Button variant="ghost" onClick={handleCancel}>
            Quay lại
          </Button>
          <p className="text-xs text-muted-foreground">
            Yêu cầu rút tiền sẽ bị hủy nếu không xác thực OTP trong vòng 15 phút.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}