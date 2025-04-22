import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign, Loader2 } from "lucide-react";
import KolWithdrawalFlow from "@/components/withdrawal/KolWithdrawalFlow";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

interface WithdrawalRequestProps {
  kolData: any;
  balance: number;
}

export function WithdrawalRequest({ kolData, balance: initialBalance }: WithdrawalRequestProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number>(initialBalance);

  // Fetch real-time balance directly in this component to ensure accuracy
  const { data: financialData, isLoading } = useQuery({
    queryKey: ["/api/kol", kolData?.affiliate_id, "financial-summary-direct"],
    queryFn: async () => {
      try {
        console.log("Fetching financial summary directly in WithdrawalRequest with affiliate_id:", kolData?.affiliate_id);
        
        const response = await apiRequest(
          "GET", 
          `/api/kol/${kolData.affiliate_id}/financial-summary?period=month`
        );
        const data = await response.json();
        console.log("Financial summary API response (direct):", data);
        
        if (data.status === "success") {
          return data.data;
        }
        return null;
      } catch (error) {
        console.error("Error fetching financial summary directly:", error);
        return null;
      }
    },
    enabled: !!kolData?.affiliate_id,
  });

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

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleSuccess = () => {
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
          {isLoading ? (
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
      
      {modalOpen && (
        <KolWithdrawalFlow
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          kolData={kolData}
          balance={currentBalance}
        />
      )}
    </div>
  );
}