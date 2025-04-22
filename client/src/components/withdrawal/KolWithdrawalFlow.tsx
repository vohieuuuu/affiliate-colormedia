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
  
  // API endpoints specific to KOL/VIP affiliates
  const apiEndpoints = {
    checkLimit: '/api/kol/withdrawal/check-limit',
    sendOtp: '/api/kol/withdrawal/send-otp',
    verifyOtp: '/api/kol/withdrawal/verify',
    resendOtp: '/api/kol/withdrawal/resend-otp'
  };
  
  // Query keys to invalidate on success
  const queryInvalidationKeys = [
    ['/api/kol/me'],
    ['/api/kol', kolData?.affiliate_id, 'financial-summary']
  ];
  
  const handleSuccess = () => {
    // Refresh data in addition to parent onSuccess
    queryClient.invalidateQueries({ queryKey: ['/api/kol/me'] });
    if (kolData?.affiliate_id) {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/kol', kolData.affiliate_id, 'financial-summary'] 
      });
    }
    
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
    />
  );
}