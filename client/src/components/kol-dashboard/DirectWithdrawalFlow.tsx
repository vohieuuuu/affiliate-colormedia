import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import KolWithdrawalModalV2 from './KolWithdrawalModalV2';
import KolWithdrawalOtpModal from './KolWithdrawalOtpModal';

interface DirectWithdrawalFlowProps {
  kolData: any;
  balance: number;
  onSuccess?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Điều phối luồng rút tiền tổng thể, quản lý chuyển đổi giữa các modal
 * và đảm bảo duy trì trạng thái chính xác giữa các bước
 */
export default function DirectWithdrawalFlow({
  kolData,
  balance,
  onSuccess,
  isOpen,
  onClose
}: DirectWithdrawalFlowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Theo dõi trạng thái của hai modal
  const [showInitialModal, setShowInitialModal] = useState<boolean>(false);
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [withdrawalData, setWithdrawalData] = useState<any>(null);

  useEffect(() => {
    // Khi parent component mở modal, hiển thị modal ban đầu
    if (isOpen) {
      setShowInitialModal(true);
      setShowOtpModal(false);
      setWithdrawalData(null);
    } else {
      // Reset khi đóng từ parent
      setShowInitialModal(false);
      setShowOtpModal(false);
      setWithdrawalData(null);
    }
  }, [isOpen]);

  // Xử lý khi modal ban đầu gửi dữ liệu rút tiền
  const handleInitialSubmit = (data: any) => {
    console.log("Initial withdrawal modal submitted with data:", data);
    setWithdrawalData(data);
    
    // Đóng modal ban đầu
    setShowInitialModal(false);
    
    // Đợi một chút trước khi mở modal OTP để đảm bảo modal đầu tiên đã đóng hoàn toàn
    setTimeout(() => {
      setShowOtpModal(true);
    }, 300);
  };

  // Xử lý khi modal OTP đóng (hủy hoặc hoàn thành)
  const handleOtpClose = () => {
    setShowOtpModal(false);
    
    // Nếu chúng ta đóng OTP modal và không mở modal ban đầu, thì chúng ta đóng toàn bộ luồng
    if (!showInitialModal) {
      onClose();
    }
  };

  // Xử lý khi OTP được xác thực thành công
  const handleOtpSuccess = () => {
    // Reset trạng thái
    setShowOtpModal(false);
    setWithdrawalData(null);
    
    // Làm mới dữ liệu
    queryClient.invalidateQueries({ queryKey: ['/api/kol/me'] });
    queryClient.invalidateQueries({ queryKey: ['/api/kol', kolData.affiliate_id, 'financial-summary'] });
    
    // Thông báo thành công
    toast({
      title: 'Thành công',
      description: 'Yêu cầu rút tiền đã được xử lý thành công',
    });
    
    // Gọi callback thành công của parent component
    if (onSuccess) onSuccess();
    
    // Đóng toàn bộ luồng
    onClose();
  };

  // Xử lý khi đóng modal ban đầu
  const handleInitialClose = () => {
    setShowInitialModal(false);
    onClose();
  };

  return (
    <>
      {/* Modal nhập thông tin rút tiền */}
      <KolWithdrawalModalV2
        isOpen={showInitialModal}
        onClose={handleInitialClose}
        onSubmit={handleInitialSubmit}
        kolData={kolData}
        balance={balance}
      />
      
      {/* Modal xác thực OTP */}
      {withdrawalData && (
        <KolWithdrawalOtpModal
          isOpen={showOtpModal}
          onClose={handleOtpClose}
          onSuccess={handleOtpSuccess}
          kolData={kolData}
          withdrawalData={withdrawalData}
        />
      )}
    </>
  );
}