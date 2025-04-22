import BaseWithdrawalFlow from './BaseWithdrawalFlow';
import { useQueryClient } from '@tanstack/react-query';

interface AffiliateWithdrawalFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  affiliateData: any;
  balance: number;
}

/**
 * Specialized withdrawal flow for regular affiliates
 */
export default function AffiliateWithdrawalFlow({
  isOpen,
  onClose,
  onSuccess = () => {},
  affiliateData,
  balance
}: AffiliateWithdrawalFlowProps) {
  const queryClient = useQueryClient();
  
  // API endpoints specific to regular affiliates
  const apiEndpoints = {
    checkLimit: '/api/withdrawal-request/check-limit',
    sendOtp: '/api/withdrawal-request/send-otp',
    verifyOtp: '/api/withdrawal-request/verify',
    resendOtp: '/api/withdrawal-request/resend-otp',
  };
  
  // Query keys to invalidate on success
  const queryInvalidationKeys = [
    ['/api/affiliate'],
    ['/api/affiliates/top'] // Also refresh leaderboard
  ];
  
  const handleSuccess = () => {
    // Refresh data in addition to parent onSuccess
    queryClient.invalidateQueries({ queryKey: ['/api/affiliate'] });
    queryClient.invalidateQueries({ queryKey: ['/api/affiliates/top'] });
    
    // Call parent's onSuccess if provided
    onSuccess();
  };
  
  return (
    <BaseWithdrawalFlow
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={handleSuccess}
      userData={affiliateData}
      balance={balance}
      apiEndpoints={apiEndpoints}
      queryInvalidationKeys={queryInvalidationKeys}
    />
  );
}