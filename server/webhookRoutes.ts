import { Request, Response, Router } from 'express';
import { db } from './db';
import { storage } from './storage';
import crypto from 'crypto';
import { CustomerStatusType, Transaction, TransactionType } from '@shared/schema';

const router = Router();

/**
 * Xác thực webhook dựa trên signature
 * @param signature Chữ ký từ header request
 * @param body Nội dung request
 * @returns boolean
 */
function verifyWebhookSignature(signature: string, body: string): boolean {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error("WEBHOOK_SECRET không được cấu hình");
    return false;
  }

  const hmac = crypto.createHmac('sha256', webhookSecret);
  const expectedSignature = hmac.update(body).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Middleware xác thực webhook
 */
function webhookAuth(req: Request, res: Response, next: Function) {
  const signature = req.headers['x-webhook-signature'] as string;
  
  if (!signature) {
    return res.status(401).json({ 
      status: 'error', 
      error: { 
        code: 'UNAUTHORIZED',
        message: 'Không có chữ ký webhook' 
      } 
    });
  }

  const rawBody = JSON.stringify(req.body);
  if (!verifyWebhookSignature(signature, rawBody)) {
    return res.status(401).json({ 
      status: 'error', 
      error: { 
        code: 'UNAUTHORIZED',
        message: 'Chữ ký webhook không hợp lệ' 
      } 
    });
  }

  next();
}

/**
 * Webhook nhận yêu cầu thanh toán từ Normal Affiliate
 * POST /api/webhooks/normal-payment
 */
router.post('/normal-payment', webhookAuth, async (req: Request, res: Response) => {
  try {
    const { 
      affiliate_id, 
      amount, 
      contract_id, 
      customer_id, 
      description,
      transaction_id 
    } = req.body;

    if (!affiliate_id || !amount || !contract_id || !customer_id) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'INVALID_REQUEST',
          message: 'Thiếu thông tin bắt buộc'
        }
      });
    }

    // Kiểm tra affiliate tồn tại
    const affiliate = await storage.getAffiliateByAffiliateId(affiliate_id);
    if (!affiliate) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'AFFILIATE_NOT_FOUND',
          message: 'Không tìm thấy affiliate'
        }
      });
    }

    // Lấy thông tin affiliate đầy đủ để kiểm tra khách hàng
    if (!affiliate.referred_customers) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'REFERRED_CUSTOMERS_NOT_FOUND',
          message: 'Không tìm thấy danh sách khách hàng được giới thiệu'
        }
      });
    }
    
    // Kiểm tra khách hàng tồn tại
    const customer = affiliate.referred_customers.find((c: any) => c.id === customer_id);
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Không tìm thấy khách hàng được giới thiệu'
        }
      });
    }

    // Cập nhật số dư của affiliate
    await storage.updateAffiliateBalance(affiliate_id, amount);

    // Ghi log giao dịch
    console.log(`Thanh toán commission cho Normal Affiliate ${affiliate_id}: ${amount.toLocaleString()} VND (Contract #${contract_id})`);

    return res.status(200).json({
      status: 'success',
      data: {
        message: 'Thanh toán commission thành công',
        transaction_id: transaction_id || crypto.randomUUID()
      }
    });
  } catch (error) {
    console.error('Lỗi xử lý webhook normal payment:', error);
    return res.status(500).json({
      status: 'error',
      error: {
        code: 'SERVER_ERROR',
        message: 'Lỗi xử lý thanh toán'
      }
    });
  }
});

/**
 * Webhook nhận yêu cầu thanh toán từ Partner Affiliate
 * POST /api/webhooks/partner-payment
 */
router.post('/partner-payment', webhookAuth, async (req: Request, res: Response) => {
  try {
    const { 
      affiliate_id, 
      amount, 
      contract_id, 
      contract_value,
      customer_id, 
      description,
      transaction_id 
    } = req.body;

    if (!affiliate_id || !amount || !contract_id || !customer_id || !contract_value) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'INVALID_REQUEST',
          message: 'Thiếu thông tin bắt buộc'
        }
      });
    }

    // Kiểm tra affiliate tồn tại
    const affiliate = await storage.getAffiliateByAffiliateId(affiliate_id);
    if (!affiliate) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'AFFILIATE_NOT_FOUND',
          message: 'Không tìm thấy affiliate'
        }
      });
    }

    // Lấy thông tin affiliate đầy đủ để kiểm tra khách hàng
    if (!affiliate.referred_customers) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'REFERRED_CUSTOMERS_NOT_FOUND',
          message: 'Không tìm thấy danh sách khách hàng được giới thiệu'
        }
      });
    }
    
    // Kiểm tra khách hàng tồn tại
    const customer = affiliate.referred_customers.find((c: any) => c.id === customer_id);
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: 'Không tìm thấy khách hàng được giới thiệu'
        }
      });
    }

    // Cập nhật thông tin hợp đồng cho khách hàng
    await storage.updateCustomerWithContract(
      customer_id,
      {
        ...customer,
        status: 'CONVERTED' as CustomerStatusType
      },
      {
        contract_value,
        received_balance: amount,
        remaining_balance: 0
      }
    );

    // Cập nhật số dư của affiliate
    await storage.updateAffiliateBalance(affiliate_id, amount);

    // Ghi log giao dịch
    console.log(`Thanh toán commission cho Partner Affiliate ${affiliate_id}: ${amount.toLocaleString()} VND (Contract #${contract_id}, Value: ${contract_value.toLocaleString()} VND)`);

    return res.status(200).json({
      status: 'success',
      data: {
        message: 'Thanh toán commission cho Partner thành công',
        transaction_id: transaction_id || crypto.randomUUID()
      }
    });
  } catch (error) {
    console.error('Lỗi xử lý webhook partner payment:', error);
    return res.status(500).json({
      status: 'error',
      error: {
        code: 'SERVER_ERROR',
        message: 'Lỗi xử lý thanh toán'
      }
    });
  }
});

export default router;