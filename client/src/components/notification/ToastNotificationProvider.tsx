import { createContext, useContext, useState, ReactNode } from "react";
import { OtpVerificationAlert } from "./OtpVerificationAlert";

type NotificationType = "otpVerification" | null;

interface OtpVerificationData {
  email: string;
  otpData: {
    otpExpires?: string;
  };
  verifyEndpoint: string;
  resendEndpoint: string;
  requestData: any;
  refreshQueries: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ToastNotificationContextType {
  showOtpVerification: (data: OtpVerificationData) => void;
  hideNotification: () => void;
}

const ToastNotificationContext = createContext<ToastNotificationContextType | undefined>(undefined);

export function useToastNotification() {
  const context = useContext(ToastNotificationContext);
  if (!context) {
    throw new Error("useToastNotification must be used within a ToastNotificationProvider");
  }
  return context;
}

export function ToastNotificationProvider({ children }: { children: ReactNode }) {
  const [notificationType, setNotificationType] = useState<NotificationType>(null);
  const [otpVerificationData, setOtpVerificationData] = useState<OtpVerificationData | null>(null);

  const showOtpVerification = (data: OtpVerificationData) => {
    setOtpVerificationData(data);
    setNotificationType("otpVerification");
  };

  const hideNotification = () => {
    setNotificationType(null);
    setOtpVerificationData(null);
  };

  const handleOtpSuccess = () => {
    if (otpVerificationData?.onSuccess) {
      otpVerificationData.onSuccess();
    }
    hideNotification();
  };

  const handleOtpCancel = () => {
    if (otpVerificationData?.onCancel) {
      otpVerificationData.onCancel();
    }
    hideNotification();
  };

  return (
    <ToastNotificationContext.Provider
      value={{
        showOtpVerification,
        hideNotification
      }}
    >
      {children}

      {/* OTP Verification Alert */}
      {notificationType === "otpVerification" && otpVerificationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md mx-auto">
            <OtpVerificationAlert
              email={otpVerificationData.email}
              otpData={otpVerificationData.otpData}
              verifyEndpoint={otpVerificationData.verifyEndpoint}
              resendEndpoint={otpVerificationData.resendEndpoint}
              requestData={otpVerificationData.requestData}
              refreshQueries={otpVerificationData.refreshQueries}
              onVerificationSuccess={handleOtpSuccess}
              onVerificationCancel={handleOtpCancel}
            />
          </div>
        </div>
      )}
    </ToastNotificationContext.Provider>
  );
}