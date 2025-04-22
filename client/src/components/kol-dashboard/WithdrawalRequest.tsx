import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import KolWithdrawalModal from "./KolWithdrawalModal";

interface WithdrawalRequestProps {
  kolData: any;
  balance: number;
}

export function WithdrawalRequest({ kolData, balance }: WithdrawalRequestProps) {
  const [modalOpen, setModalOpen] = useState(false);

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
      
      <Button 
        onClick={handleOpenModal} 
        className="w-full"
        disabled={balance <= 0}
      >
        <DollarSign className="mr-2 h-4 w-4" />
        Tạo yêu cầu rút tiền
      </Button>
      
      {balance <= 0 && (
        <div className="text-xs text-amber-600">
          Bạn không thể tạo yêu cầu rút tiền khi số dư bằng 0.
        </div>
      )}
      
      <KolWithdrawalModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        kolData={kolData}
        balance={balance}
      />
    </div>
  );
}