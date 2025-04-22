import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// Định nghĩa schema cho form
const withdrawalSchema = z.object({
  amount: z
    .string()
    .min(1, "Vui lòng nhập số tiền")
    .refine(
      (val) => {
        const num = Number(val.replace(/,/g, ""));
        return !isNaN(num) && num > 0;
      },
      { message: "Số tiền phải lớn hơn 0" }
    ),
  note: z.string().optional(),
});

type WithdrawalFormValues = z.infer<typeof withdrawalSchema>;

// Định nghĩa kiểu dữ liệu cho kết quả API kiểm tra giới hạn rút tiền
interface WithdrawalLimitCheck {
  exceeds: boolean;
  totalWithdrawn: number;
  remainingLimit: number;
}

// Định nghĩa kiểu dữ liệu cho response từ API yêu cầu OTP
interface OtpResponse {
  message: string;
  otpExpires: string;
}

export function WithdrawalForm({ kolData }: { kolData: any }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [limitCheck, setLimitCheck] = useState<WithdrawalLimitCheck | null>(null);
  const [open, setOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Form xử lý
  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: "",
      note: "",
    },
  });

  // Kiểm tra giới hạn rút tiền
  const checkLimitMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/check-limit",
        { amount }
      );
      return (await response.json()) as WithdrawalLimitCheck;
    },
    onSuccess: (data) => {
      setLimitCheck(data);
      // Nếu không vượt quá giới hạn, hiển thị confirmation box
      if (!data.exceeds) {
        setWithdrawalAmount(Number(form.getValues().amount.replace(/,/g, "")));
        setOpen(true);
      } else {
        toast({
          variant: "destructive",
          title: "Vượt quá giới hạn rút tiền",
          description: `Bạn đã rút ${formatCurrency(data.totalWithdrawn)} trong ngày hôm nay. Hạn mức còn lại: ${formatCurrency(data.remainingLimit)}`,
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Lỗi kiểm tra giới hạn rút tiền",
        description: error.message,
      });
    },
  });

  // Gửi yêu cầu OTP
  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/send-otp",
        {
          amount: withdrawalAmount,
        }
      );
      return (await response.json()) as OtpResponse;
    },
    onSuccess: (data) => {
      setOtpSent(true);
      toast({
        title: "Đã gửi mã OTP",
        description: `${data.message}. Mã OTP có hiệu lực đến ${new Date(data.otpExpires).toLocaleTimeString()}`,
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Lỗi gửi mã OTP",
        description: error.message,
      });
    },
  });

  // Xác minh OTP và hoàn tất yêu cầu rút tiền
  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/kol/withdrawal-request/verify",
        {
          otp: otpCode,
          amount: withdrawalAmount,
          note: form.getValues().note,
        }
      );
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Yêu cầu rút tiền thành công",
        description: "Yêu cầu rút tiền của bạn đã được gửi đi và đang được xử lý.",
      });
      // Reset form và state
      form.reset();
      setOtpSent(false);
      setOtpCode("");
      setLimitCheck(null);
      setOpen(false);
      // Làm mới dữ liệu
      queryClient.invalidateQueries({ queryKey: ["/api/kol/me"] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Lỗi xác minh OTP",
        description: error.message,
      });
    },
  });

  // Xử lý khi submit form
  async function onSubmit(values: WithdrawalFormValues) {
    try {
      // Chuyển đổi số tiền từ chuỗi thành số
      const amount = Number(values.amount.replace(/,/g, ""));
      
      // Lấy số dư hiện tại từ financial summary API
      const financialSummaryResponse = await apiRequest(
        "GET", 
        `/api/kol/${kolData.affiliate_id}/financial-summary?period=month`
      );
      const financialSummaryData = await financialSummaryResponse.json();
      const currentBalance = financialSummaryData.status === "success" 
        ? financialSummaryData.data.currentBalance
        : kolData.remaining_balance;
      
      // Kiểm tra xem số tiền có lớn hơn số dư không
      if (amount > currentBalance) {
        toast({
          variant: "destructive",
          title: "Số tiền không hợp lệ",
          description: `Số tiền rút không thể lớn hơn số dư hiện tại (${formatCurrency(currentBalance)})`,
        });
        return;
      }
      
      // Kiểm tra giới hạn rút tiền
      checkLimitMutation.mutate(amount);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi xử lý yêu cầu",
        description: "Đã xảy ra lỗi khi xử lý yêu cầu rút tiền. Vui lòng thử lại sau.",
      });
    }
  }

  // Xử lý khi nhập số tiền để tự động định dạng
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Chỉ giữ lại các chữ số
    let value = e.target.value.replace(/\D/g, "");
    
    // Định dạng số với dấu phân cách hàng nghìn
    if (value) {
      value = Number(value).toLocaleString("vi-VN");
    }
    
    form.setValue("amount", value, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Yêu cầu rút tiền</CardTitle>
          <CardDescription>
            Tạo yêu cầu rút tiền hoa hồng về tài khoản ngân hàng của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Số dư hiện tại:
                  </span>
                  <span className="font-bold text-primary">
                    <CurrentBalanceDisplay kolData={kolData} />
                  </span>
                </div>

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số tiền muốn rút (VND)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nhập số tiền..."
                          onChange={handleAmountChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ghi chú (không bắt buộc)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Nhập ghi chú nếu cần..."
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                <p>
                  Lưu ý: Yêu cầu rút tiền sẽ được xử lý trong vòng 24 giờ làm việc.
                </p>
                <p>
                  Hạn mức rút tiền tối đa mỗi ngày là{" "}
                  <span className="font-medium">20.000.000 VND</span>. Yêu cầu từ 2.000.000 VND trở lên sẽ áp dụng thuế thu nhập cá nhân 10%.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  form.formState.isSubmitting ||
                  checkLimitMutation.isPending ||
                  !form.formState.isValid ||
                  kolData.remaining_balance <= 0
                }
              >
                {(form.formState.isSubmitting || checkLimitMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Tạo yêu cầu rút tiền
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Dialog xác nhận và OTP */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận yêu cầu rút tiền</DialogTitle>
            <DialogDescription>
              {otpSent
                ? "Vui lòng nhập mã OTP đã được gửi đến email của bạn"
                : "Vui lòng xác nhận thông tin yêu cầu rút tiền"}
            </DialogDescription>
          </DialogHeader>

          {!otpSent ? (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <span className="text-sm font-medium">Người nhận:</span>
                  <span className="text-sm">{kolData.full_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <span className="text-sm font-medium">Tài khoản:</span>
                  <span className="text-sm">
                    {kolData.bank_account} - {kolData.bank_name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <span className="text-sm font-medium">Số tiền:</span>
                  <span className="text-sm font-bold text-primary">
                    {formatCurrency(withdrawalAmount)}
                  </span>
                </div>

                {withdrawalAmount >= 2000000 && (
                  <div className="flex items-start gap-2 mt-2 p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">
                        Thuế thu nhập cá nhân
                      </p>
                      <p className="text-amber-700">
                        Số tiền rút trên 2 triệu đồng sẽ bị khấu trừ 10% thuế
                        TNCN theo quy định. Số tiền thực nhận sẽ là{" "}
                        <span className="font-medium">
                          {formatCurrency(
                            withdrawalAmount >= 2000000
                              ? withdrawalAmount * 0.9
                              : withdrawalAmount
                          )}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row sm:justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className="mt-2 sm:mt-0"
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  onClick={() => sendOtpMutation.mutate()}
                  disabled={sendOtpMutation.isPending}
                  className="mt-2 sm:mt-0"
                >
                  {sendOtpMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Gửi OTP xác nhận
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label
                    htmlFor="otp"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Mã OTP
                  </label>
                  <Input
                    id="otp"
                    placeholder="Nhập mã OTP 6 chữ số"
                    className="text-center text-lg tracking-widest"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").substring(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() => setOtpSent(false)}
                  disabled={verifyOtpMutation.isPending}
                  className="mt-2 sm:mt-0"
                >
                  Quay lại
                </Button>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <Button
                    variant="secondary"
                    onClick={() => sendOtpMutation.mutate()}
                    disabled={
                      sendOtpMutation.isPending || verifyOtpMutation.isPending
                    }
                  >
                    {sendOtpMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Gửi lại OTP
                  </Button>
                  <Button
                    onClick={() => {
                      setIsVerifying(true);
                      verifyOtpMutation.mutate();
                    }}
                    disabled={
                      verifyOtpMutation.isPending ||
                      sendOtpMutation.isPending ||
                      otpCode.length !== 6
                    }
                  >
                    {verifyOtpMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {!isVerifying && "Xác nhận"}
                    {isVerifying && "Đang xác nhận..."}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}