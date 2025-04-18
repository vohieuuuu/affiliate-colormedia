import { Request, Response, NextFunction } from "express";
import { rateLimit } from 'express-rate-limit';
import NodeCache from 'node-cache';
import crypto from 'crypto';

// Thiết lập Rate Limiting để chống brute force
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Giới hạn mỗi IP 100 request trong 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Quá nhiều yêu cầu, vui lòng thử lại sau."
    }
  }
});

// Rate limiting nghiêm ngặt hơn cho các endpoint nhạy cảm
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ 
  max: 10, // Giới hạn mỗi IP 10 request trong 1 giờ
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    error: {
      code: "TOO_MANY_AUTH_ATTEMPTS",
      message: "Quá nhiều lần cố gắng xác thực, vui lòng thử lại sau 1 giờ."
    }
  }
});

export const withdrawalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5, // Giới hạn mỗi IP 5 yêu cầu rút tiền trong 1 giờ
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    error: {
      code: "TOO_MANY_WITHDRAWAL_ATTEMPTS",
      message: "Quá nhiều lần yêu cầu rút tiền, vui lòng thử lại sau 1 giờ."
    }
  }
});

// Cache thông minh cho dữ liệu thường xuyên truy cập
export class SmartCache {
  private cache: NodeCache;
  private versions: Map<string, number>;
  
  constructor(ttl = 300) { // mặc định 5 phút
    this.cache = new NodeCache({ stdTTL: ttl });
    this.versions = new Map();
  }
  
  async get<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const versionKey = `${key}:version`;
    const currentVersion = this.versions.get(versionKey) || 0;
    const cacheKey = `${key}:${currentVersion}`;
    
    // Kiểm tra cache
    const cachedData = this.cache.get<T>(cacheKey);
    if (cachedData !== undefined) return cachedData;
    
    // Fetch dữ liệu mới
    const data = await fetchFn();
    this.cache.set(cacheKey, data);
    return data;
  }
  
  invalidate(key: string): void {
    const versionKey = `${key}:version`;
    const currentVersion = this.versions.get(versionKey) || 0;
    this.versions.set(versionKey, currentVersion + 1);
  }
}

// Cache cho dữ liệu thống kê
export const statsCache = new SmartCache(10); // 10 giây, giảm thời gian cache xuống để dữ liệu luôn mới nhất

// Đảm bảo statsCache có thể truy cập toàn cục để có thể invalidate từ các module khác
declare global {
  var statsCache: SmartCache;
}
global.statsCache = statsCache;

// Middleware phát hiện hành vi đáng ngờ khi rút tiền
export function detectSuspiciousWithdrawal(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount_requested } = req.body;
    if (!req.affiliate) {
      return next();
    }

    const { remaining_balance } = req.affiliate;
    
    // Tính toán các yếu tố rủi ro
    // 1. Số tiền bất thường: > 10 triệu VND
    const isUnusualAmount = amount_requested > 10000000;
    
    // 2. Tỷ lệ rút tiền cao: > 90% số dư hiện tại
    const withdrawalRatio = amount_requested / remaining_balance;
    const isHighRatio = withdrawalRatio > 0.9;
    
    // 3. Yêu cầu xác thực nghiêm ngặt nếu có bất kỳ yếu tố rủi ro nào
    const requireStrictVerification = isUnusualAmount || isHighRatio;
    
    // Lưu các yếu tố rủi ro vào request để xử lý ở middleware tiếp theo
    req.withdrawalRiskFactors = {
      isUnusualAmount,
      isHighRatio,
      requireStrictVerification
    };
    
    console.log(`Phát hiện giao dịch rút tiền có rủi ro: ${JSON.stringify(req.withdrawalRiskFactors)}`);
    
    // Cho phép request tiếp tục, nhưng đã đánh dấu là rủi ro
    next();
  } catch (error) {
    console.error('Lỗi khi kiểm tra giao dịch đáng ngờ:', error);
    next();
  }
}

// Mã hóa dữ liệu nhạy cảm
export function encryptSensitiveData(data: string): string {
  try {
    // Sử dụng một secret key từ biến môi trường (cần được thiết lập)
    const secretKey = process.env.ENCRYPTION_KEY || 'default_encryption_key_for_development';
    
    // Tạo initialization vector (IV) ngẫu nhiên
    const iv = crypto.randomBytes(16);
    
    // Tạo cipher với thuật toán AES-256-CBC
    const cipher = crypto.createCipheriv(
      'aes-256-cbc', 
      crypto.createHash('sha256').update(secretKey).digest('base64').substring(0, 32), 
      iv
    );
    
    // Mã hóa dữ liệu
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Trả về dữ liệu đã mã hóa kèm IV (để có thể giải mã sau này)
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Lỗi khi mã hóa dữ liệu:', error);
    return data; // Trả về dữ liệu gốc nếu có lỗi
  }
}

// Giải mã dữ liệu nhạy cảm
export function decryptSensitiveData(encryptedData: string): string {
  try {
    // Nếu dữ liệu không có định dạng đúng, trả về nguyên trạng
    if (!encryptedData.includes(':')) {
      return encryptedData;
    }
    
    const secretKey = process.env.ENCRYPTION_KEY || 'default_encryption_key_for_development';
    
    // Tách IV và dữ liệu đã mã hóa
    const [ivHex, encryptedHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    // Tạo decipher
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      crypto.createHash('sha256').update(secretKey).digest('base64').substring(0, 32),
      iv
    );
    
    // Giải mã dữ liệu
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Lỗi khi giải mã dữ liệu:', error);
    return encryptedData; // Trả về dữ liệu mã hóa nếu có lỗi
  }
}

// Hàm để ẩn thông tin nhạy cảm khi gửi dữ liệu đến client
export function sanitizeAffiliateData(affiliate: any) {
  if (!affiliate) return affiliate;
  
  // Clone đối tượng để không thay đổi dữ liệu gốc
  const sanitized = { ...affiliate };
  
  // Ẩn một phần số tài khoản ngân hàng
  if (sanitized.bank_account) {
    // Giữ lại 4 số đầu và 4 số cuối, thay phần giữa bằng dấu *
    sanitized.bank_account = sanitized.bank_account.replace(/^(.{4})(.*)(.{4})$/, '$1****$3');
  }
  
  // Ẩn một phần số điện thoại
  if (sanitized.phone) {
    sanitized.phone = sanitized.phone.replace(/^(.{3})(.*)(.{3})$/, '$1*****$3');
  }
  
  // Loại bỏ các trường nhạy cảm khác
  delete sanitized.token;
  
  return sanitized;
}

// Middleware để đo thời gian thực thi API và ghi log các request chậm
export function measureApiPerformance(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  // Theo dõi khi request hoàn tất
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log các request chậm (> 1 giây)
    if (duration > 1000) {
      console.warn(`[SLOW API] ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
}