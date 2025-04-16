/**
 * Mô-đun gửi email sử dụng Nodemailer
 */

import nodemailer from 'nodemailer';

// Lấy thông tin xác thực email từ biến môi trường
const EMAIL = process.env.SMTP_USER || "contact@colormedia.vn";
const PASSWORD = process.env.SMTP_PASS || "email_password_here";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.larksuite.com";
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465;

// Cấu hình dịch vụ email
const FROM_EMAIL = "ColorMedia Affilate <contact@colormedia.vn>";
const SUPPORT_EMAIL = "support@colormedia.vn";
const SUPPORT_PHONE = "0888 123 456";
const LOGIN_URL = "https://affiliate.colormedia.vn";

// Cấu hình nodemailer transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: EMAIL,
    pass: PASSWORD,
  },
  tls: {
    rejectUnauthorized: false // Chấp nhận self-signed certificates trong môi trường dev
  }
});

// Kiểm tra môi trường và thiết lập cấu hình
const isDevelopment = process.env.NODE_ENV !== 'production';
// SEND_REAL_EMAILS=true sẽ cho phép gửi email thật kể cả trong môi trường dev
const sendRealEmails = process.env.SEND_REAL_EMAILS === 'true' || !isDevelopment;

// Thông báo cấu hình email
if (isDevelopment && !sendRealEmails) {
  console.log('Running in development mode, emails will be logged to console');
} else if (isDevelopment && sendRealEmails) {
  console.log('Running in development mode BUT emails WILL BE SENT to real recipients');
  console.log(`Email config: ${SMTP_HOST}:${SMTP_PORT} (User: ${EMAIL})`);
} else {
  console.log('Email service initialized for production');
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

  // Cấu hình email
  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: subject,
    text: textContent,
    html: htmlContent,
  };

  // Luôn log email trong môi trường development
  if (isDevelopment) {
    console.log('=========== ACCOUNT ACTIVATION EMAIL ===========');
    console.log(`TO: ${email}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT: ${textContent}`);
    console.log('=================================================');
    
    // Nếu không gửi email thật thì trả về thành công
    if (!sendRealEmails) {
      return true;
    }
  }

  // Gửi email trong môi trường production hoặc khi cấu hình gửi email thật
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Account activation email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending activation email:', error);
    return false;
  }
}

/**
 * Gửi email thông báo khi yêu cầu rút tiền được tạo
 */
export async function sendWithdrawalRequestEmail(
  name: string,
  email: string,
  amount: number,
  bankInfo: {
    bankName: string;
    accountNumber: string;
  }
): Promise<boolean> {
  // Chuẩn bị nội dung email
  const subject = "Yêu cầu rút tiền đã được tạo - ColorMedia Affiliate";
  const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #07ADB8;">ColorMedia Affiliate</h1>
      </div>
      
      <p>Chào <strong>${name}</strong>,</p>
      
      <p>Yêu cầu rút tiền của bạn đã được ghi nhận và đang được xử lý.</p>
      
      <div style="background-color: #f9f9f9; border-left: 4px solid #07ADB8; padding: 15px; margin: 20px 0;">
        <p><strong>Chi tiết yêu cầu rút tiền:</strong></p>
        <p>💰 Số tiền: <strong>${formattedAmount}</strong></p>
        <p>🏦 Ngân hàng: <strong>${bankInfo.bankName}</strong></p>
        <p>🔢 Số tài khoản: <strong>${bankInfo.accountNumber}</strong></p>
        <p>⏱️ Thời gian yêu cầu: <strong>${new Date().toLocaleString('vi-VN')}</strong></p>
      </div>
      
      <p>Đội ngũ của chúng tôi sẽ xử lý yêu cầu của bạn trong vòng 1-3 ngày làm việc. Bạn sẽ nhận được email xác nhận khi yêu cầu rút tiền đã được xử lý.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p>Nếu bạn có bất kỳ câu hỏi nào, hãy liên hệ với đội hỗ trợ của chúng tôi qua:</p>
        <p>📧 Email: <a href="mailto:${SUPPORT_EMAIL}" style="color: #07ADB8; text-decoration: none;">${SUPPORT_EMAIL}</a></p>
        <p>📞 Hotline: ${SUPPORT_PHONE}</p>
      </div>
      
      <div style="margin-top: 30px; color: #777;">
        <p>Trân trọng,<br>Đội ngũ ColorMedia Affiliate</p>
      </div>
    </div>
  `;

  const textContent = `
Chào ${name},

Yêu cầu rút tiền của bạn đã được ghi nhận và đang được xử lý.

Chi tiết yêu cầu rút tiền:
💰 Số tiền: ${formattedAmount}
🏦 Ngân hàng: ${bankInfo.bankName}
🔢 Số tài khoản: ${bankInfo.accountNumber}
⏱️ Thời gian yêu cầu: ${new Date().toLocaleString('vi-VN')}

Đội ngũ của chúng tôi sẽ xử lý yêu cầu của bạn trong vòng 1-3 ngày làm việc. Bạn sẽ nhận được email xác nhận khi yêu cầu rút tiền đã được xử lý.

Nếu bạn có bất kỳ câu hỏi nào, hãy liên hệ với đội hỗ trợ của chúng tôi qua:
📧 Email: ${SUPPORT_EMAIL}
📞 Hotline: ${SUPPORT_PHONE}

Trân trọng,
Đội ngũ ColorMedia Affiliate
  `;

  // Cấu hình email
  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: subject,
    text: textContent,
    html: htmlContent,
  };

  // Luôn log email trong môi trường development
  if (isDevelopment) {
    console.log('=========== WITHDRAWAL REQUEST EMAIL ===========');
    console.log(`TO: ${email}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT: ${textContent}`);
    console.log('===============================================');
    
    // Nếu không gửi email thật thì trả về thành công
    if (!sendRealEmails) {
      return true;
    }
  }

  // Gửi email trong môi trường production hoặc khi cấu hình gửi email thật
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Withdrawal request email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending withdrawal request email:', error);
    return false;
  }
}