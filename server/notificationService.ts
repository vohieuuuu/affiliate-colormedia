/**
 * Dịch vụ gửi thông báo webhook
 * Được sử dụng để gửi thông báo khi người dùng hoàn tất rút tiền sau khi xác thực OTP
 * Hoặc khi KOL thêm mới contact
 */

import axios from 'axios';
import { WithdrawalRequestPayload, KolContact } from '@shared/schema';

// URL webhook cho thông báo rút tiền thành công
const WITHDRAWAL_WEBHOOK_URL = 'https://auto.autogptvn.com/webhook/yeu-cau-thanh-toan-affilate';

// URL webhook cho thông báo thêm contact mới
const KOL_NEW_CONTACT_WEBHOOK_URL = 'https://aicolormedia.app.n8n.cloud/webhook-test/2d2c9a88-ebaf-4f2c-bf03-8f4c4a398e86';

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

/**
 * Gửi thông báo khi KOL thêm mới contact
 * @param contactData Dữ liệu contact mới
 * @param kolInfo Thông tin của KOL đã thêm contact
 * @returns Promise<boolean> Kết quả gửi thông báo
 */
export async function sendNewContactNotification(
  contactData: KolContact,
  kolInfo: {
    kol_id: string;
    full_name: string;
    email: string;
    level: string;
  }
): Promise<boolean> {
  try {
    // Tạo payload với thông tin contact mới và KOL
    const notificationPayload = {
      contact: {
        ...contactData,
      },
      kol: {
        ...kolInfo
      },
      event_type: 'new_contact',
      created_at: new Date().toISOString()
    };

    // Log thông tin gửi webhook
    console.log(`Sending new KOL contact notification to webhook:`, {
      url: KOL_NEW_CONTACT_WEBHOOK_URL,
      kol_id: kolInfo.kol_id,
      contact_name: contactData.contact_name,
      contact_company: contactData.company || 'N/A',
      contact_phone: contactData.phone
    });

    // Gửi dữ liệu đến webhook
    const response = await axios.post(KOL_NEW_CONTACT_WEBHOOK_URL, notificationPayload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Source': 'ColorMedia-Affiliate-System',
        'X-Event-Type': 'new_contact'
      }
    });

    // Kiểm tra kết quả
    if (response.status >= 200 && response.status < 300) {
      console.log(`New KOL contact notification sent successfully:`, response.status);
      return true;
    } else {
      console.error(`Failed to send new KOL contact notification:`, response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error(`Error sending new KOL contact notification:`, error);
    return false;
  }
}