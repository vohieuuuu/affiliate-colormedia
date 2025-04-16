/**
 * Mô-đun gửi email sử dụng SendGrid
 */

import { MailService } from '@sendgrid/mail';

const mailService = new MailService();

// Thông tin xác thực SendGrid
const EMAIL = "contact@colormedia.vn";
const PASSWORD = "VUeOCEvFDKWGTZ7f";

// Cấu hình dịch vụ email
const FROM_EMAIL = "ColorMedia Affilate <contact@colormedia.vn>";
const SUPPORT_EMAIL = "support@colormedia.vn";
const SUPPORT_PHONE = "0888 123 456";
const LOGIN_URL = "https://affiliate.colormedia.vn";

// Khởi tạo dịch vụ SendGrid nếu có API key
try {
  if (process.env.SENDGRID_API_KEY) {
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('SendGrid configured with API key');
  } else {
    console.log('No SendGrid API key provided, email will be logged to console');
  }
} catch (error) {
  console.error('Error configuring SendGrid:', error);
}

/**
 * Gửi email kích hoạt tài khoản cho affiliate mới
 */
export async function sendAccountActivationEmail(
  name: string,
  email: string,
  temporaryPassword: string
): Promise<boolean> {
  // Chuẩn bị nội dung email
  const subject = "Kích hoạt tài khoản ColorMedia Affiliate của bạn";
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #07ADB8;">ColorMedia Affiliate</h1>
      </div>
      
      <p>Chào <strong>${name}</strong>,</p>
      
      <p>Chào mừng bạn đến với hệ thống ColorMedia Affiliate – nơi bạn có thể theo dõi hoa hồng, khách hàng giới thiệu và tiến độ hợp đồng một cách minh bạch, chi tiết.</p>
      
      <div style="background-color: #f9f9f9; border-left: 4px solid #07ADB8; padding: 15px; margin: 20px 0;">
        <p><strong>Dưới đây là thông tin đăng nhập của bạn:</strong></p>
        <p>🔑 Tài khoản (Email/SĐT): <strong>${email}</strong></p>
        <p>🔒 Mật khẩu tạm thời: <strong>${temporaryPassword}</strong></p>
        <p>🌐 Đăng nhập tại: <a href="${LOGIN_URL}" style="color: #07ADB8; text-decoration: none;">${LOGIN_URL}</a></p>
      </div>
      
      <p style="color: #e74c3c; font-weight: bold;">⚠️ Lưu ý quan trọng:</p>
      <p>Đây là mật khẩu tạm thời. Vì lý do bảo mật, bạn sẽ được yêu cầu đổi mật khẩu ngay sau khi đăng nhập lần đầu.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p>Nếu bạn gặp bất kỳ khó khăn nào khi đăng nhập, hãy liên hệ với đội hỗ trợ của chúng tôi qua:</p>
        <p>📧 Email: <a href="mailto:${SUPPORT_EMAIL}" style="color: #07ADB8; text-decoration: none;">${SUPPORT_EMAIL}</a></p>
        <p>📞 Hotline: ${SUPPORT_PHONE}</p>
      </div>
      
      <div style="margin-top: 30px; color: #777;">
        <p>Trân trọng,<br>Đội ngũ ColorMedia Affiliate</p>
      </div>
    </div>
  `;

  // Chuẩn bị email trong định dạng plain text (không có HTML)
  const textContent = `
Chào ${name},

Chào mừng bạn đến với hệ thống ColorMedia Affiliate – nơi bạn có thể theo dõi hoa hồng, khách hàng giới thiệu và tiến độ hợp đồng một cách minh bạch, chi tiết.

Dưới đây là thông tin đăng nhập của bạn:

🔑 Tài khoản (Email/SĐT): ${email}
🔒 Mật khẩu tạm thời: ${temporaryPassword}
🌐 Đăng nhập tại: ${LOGIN_URL}

⚠️ Lưu ý quan trọng:
Đây là mật khẩu tạm thời. Vì lý do bảo mật, bạn sẽ được yêu cầu đổi mật khẩu ngay sau khi đăng nhập lần đầu.

Nếu bạn gặp bất kỳ khó khăn nào khi đăng nhập, hãy liên hệ với đội hỗ trợ của chúng tôi qua:
📧 Email: ${SUPPORT_EMAIL}
📞 Hotline: ${SUPPORT_PHONE}

Trân trọng,
Đội ngũ ColorMedia Affiliate
  `;

  // Nếu không có API key, chỉ log email ra console
  if (!process.env.SENDGRID_API_KEY) {
    console.log('=========== ACCOUNT ACTIVATION EMAIL ===========');
    console.log(`TO: ${email}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT: ${textContent}`);
    console.log('=================================================');
    return true;
  }

  // Cấu hình email
  const emailConfig = {
    to: email,
    from: FROM_EMAIL,
    subject: subject,
    text: textContent,
    html: htmlContent,
  };

  try {
    // Gửi email
    await mailService.send(emailConfig);
    console.log(`Account activation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending activation email:', error);
    return false;
  }
}

/**
 * Mã hóa và giải mã email/mật khẩu để sử dụng với hệ thống email
 * (Trong triển khai thực tế, nên sử dụng giải pháp bảo mật mạnh hơn)
 */
export function getEmailCredentials() {
  return {
    email: EMAIL,
    password: PASSWORD
  };
}