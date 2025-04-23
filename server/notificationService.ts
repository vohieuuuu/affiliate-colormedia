/**
 * Dịch vụ gửi thông báo webhook
 * Được sử dụng để gửi thông báo khi người dùng hoàn tất rút tiền sau khi xác thực OTP
 */

import axios from 'axios';
import { WithdrawalRequestPayload } from '@shared/schema';

// URL webhook cho thông báo rút tiền thành công
const WITHDRAWAL_WEBHOOK_URL = 'https://aicolormedia.app.n8n.cloud/webhook-test/ed7c937c-4157-4145-9c57-b3935c218b81';

/**
 * Gửi thông báo rút tiền thành công
 * @param withdrawalData Dữ liệu yêu cầu rút tiền
 * @param system Hệ thống rút tiền ('normal' hoặc 'kol')
 * @returns Promise<boolean> Kết quả gửi thông báo
 */
export async function sendWithdrawalNotification(
  withdrawalData: WithdrawalRequestPayload,
  system: 'normal' | 'kol'
): Promise<boolean> {
  try {
    // Tạo payload với thông tin rút tiền và phân biệt loại hệ thống
    const notificationPayload = {
      ...withdrawalData,
      withdrawal_time: new Date().toISOString(),
      system_type: system, // 'normal' hoặc 'kol'
      event_type: 'withdrawal_success',
    };

    // Log thông tin gửi webhook
    console.log(`Sending ${system.toUpperCase()} withdrawal notification to webhook:`, {
      url: WITHDRAWAL_WEBHOOK_URL,
      affiliate_id: withdrawalData.user_id,
      amount: withdrawalData.amount_requested,
      amount_after_tax: withdrawalData.amount_after_tax
    });

    // Gửi dữ liệu đến webhook
    const response = await axios.post(WITHDRAWAL_WEBHOOK_URL, notificationPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'ColorMedia-Affiliate-System',
        'X-Withdrawal-System': system
      }
    });

    // Kiểm tra kết quả
    if (response.status >= 200 && response.status < 300) {
      console.log(`${system.toUpperCase()} withdrawal notification sent successfully:`, response.status);
      return true;
    } else {
      console.error(`Failed to send ${system.toUpperCase()} withdrawal notification:`, response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error(`Error sending ${system.toUpperCase()} withdrawal notification:`, error);
    return false;
  }
}