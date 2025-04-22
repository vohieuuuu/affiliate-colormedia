import BaseWithdrawalFlow from './BaseWithdrawalFlow';
import { useQueryClient } from '@tanstack/react-query';

interface KolWithdrawalFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  kolData: any;
  balance: number;
}

/**
 * Specialized withdrawal flow for KOL/VIP affiliates
 */
export default function KolWithdrawalFlow({
  isOpen,
  onClose,
  onSuccess = () => {},
  kolData,
  balance
}: KolWithdrawalFlowProps) {
  const queryClient = useQueryClient();
  
  // API endpoints specific to KOL/VIP
  const apiEndpoints = {
    checkLimit: '/api/kol/withdrawal-request/check-limit',
    sendOtp: '/api/kol/withdrawal-request/send-otp',
    verifyOtp: '/api/kol/withdrawal-request/verify',
    // No separate resendOtp endpoint, will reuse sendOtp
  };
  
  // Query keys to invalidate on success
  const queryInvalidationKeys = [
    ['/api/kol/me'],
    ['/api/kol', kolData?.affiliate_id, 'financial-summary']
  ];
  
  const handleSuccess = () => {
    // Refresh data in addition to parent onSuccess
    queryClient.invalidateQueries({ queryKey: ['/api/kol/me'] });
    queryClient.invalidateQueries({ queryKey: ['/api/kol', kolData?.affiliate_id, 'financial-summary'] });
    
    // Call parent's onSuccess if provided
    onSuccess();
  };
  
  return (
    <BaseWithdrawalFlow
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={handleSuccess}
      userData={kolData}
      balance={balance}
      apiEndpoints={apiEndpoints}
      queryInvalidationKeys={queryInvalidationKeys}
      // Custom withdrawals today calculation if needed:
      // getTodayWithdrawals={(userData) => {}}
    />
  );
}