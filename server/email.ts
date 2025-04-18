/**
 * Mô-đun gửi email sử dụng Nodemailer
 */

import nodemailer from "nodemailer";

// Lấy thông tin xác thực email từ biến môi trường
const EMAIL = process.env.SMTP_USER || "contact@colormedia.vn";
const PASSWORD = process.env.SMTP_PASS || "email_password_here";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.larksuite.com";
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465;

// Cấu hình dịch vụ email
const FROM_EMAIL = "ColorMedia Affilate <contact@colormedia.vn>";
const SUPPORT_EMAIL = "contact@colormedia.vn";
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
    rejectUnauthorized: false, // Chấp nhận self-signed certificates trong môi trường dev
  },
});

// Kiểm tra môi trường và thiết lập cấu hình
const isDevelopment = process.env.NODE_ENV !== "production";
// Luôn gửi email thật theo yêu cầu người dùng
const sendRealEmails = true;

/**
 * Gửi email kích hoạt tài khoản cho affiliate mới
 */
export async function sendAccountActivationEmail(
  name: string,
  email: string,
  temporaryPassword: string,
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

  // Không hiển thị log nữa theo yêu cầu người dùng
  if (!sendRealEmails) {
    return true;
  }

  // Gửi email trong môi trường production hoặc khi cấu hình gửi email thật
  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending activation email:", error);
    return false;
  }
}

/**
 * Gửi email chứa mã OTP cho việc xác thực rút tiền
 */
export async function sendOtpVerificationEmail(
  name: string,
  email: string,
  otpCode: string,
  expiryMinutes: number = 5,
  verificationType: string = "rút tiền",
): Promise<boolean> {
  // Không ghi đè email trong môi trường phát triển nữa
  // để đảm bảo email được gửi đến địa chỉ chính xác
  // Chuẩn bị nội dung email
  const subject = `Mã xác thực OTP cho giao dịch ${verificationType} - ColorMedia Affiliate`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #07ADB8;">ColorMedia Affiliate</h1>
      </div>
      
      <p>Chào <strong>${name}</strong>,</p>
      
      <p>Hệ thống đã nhận được yêu cầu <strong>${verificationType}</strong> từ tài khoản của bạn. Để xác thực yêu cầu này, vui lòng sử dụng mã OTP dưới đây:</p>
      
      <div style="background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin: 20px 0; text-align: center;">
        <h2 style="color: #07ADB8; letter-spacing: 5px; font-size: 32px; margin: 0; font-weight: bold;">${otpCode}</h2>
      </div>
      
      <p>⏱️ Mã OTP này sẽ hết hạn sau <strong>${expiryMinutes} phút</strong> kể từ khi email này được gửi.</p>
      <p>⚠️ Lưu ý: Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ ngay với đội hỗ trợ của chúng tôi.</p>
      
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

Hệ thống đã nhận được yêu cầu ${verificationType} từ tài khoản của bạn. Để xác thực yêu cầu này, vui lòng sử dụng mã OTP dưới đây:

${otpCode}

⏱️ Mã OTP này sẽ hết hạn sau ${expiryMinutes} phút kể từ khi email này được gửi.
⚠️ Lưu ý: Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ ngay với đội hỗ trợ của chúng tôi.

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

  // Không hiển thị log nữa theo yêu cầu người dùng
  if (!sendRealEmails) {
    return true;
  }

  // Gửi email trong môi trường production hoặc khi cấu hình gửi email thật
  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending OTP verification email:", error);
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
  },
  taxInfo?: {
    taxAmount?: number;
    amountAfterTax?: number;
    hasTax?: boolean;
    taxRate?: number;
    taxId?: string;
  }
): Promise<boolean> {
  // Không ghi đè email trong môi trường phát triển nữa
  // để đảm bảo email được gửi đến địa chỉ chính xác
  // Chuẩn bị nội dung email
  const subject = "Yêu cầu rút tiền đã được tạo - ColorMedia Affiliate";
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
  
  // Xử lý thông tin thuế nếu có
  let taxSection = '';
  let taxTextSection = '';
  
  if (taxInfo && taxInfo.hasTax) {
    const formattedTaxAmount = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(taxInfo.taxAmount || 0);
    
    const formattedNetAmount = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(taxInfo.amountAfterTax || amount);
    
    const taxRateFormatted = `${(taxInfo.taxRate || 0.1) * 100}%`;
    
    // Thêm hiển thị MST nếu có
    const taxIdSection = taxInfo.taxId ? 
      `<p>🆔 MST cá nhân: <strong>${taxInfo.taxId}</strong></p>` : '';
    
    const taxIdTextSection = taxInfo.taxId ? 
      `🆔 MST cá nhân: ${taxInfo.taxId}` : '';
    
    taxSection = `
      <div style="background-color: #fff8e1; border-left: 4px solid #ffc919; padding: 15px; margin: 15px 0;">
        <p><strong>Thông tin thuế thu nhập cá nhân:</strong></p>
        <p>💰 Số tiền yêu cầu: <strong>${formattedAmount}</strong></p>
        <p>🔢 Thuế TNCN (${taxRateFormatted}): <strong>${formattedTaxAmount}</strong></p>
        <p>💸 Số tiền thực nhận: <strong>${formattedNetAmount}</strong></p>
        ${taxIdSection}
        <p style="font-size: 0.9em; color: #555;">Theo quy định của pháp luật, khoản rút tiền trên 2 triệu VND sẽ bị khấu trừ 10% thuế TNCN.</p>
      </div>
    `;
    
    taxTextSection = `
Thông tin thuế thu nhập cá nhân:
💰 Số tiền yêu cầu: ${formattedAmount}
🔢 Thuế TNCN (${taxRateFormatted}): ${formattedTaxAmount}
💸 Số tiền thực nhận: ${formattedNetAmount}
${taxIdTextSection}
Theo quy định của pháp luật, khoản rút tiền trên 2 triệu VND sẽ bị khấu trừ 10% thuế TNCN.
    `;
  }

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
        <p>⏱️ Thời gian yêu cầu: <strong>${new Date().toLocaleString("vi-VN")}</strong></p>
      </div>
      
      ${taxSection}
      
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
⏱️ Thời gian yêu cầu: ${new Date().toLocaleString("vi-VN")}
${taxTextSection}

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

  // Không hiển thị log nữa theo yêu cầu người dùng
  if (!sendRealEmails) {
    return true;
  }

  // Gửi email trong môi trường production hoặc khi cấu hình gửi email thật
  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending withdrawal request email:", error);
    return false;
  }
}
